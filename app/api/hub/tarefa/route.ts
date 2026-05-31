import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'
import { getAgente } from '@/lib/hub-agentes'

const MODELO_PADRAO = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

async function buildSystemPrompt(agentSystem: string, supabase: Awaited<ReturnType<typeof getSupabaseUser>>['supabase'], empresaId: string): Promise<string> {
  const { data: cerebro } = await supabase.from('hub_cerebro').select('*').eq('empresa_id', empresaId).maybeSingle()
  if (!cerebro) return agentSystem

  const ctx: string[] = ['=== CONTEXTO DA EMPRESA (Cerebro) ===']
  if (cerebro.nome_empresa) ctx.push(`Empresa: ${cerebro.nome_empresa}`)
  if (cerebro.slogan) ctx.push(`Slogan: ${cerebro.slogan}`)
  if (cerebro.missao) ctx.push(`Missão: ${cerebro.missao}`)
  if (cerebro.visao) ctx.push(`Visão: ${cerebro.visao}`)
  if (cerebro.valores) ctx.push(`Valores: ${cerebro.valores}`)
  if (cerebro.produto_principal) ctx.push(`Produto principal: ${cerebro.produto_principal}`)
  if (cerebro.diferenciais) ctx.push(`Diferenciais: ${cerebro.diferenciais}`)
  if (cerebro.modelo_negocio) ctx.push(`Modelo de negócio: ${cerebro.modelo_negocio}`)
  if (cerebro.preco_medio) ctx.push(`Ticket médio: ${cerebro.preco_medio}`)
  if (cerebro.publico_alvo) ctx.push(`Público-alvo (ICP): ${cerebro.publico_alvo}`)
  if (cerebro.dores_principais) ctx.push(`Dores do cliente: ${cerebro.dores_principais}`)
  if (cerebro.objecoes) ctx.push(`Objeções comuns: ${cerebro.objecoes}`)
  if (cerebro.canais) ctx.push(`Canais de aquisição: ${cerebro.canais}`)
  if (cerebro.metas) ctx.push(`Metas do trimestre: ${cerebro.metas}`)
  if (cerebro.prioridades) ctx.push(`Prioridades: ${cerebro.prioridades}`)
  if (cerebro.restricoes) ctx.push(`Restrições: ${cerebro.restricoes}`)
  ctx.push('=== FIM DO CONTEXTO ===')

  return `${ctx.join('\n')}\n\n${agentSystem}`
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY não configurada' }, { status: 500 })
    }

    const { user, supabase } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: usrRow } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const empresaId = usrRow?.empresa_id ?? user.id

    const body = (await req.json()) as { agentId?: string; agente_id?: string; titulo?: string; descricao?: string }
    const agentId = body.agentId ?? body.agente_id
    const { titulo, descricao } = body
    const agente = agentId ? getAgente(agentId) : undefined
    if (!agente) return NextResponse.json({ error: 'Agente inválido' }, { status: 400 })
    if (!titulo?.trim()) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

    const modelo = agente.modelo || MODELO_PADRAO
    const prompt = descricao ? `${titulo}\n\n${descricao}` : titulo
    const systemPrompt = await buildSystemPrompt(agente.system, supabase, empresaId)

    const { data: tarefa } = await supabase.from('hub_tarefas').insert({
      empresa_id: empresaId,
      agente_id: agente.id,
      titulo: titulo.trim(),
      descricao: descricao?.trim() || null,
      modelo,
      status: 'executando',
    }).select().single()

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'FactorHub',
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 1500,
        usage: { include: true },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
      }),
    })

    const data = await r.json().catch(() => ({}))

    if (!r.ok) {
      await supabase.from('hub_tarefas').update({ status: 'erro', resultado: data?.error?.message || 'Falha na geração', completed_at: new Date().toISOString() }).eq('id', tarefa?.id)
      return NextResponse.json({ error: 'Falha ao gerar resposta', resultado: data?.error?.message }, { status: 502 })
    }

    const resultado: string = data?.choices?.[0]?.message?.content ?? ''
    const usage = data?.usage ?? {}
    const promptTokens = Number(usage.prompt_tokens ?? 0)
    const completionTokens = Number(usage.completion_tokens ?? 0)
    const totalTokens = Number(usage.total_tokens ?? promptTokens + completionTokens)
    const custoUsd = Number(usage.cost ?? 0)

    const { data: updated } = await supabase.from('hub_tarefas').update({
      status: 'concluida',
      resultado,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      custo_usd: custoUsd,
      completed_at: new Date().toISOString(),
    }).eq('id', tarefa?.id).select().single()

    await supabase.from('hub_uso_agentes').insert({
      empresa_id: empresaId,
      agente_id: agente.id,
      modelo,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      custo_usd: custoUsd,
    })

    return NextResponse.json({ tarefa: updated, resultado })
  } catch (error: unknown) {
    console.error('Erro tarefa:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: usrRow } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const empresaId = usrRow?.empresa_id ?? user.id

    const url = new URL(req.url)
    const agentId = url.searchParams.get('agentId')
    const limit = Number(url.searchParams.get('limit') ?? 50)

    let query = supabase.from('hub_tarefas').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(limit)
    if (agentId) query = query.eq('agente_id', agentId)

    const { data } = await query
    return NextResponse.json({ tarefas: data ?? [] })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 })
  }
}
