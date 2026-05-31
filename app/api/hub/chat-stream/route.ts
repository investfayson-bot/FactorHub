import { NextRequest } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'
import { getAgente } from '@/lib/hub-agentes'

const MODELO_PADRAO = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

type ChatMsg = { role: 'user' | 'assistant'; content: string }

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

  const clean = (messages ?? [])
    .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content?.trim())
    .slice(-24)

  if (!clean.length) return new Response('Mensagem obrigatória', { status: 400 })

  // Load cerebro context
  const { data: cerebro } = await supabase.from('hub_cerebro').select('*').eq('empresa_id', empresaId).maybeSingle()
  let systemPrompt = agente.system
  if (cerebro) {
    const ctx: string[] = ['=== CONTEXTO DA EMPRESA (Cerebro) ===']
    if (cerebro.nome_empresa) ctx.push(`Empresa: ${cerebro.nome_empresa}`)
    if (cerebro.slogan) ctx.push(`Slogan: ${cerebro.slogan}`)
    if (cerebro.missao) ctx.push(`Missão: ${cerebro.missao}`)
    if (cerebro.produto_principal) ctx.push(`Produto: ${cerebro.produto_principal}`)
    if (cerebro.publico_alvo) ctx.push(`ICP: ${cerebro.publico_alvo}`)
    if (cerebro.metas) ctx.push(`Metas: ${cerebro.metas}`)
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

      // Log usage asynchronously after stream ends
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
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
