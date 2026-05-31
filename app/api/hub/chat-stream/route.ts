import { NextRequest } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'
import { getAgente } from '@/lib/hub-agentes'

const MODELO_PADRAO = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'
const MAX_HISTORY = 5
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

type ChatMsg = { role: 'user' | 'assistant'; content: string }

// In-memory response cache — persists within same server instance
const responseCache = new Map<string, { response: string; expiry: number }>()

function getCacheKey(empresaId: string, agentId: string, lastMsg: string): string {
  return `${empresaId}:${agentId}:${lastMsg.toLowerCase().trim().slice(0, 300)}`
}

function getCached(key: string): string | null {
  const entry = responseCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) { responseCache.delete(key); return null }
  return entry.response
}

function setCache(key: string, response: string) {
  if (responseCache.size > 200) {
    const first = responseCache.keys().next().value
    if (first) responseCache.delete(first)
  }
  responseCache.set(key, { response, expiry: Date.now() + CACHE_TTL })
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return new Response('OPENROUTER_API_KEY não configurada', { status: 500 })
  }

  const { user, supabase } = await getSupabaseUser(req)
  if (!user) return new Response('Não autorizado', { status: 401 })

  const { data: usrRow } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
  const empresaId = usrRow?.empresa_id ?? user.id

  const { agentId, messages } = (await req.json()) as { agentId?: string; messages?: ChatMsg[] }
  const agente = agentId ? getAgente(agentId) : undefined
  if (!agente) return new Response('Agente inválido', { status: 400 })

  // Last 5 messages only — cost reduction
  const clean = (messages ?? [])
    .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content?.trim())
    .slice(-MAX_HISTORY)

  if (!clean.length) return new Response('Mensagem obrigatória', { status: 400 })

  // Check cache — only cache single-question exchanges (last msg is user)
  const lastUserMsg = clean.findLast(m => m.role === 'user')?.content ?? ''
  const cacheKey = getCacheKey(empresaId, agente.id, lastUserMsg)
  const cached = getCached(cacheKey)

  if (cached) {
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: cached })}\n\n`))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Cache': 'HIT' },
    })
  }

  // Load cerebro context — compressed
  const { data: cerebro } = await supabase.from('hub_cerebro').select('*').eq('empresa_id', empresaId).maybeSingle()
  let systemPrompt = agente.system

  if (cerebro) {
    const ctx: string[] = ['=== CONTEXTO DA EMPRESA ===']
    if (cerebro.nome_empresa) ctx.push(`Empresa: ${cerebro.nome_empresa}`)
    if (cerebro.slogan) ctx.push(`Slogan: ${cerebro.slogan}`)
    if (cerebro.missao) ctx.push(`Missão: ${String(cerebro.missao).slice(0, 400)}`)
    if (cerebro.produto_principal) ctx.push(`Produto: ${String(cerebro.produto_principal).slice(0, 200)}`)
    if (cerebro.publico_alvo) ctx.push(`ICP: ${String(cerebro.publico_alvo).slice(0, 200)}`)
    if (cerebro.metas) ctx.push(`Metas: ${String(cerebro.metas).slice(0, 200)}`)
    if (cerebro.dna_fundador) ctx.push(`DNA: ${String(cerebro.dna_fundador).slice(0, 300)}`)
    // Knowledge vault and playbooks truncated for cost reduction
    if (cerebro.knowledge_vault) ctx.push(`Conhecimento: ${String(cerebro.knowledge_vault).slice(0, 800)}`)
    if (cerebro.playbooks) ctx.push(`Playbooks: ${String(cerebro.playbooks).slice(0, 600)}`)
    ctx.push('=== FIM ===')
    systemPrompt = `${ctx.join('\n')}\n\n${agente.system}`
  }

  const modelo = agente.modelo || MODELO_PADRAO

  const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'FactorHub',
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 1500,
      stream: true,
      messages: [{ role: 'system', content: systemPrompt }, ...clean],
    }),
  })

  if (!orRes.ok || !orRes.body) {
    return new Response('Falha ao conectar com o modelo', { status: 502 })
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      const reader = orRes.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''

      const logUsage = async (tokens: { p: number; c: number; cost: number }) => {
        await supabase.from('hub_uso_agentes').insert({
          empresa_id: empresaId,
          agente_id: agente.id,
          modelo,
          prompt_tokens: tokens.p,
          completion_tokens: tokens.c,
          total_tokens: tokens.p + tokens.c,
          custo_usd: tokens.cost,
        })
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (raw === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              // Cache full response
              if (full.length > 20) setCache(cacheKey, full)
              continue
            }
            try {
              const parsed = JSON.parse(raw) as {
                choices?: { delta?: { content?: string } }[]
                usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number }
              }
              const token = parsed.choices?.[0]?.delta?.content ?? ''
              if (token) {
                full += token
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
              }
              if (parsed.usage) {
                void logUsage({
                  p: parsed.usage.prompt_tokens ?? 0,
                  c: parsed.usage.completion_tokens ?? 0,
                  cost: parsed.usage.cost ?? 0,
                })
              }
            } catch { /* skip */ }
          }
        }
      } finally {
        reader.releaseLock()
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
