import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
export async function OPTIONS() { return new Response(null, { status: 204, headers: CORS }) }

// Inscrição pública em evento (formulário externo / link compartilhável)
export async function POST(req: NextRequest) {
  try {
    const { eventoId, empresaId, nome, email, telefone } = (await req.json()) as Record<string, string>
    if (!eventoId || !empresaId || !nome) return new Response(JSON.stringify({ error: 'dados insuficientes' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const { error } = await admin.from('hub_inscricoes').insert({ evento_id: eventoId, empresa_id: empresaId, nome, email: email || null, telefone: telefone || null })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
    return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (e: unknown) { return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'erro' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }) }
}
