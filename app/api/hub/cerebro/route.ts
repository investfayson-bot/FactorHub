import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'

const CEREBRO_COLUMNS = [
  'nome_empresa', 'slogan', 'missao', 'visao', 'valores',
  'produto_principal', 'diferenciais', 'modelo_negocio', 'preco_medio',
  'publico_alvo', 'dores_principais', 'objecoes', 'canais',
  'metas', 'prioridades', 'restricoes', 'orcamento_mensal',
  'dna_fundador', 'knowledge_vault', 'playbooks',
  'memoria_corporativa', 'licoes_aprendidas',
] as const

export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: usrRow } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const empresaId = usrRow?.empresa_id ?? user.id

    const { data, error } = await supabase.from('hub_cerebro').select('*').eq('empresa_id', empresaId).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ cerebro: data ?? null })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: usrRow } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const empresaId = usrRow?.empresa_id ?? user.id

    const rawBody = (await req.json()) as Record<string, unknown>

    // Only send known columns — prevents errors if DB schema is behind
    const body = Object.fromEntries(
      Object.entries(rawBody).filter(([k]) => (CEREBRO_COLUMNS as readonly string[]).includes(k))
    )

    const { data, error } = await supabase.from('hub_cerebro').upsert({
      empresa_id: empresaId,
      ...body,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'empresa_id' }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ cerebro: data })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 })
  }
}
