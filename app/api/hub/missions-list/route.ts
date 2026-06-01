import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'

export async function GET(req: NextRequest) {
  try {
    const { user, supabase, admin } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: usrRow } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const empresaId = usrRow?.empresa_id ?? user.id

    const { data: missions, error } = await supabase
      .from('missions')
      .select('id, title, level, status, created_at, total_tokens, cost_usd, agents_used, product')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ missions: missions ?? [] })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, supabase, admin } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { missionId, status } = (await req.json()) as { missionId: string; status: string }
    if (!missionId || !status) return NextResponse.json({ error: 'missionId e status obrigatórios' }, { status: 400 })

    const validStatuses = ['approved', 'archived', 'running', 'completed', 'draft', 'awaiting_approval']
    if (!validStatuses.includes(status)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 })

    const updateData: Record<string, unknown> = { status }
    if (status === 'approved') updateData.approved_at = new Date().toISOString()

    const { error } = await admin
      .from('missions')
      .update(updateData)
      .eq('id', missionId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // LOOP: missão aprovada vira projeto automaticamente
    let projetoCriado = false
    if (status === 'approved') {
      const { data: usrRow } = await admin.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
      const empresaId = usrRow?.empresa_id ?? user.id

      const { data: mission } = await admin.from('missions').select('title, level').eq('id', missionId).maybeSingle()
      if (mission) {
        // evita duplicar projeto da mesma missão
        const { data: existing } = await admin.from('hub_projetos').select('id').eq('empresa_id', empresaId).eq('nome', mission.title).maybeSingle()
        if (!existing) {
          await admin.from('hub_projetos').insert({
            empresa_id: empresaId,
            nome: mission.title,
            descricao: `Projeto criado automaticamente a partir da missão ${mission.level} aprovada.`,
            status: 'planejamento',
            progresso: 0,
            categoria: 'Missão',
          })
          projetoCriado = true
        }
      }
    }

    return NextResponse.json({ ok: true, projetoCriado })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, supabase, admin } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { missionId } = (await req.json()) as { missionId: string }
    if (!missionId) return NextResponse.json({ error: 'missionId obrigatório' }, { status: 400 })

    const { data: usrRow } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const empresaId = usrRow?.empresa_id ?? user.id

    const { error } = await supabase
      .from('missions')
      .delete()
      .eq('id', missionId)
      .eq('empresa_id', empresaId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 })
  }
}
