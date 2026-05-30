import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'
import { getAgente } from '@/lib/hub-agentes'

const MODELO_PADRAO = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY não configurada' }, { status: 500 })
    }

    const { user, supabase } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: usrRow } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const empresaId = usrRow?.empresa_id ?? user.id

    const { agentId, titulo, descricao } = (await req.json()) as { agentId?: string; titulo?: string; descricao?: string }
    const agente = agentId ? getAgente(agentId) : undefined
    if (!agente) return NextResponse.json({ error: 'Agente inválido' }, { status: 400 })
    if (!titulo?.trim()) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

    const modelo = agente.modelo || MODELO_PADRAO
    const prompt = descricao ? `${titulo}\n\n${descricao}` : titulo

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
          { role: 'system', content: agente.system },
          { role: 'user', content: prompt },
        ],
      }),
    })

    const data = await r.json().catch(() => ({}))

    if (!r.ok) {
      await supabase.from('hub_tarefas').update({ status: 'erro', resultado: data?.error?.message || 'Falha na geração', completed_at: new Date().toISOString() }).eq('id', tarefa?.id)
      return NextResponse.json({ error: 'Falha ao gerar resposta' }, { status: 502 })
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

    return NextResponse.json({ tarefa: updated })
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
