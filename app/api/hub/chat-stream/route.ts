import { NextRequest } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'
import { getAgentV2 } from '@/lib/agents-v2'
import { getCerebroContext } from '@/lib/cerebro'

export const runtime = 'nodejs'

const MAX_HISTORY = 5
const CACHE_TTL = 24 * 60 * 60 * 1000

type ChatMsg = { role: 'user' | 'assistant'; content: string }

// In-memory response cache — persists within same server instance
const responseCache = new Map<string, { response: string; expiry: number }>()

function cacheKey(empresaId: string, agentId: string, msg: string) {
  return `${empresaId}:${agentId}:${msg.toLowerCase().trim().slice(0, 300)}`
}

function getCached(key: string): string | null {
  const e = responseCache.get(key)
  if (!e) return null
  if (Date.now() > e.expiry) { responseCache.delete(key); return null }
  return e.response
}

function setCache(key: string, response: string) {
  if (responseCache.size > 500) {
    const first = responseCache.keys().next().value
    if (first) responseCache.delete(first)
  }
  responseCache.set(key, { response, expiry: Date.now() + CACHE_TTL })
}

function getModel(layer: string): string {
  return layer === 'C1'
    ? (process.env.MODEL_C1 ?? 'anthropic/claude-sonnet-4-5')
    : (process.env.MODEL_DEFAULT ?? 'anthropic/claude-haiku-4-5')
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return new Response('OPENROUTER_API_KEY não configurada', { status: 500 })

  const { user, supabase } = await getSupabaseUser(req)
  if (!user) return new Response('Não autorizado', { status: 401 })

  const { data: usrRow } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
  const empresaId = usrRow?.empresa_id ?? user.id

  const { agentId, messages } = (await req.json()) as { agentId?: string; messages?: ChatMsg[] }
  const agent = agentId ? getAgentV2(agentId) : undefined
  if (!agent) return new Response('Agente inválido', { status: 400 })

  // Last 5 messages only — cost reduction
  const clean = (messages ?? [])
    .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content?.trim())
    .slice(-MAX_HISTORY)
  if (!clean.length) return new Response('Mensagem obrigatória', { status: 400 })

  // Check cache — only for single-question exchanges
  const lastUserMsg = clean.findLast(m => m.role === 'user')?.content ?? ''
  const key = cacheKey(empresaId, agent.id, lastUserMsg)
  const cached = getCached(key)

  if (cached) {
    const enc = new TextEncoder()
    return new Response(
      new ReadableStream({
        start(ctrl) {
          ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ token: cached })}\n\n`))
          ctrl.enqueue(enc.encode('data: [DONE]\n\n'))
          ctrl.close()
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Cache': 'HIT' } }
    )
  }

  // Build system prompt — cérebro context + agent profile
  const { formatted: cerebroFormatted } = await getCerebroContext(empresaId, supabase)
  const systemPrompt = [
    cerebroFormatted ? `[CÉREBRO DA EMPRESA]\n${cerebroFormatted}` : '',
    `[PERFIL DO AGENTE]\nVocê é o ${agent.name} — ${agent.role}.`,
    agent.systemPrompt,
  ].filter(Boolean).join('\n\n')

  const model = getModel(agent.layer)

  const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'FactorHub OS',
      'HTTP-Referer': 'https://factor-hub.vercel.app',
    },
    body: JSON.stringify({
      model,
      max_tokens: agent.maxTokens,
      stream: true,
      messages: [{ role: 'system', content: systemPrompt }, ...clean],
    }),
  })

  if (!orRes.ok || !orRes.body) {
    const err = await orRes.text()
    return new Response(`OpenRouter error: ${err}`, { status: 502 })
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(ctrl) {
      const reader = orRes.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''
      let buf = ''

      const logUsage = async (p: number, c: number, cost: number) => {
        await supabase.from('hub_uso_agentes').insert({
          empresa_id: empresaId,
          agente_id: agent.id,
          modelo: model,
          prompt_tokens: p,
          completion_tokens: c,
          total_tokens: p + c,
          custo_usd: cost,
        })
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (raw === '[DONE]') {
              ctrl.enqueue(encoder.encode('data: [DONE]\n\n'))
              if (full.length > 20) setCache(key, full)
              continue
            }
            try {
              const p = JSON.parse(raw) as {
                choices?: { delta?: { content?: string } }[]
                usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number }
              }
              const tok = p.choices?.[0]?.delta?.content ?? ''
              if (tok) {
                full += tok
                ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ token: tok })}\n\n`))
              }
              if (p.usage) {
                void logUsage(p.usage.prompt_tokens ?? 0, p.usage.completion_tokens ?? 0, p.usage.cost ?? 0)
              }
            } catch { /* skip malformed */ }
          }
        }
      } finally {
        reader.releaseLock()
        ctrl.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
