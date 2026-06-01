import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'
import { getCerebroContext } from '@/lib/cerebro'

export const runtime = 'nodejs'
export const maxDuration = 90

const CONSELHO = [
  { id: 'CEO', nome: 'CEO Estratégico', foco: 'viabilidade estratégica e risco' },
  { id: 'CFO', nome: 'CFO', foco: 'viabilidade financeira e custo' },
  { id: 'CMO', nome: 'CMO', foco: 'posicionamento, mercado e aquisição' },
  { id: 'CTO', nome: 'CTO', foco: 'viabilidade técnica e execução' },
]

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OPENROUTER_API_KEY não configurada' }, { status: 500 })

  const { user, admin } = await getSupabaseUser(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data: u } = await admin.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
  const empresaId = u?.empresa_id ?? user.id

  const { projeto } = (await req.json()) as { projeto?: string }
  if (!projeto?.trim()) return NextResponse.json({ error: 'Projeto obrigatório' }, { status: 400 })

  const { formatted: cerebro } = await getCerebroContext(empresaId, admin)
  const model = process.env.MODEL_DEFAULT || 'anthropic/claude-haiku-4-5'

  const system = `Você é o Conselho Executivo do FactorHub OS (${CONSELHO.map(c => c.nome).join(', ')}).
${cerebro ? `\n[CONTEXTO DA EMPRESA]\n${cerebro}\n` : ''}
TAREFA: Cada conselheiro avalia o projeto abaixo na sua especialidade e dá um veredito.

Responda APENAS um JSON válido (sem markdown), no formato:
{"opinioes":[{"id":"CEO","veredito":"GO|NO-GO|AJUSTAR","opiniao":"2-3 frases diretas com a análise","recomendacao":"a ação concreta que recomenda"}, ...]}
Inclua os 4: CEO, CFO, CMO, CTO. Seja específico, sem genérico. Português brasileiro, sem emojis.`

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'FactorHub Conselho' },
      body: JSON.stringify({
        model, max_tokens: 2000,
        messages: [{ role: 'system', content: system }, { role: 'user', content: `PROJETO A AVALIAR:\n${projeto.slice(0, 4000)}` }],
      }),
    })
    if (!res.ok) return NextResponse.json({ error: `Modelo: ${res.status}` }, { status: 502 })
    const data = await res.json()
    const raw: string = data?.choices?.[0]?.message?.content ?? '{}'
    const usage = data?.usage
    if (usage) {
      void admin.from('hub_uso_agentes').insert({
        empresa_id: empresaId, agente_id: 'CA', modelo: model,
        prompt_tokens: usage.prompt_tokens ?? 0, completion_tokens: usage.completion_tokens ?? 0,
        total_tokens: usage.total_tokens ?? 0, custo_usd: usage.cost ?? 0,
      })
    }
    // parse defensivo
    let parsed: { opinioes?: unknown[] } = {}
    try {
      const jsonStart = raw.indexOf('{')
      const jsonEnd = raw.lastIndexOf('}')
      parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1))
    } catch {
      return NextResponse.json({ opinioes: CONSELHO.map(c => ({ id: c.id, veredito: 'AJUSTAR', opiniao: raw.slice(0, 200), recomendacao: '' })) })
    }
    return NextResponse.json({ opinioes: parsed.opinioes ?? [] })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}
