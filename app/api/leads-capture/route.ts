import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() { return new Response(null, { status: 204, headers: CORS }) }

// Captura pública de lead (chamado pelo widget de Atendimento / site externo)
export async function POST(req: NextRequest) {
  try {
    const { empresaId, nome, email, telefone, interesse, origem } = (await req.json()) as Record<string, string>
    if (!empresaId || (!nome && !telefone && !email)) {
      return new Response(JSON.stringify({ error: 'dados insuficientes' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const { error } = await admin.from('hub_leads').insert({
      empresa_id: empresaId,
      nome: nome || 'Lead do atendimento',
      email: email || null,
      telefone: telefone || null,
      interesse: interesse || null,
      origem: origem || 'atendimento',
      status: 'novo',
    })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
    return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'erro' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
}
