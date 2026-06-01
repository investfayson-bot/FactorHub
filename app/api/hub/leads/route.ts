import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'

const CAMPOS = ['nome', 'email', 'telefone', 'origem', 'status', 'valor', 'interesse', 'notas'] as const

export async function GET(req: NextRequest) {
  try {
    const { user, admin } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { data: u } = await admin.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const empresaId = u?.empresa_id ?? user.id
    const { data, error } = await admin.from('hub_leads').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ leads: data ?? [] })
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
    const body = (await req.json()) as Record<string, unknown>

    if (body.id) {
      const upd: Record<string, unknown> = { updated_at: new Date().toISOString() }
      for (const k of CAMPOS) if (body[k] !== undefined) upd[k] = body[k]
      const { data, error } = await admin.from('hub_leads').update(upd).eq('id', body.id).eq('empresa_id', empresaId).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ lead: data })
    }

    const insert: Record<string, unknown> = { empresa_id: empresaId }
    for (const k of CAMPOS) if (body[k] !== undefined) insert[k] = body[k]
    if (!insert.nome) insert.nome = 'Sem nome'
    const { data, error } = await admin.from('hub_leads').insert(insert).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ lead: data })
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
    const { error } = await admin.from('hub_leads').delete().eq('id', id).eq('empresa_id', empresaId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}
