import { NextRequest } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'
import { getAgentV2 } from '@/lib/agents-v2'
import { getCerebroContext } from '@/lib/cerebro'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { user, supabase, admin } = await getSupabaseUser(req)
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { agentId, messages } = await req.json()
  if (!agentId || !Array.isArray(messages)) return new Response('Bad request', { status: 400 })

  const agent = getAgentV2(agentId)
  if (!agent) return new Response('Agent not found', { status: 404 })

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return new Response('OPENROUTER_API_KEY não configurada', { status: 500 })

  const { data: usrRow } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
  const empresaId = usrRow?.empresa_id ?? user.id

  const { formatted: cerebroFormatted } = await getCerebroContext(empresaId, supabase)

  const systemPrompt = [
    cerebroFormatted ? `[CÉREBRO DA EMPRESA]\n${cerebroFormatted}` : '',
    `[PERFIL DO AGENTE]\nVocê é o ${agent.name} — ${agent.role}.`,
    agent.systemPrompt,
  ].filter(Boolean).join('\n\n')

  const model = agent.layer === 'C1'
    ? (process.env.MODEL_C1 || 'anthropic/claude-sonnet-4-5')
    : (process.env.MODEL_DEFAULT || 'anthropic/claude-haiku-4-5')

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://factorhub.vercel.app',
      'X-Title': 'FactorHub OS',
    },
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: agent.maxTokens,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    return new Response(`OpenRouter error: ${txt}`, { status: 500 })
  }

  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
