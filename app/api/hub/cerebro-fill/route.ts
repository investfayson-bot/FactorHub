import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'

export const runtime = 'nodejs'
export const maxDuration = 60

const CEREBRO_FIELDS = [
  'nome_empresa', 'slogan', 'missao', 'visao', 'valores',
  'produto_principal', 'diferenciais', 'modelo_negocio', 'preco_medio',
  'publico_alvo', 'dores_principais', 'objecoes', 'canais',
  'metas', 'prioridades', 'restricoes', 'orcamento_mensal',
  'dna_fundador', 'knowledge_vault', 'playbooks',
]

export async function POST(req: NextRequest) {
  const { user } = await getSupabaseUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Texto vazio' }, { status: 400 })

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OPENROUTER_API_KEY não configurada' }, { status: 500 })

  const systemPrompt = `Você é um assistente de onboarding empresarial. Dado um texto livre sobre uma empresa (pode ser pitch, transcrição, documento, email, etc), extraia informações e preencha os campos abaixo em JSON.

Retorne SOMENTE JSON válido, sem markdown ou explicação. Se não tiver informação para um campo, retorne string vazia "".

Campos:
${CEREBRO_FIELDS.map(f => `  "${f}": "valor"`).join('\n')}

Definições:
- nome_empresa: Nome oficial da empresa
- slogan: Tagline ou slogan
- missao: Por que a empresa existe (1-3 frases)
- visao: Onde quer chegar em 5-10 anos
- valores: Valores fundamentais (separados por vírgula)
- produto_principal: O que vende principal
- diferenciais: O que faz melhor que concorrentes
- modelo_negocio: Como ganha dinheiro
- preco_medio: Ticket médio ou faixa de preço
- publico_alvo: ICP — quem é o cliente ideal
- dores_principais: Principais problemas que resolve
- objecoes: Principais objeções de compra
- canais: Canais de aquisição e distribuição
- metas: Objetivos para os próximos 6-12 meses
- prioridades: Top 3 prioridades agora
- restricoes: Limitações ou restrições
- orcamento_mensal: Budget mensal para marketing/operações
- dna_fundador: Perfil, background e estilo do fundador
- knowledge_vault: Conhecimentos e frameworks usados
- playbooks: Processos documentados

IMPORTANTE: Preencha apenas o que está EXPLICITAMENTE no texto. Não invente.`

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://factorhub.vercel.app',
      'X-Title': 'FactorHub OS',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      max_tokens: 2000,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Texto:\n\n${text.slice(0, 8000)}` },
      ],
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    return NextResponse.json({ error: `OpenRouter: ${txt}` }, { status: 500 })
  }

  const json = await res.json()
  const raw = json.choices?.[0]?.message?.content ?? '{}'

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const filled = JSON.parse(cleaned)
    return NextResponse.json({ filled })
  } catch {
    return NextResponse.json({ error: 'Falha ao parsear resposta da IA', raw }, { status: 500 })
  }
}
