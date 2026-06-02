import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'

export async function GET(req: NextRequest) {
  try {
    const { user, admin } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { data: u } = await admin.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const empresaId = u?.empresa_id ?? user.id
    const { data: eventos } = await admin.from('hub_eventos').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false })
    const { data: inscricoes } = await admin.from('hub_inscricoes').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false })
    return NextResponse.json({ eventos: eventos ?? [], inscricoes: inscricoes ?? [] })
  } catch (e: unknown) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const { user, admin } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { data: u } = await admin.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const empresaId = u?.empresa_id ?? user.id
    const body = (await req.json()) as Record<string, unknown>

    // alternar presença de inscrito
    if (body.inscricaoId) {
      const { error } = await admin.from('hub_inscricoes').update({ presente: body.presente }).eq('id', body.inscricaoId).eq('empresa_id', empresaId)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ ok: true })
    }
    // atualizar evento existente
    if (body.id) {
      const upd: Record<string, unknown> = {}
      for (const k of ['nome', 'descricao', 'data_evento', 'local', 'capacidade', 'status'] as const) if (body[k] !== undefined) upd[k] = body[k]
      const { data, error } = await admin.from('hub_eventos').update(upd).eq('id', body.id).eq('empresa_id', empresaId).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ evento: data })
    }
    // criar evento
    const { data, error } = await admin.from('hub_eventos').insert({
      empresa_id: empresaId, nome: body.nome ?? 'Evento', descricao: body.descricao ?? null,
      data_evento: body.data_evento ?? null, local: body.local ?? null, capacidade: Number(body.capacidade) || 0,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ evento: data })
  } catch (e: unknown) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, admin } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { data: u } = await admin.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const empresaId = u?.empresa_id ?? user.id
    const { id } = (await req.json()) as { id: string }
    const { error } = await admin.from('hub_eventos').delete().eq('id', id).eq('empresa_id', empresaId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 }) }
}
