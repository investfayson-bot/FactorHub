import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'
import { getAgente } from '@/lib/hub-agentes'

const MODELO_PADRAO = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

export type PlanStep = {
  id: string
  titulo: string
  descricao: string
  ferramentas: string[]
}

const PLAN_SYSTEM = `Voce e um agente de IA especializado. Dado uma tarefa, gere um plano de execucao em JSON com 3 a 5 etapas claras e especificas. Responda SOMENTE com JSON valido, sem markdown ou explicacao. Formato:
{
  "etapas": [
    {
      "id": "1",
      "titulo": "Titulo curto da etapa",
      "descricao": "O que sera feito nesta etapa",
      "ferramentas": ["Ferramenta1", "Ferramenta2"]
    }
  ]
}

Ferramentas disponiveis por tipo de agente:
- CEO/Estrategia: Analise de Mercado, Planejamento Estrategico, Benchmarking, SWOT
- PM/Projetos: Kanban, Roadmap, Sprint Planning, Estimativa
- CMO/Marketing: SEO, Growth Hacking, Analytics, Funil de Vendas
- Copywriter: NLP, Tom de Voz, A/B Testing, Storytelling
- Analista: Data Mining, Estatistica, Visualizacao, Python
- Dev: Code Review, Arquitetura, Debugging, API Design
- Content: Pesquisa, Roteiro, Edicao, SEO Content`

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY nao configurada' }, { status: 500 })
    }

    const { user } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const { agentId, titulo, descricao } = (await req.json()) as { agentId?: string; titulo?: string; descricao?: string }
    const agente = agentId ? getAgente(agentId) : undefined
    if (!agente) return NextResponse.json({ error: 'Agente invalido' }, { status: 400 })
    if (!titulo?.trim()) return NextResponse.json({ error: 'Titulo obrigatorio' }, { status: 400 })

    const modelo = agente.modelo || MODELO_PADRAO
    const userMsg = descricao ? `Tarefa: ${titulo}\nContexto: ${descricao}` : `Tarefa: ${titulo}`

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'FactorHub',
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 800,
        messages: [
          { role: 'system', content: PLAN_SYSTEM },
          { role: 'user', content: userMsg },
        ],
      }),
    })

    const data = await r.json().catch(() => ({}))
    const raw: string = data?.choices?.[0]?.message?.content ?? ''

    let parsed: { etapas: PlanStep[] } = { etapas: [] }
    try {
      const cleaned = raw.replace(/```json\n?|```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = {
        etapas: [
          { id: '1', titulo: 'Analisando tarefa', descricao: 'Processando contexto e requisitos', ferramentas: ['Analise'] },
          { id: '2', titulo: 'Executando', descricao: titulo, ferramentas: [agente.especialidade] },
          { id: '3', titulo: 'Gerando resultado', descricao: 'Compilando e revisando saida', ferramentas: ['Revisao'] },
        ],
      }
    }

    return NextResponse.json({ etapas: parsed.etapas ?? [] })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 })
  }
}
