import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'

export async function GET(req: NextRequest) {
  try {
    const { user, admin } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { data: u } = await admin.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const empresaId = u?.empresa_id ?? user.id
    const { data, error } = await admin.from('hub_criacoes').select('*').eq('empresa_id', empresaId).order('updated_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ criacoes: data ?? [] })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, admin } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { data: u } = await admin.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const empresaId = u?.empresa_id ?? user.id

    const body = (await req.json()) as { id?: string; nome?: string; setor?: string; prompt?: string; conteudo?: string; conversa?: unknown; status?: string }

    if (body.id) {
      // update existente
      const upd: Record<string, unknown> = { updated_at: new Date().toISOString() }
      for (const k of ['nome', 'setor', 'prompt', 'conteudo', 'conversa', 'status'] as const) {
        if (body[k] !== undefined) upd[k] = body[k]
      }
      const { data, error } = await admin.from('hub_criacoes').update(upd).eq('id', body.id).eq('empresa_id', empresaId).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ criacao: data })
    }

    const { data, error } = await admin.from('hub_criacoes').insert({
      empresa_id: empresaId,
      nome: body.nome ?? 'Sem nome',
      setor: body.setor ?? 'Geral',
      prompt: body.prompt ?? null,
      conteudo: body.conteudo ?? null,
      conversa: body.conversa ?? [],
      status: body.status ?? 'rascunho',
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ criacao: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, admin } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { data: u } = await admin.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const empresaId = u?.empresa_id ?? user.id
    const { id } = (await req.json()) as { id: string }
    const { error } = await admin.from('hub_criacoes').delete().eq('id', id).eq('empresa_id', empresaId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}
