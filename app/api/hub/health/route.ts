import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY
  const allKeys = Object.keys(process.env).filter(k => k.includes('OPEN') || k.includes('ROUTER'))
  return NextResponse.json({
    openrouter: !!key,
    openrouter_len: key?.length ?? 0,
    openrouter_prefix: key ? key.slice(0, 8) : 'missing',
    model: process.env.OPENROUTER_MODEL ?? 'missing',
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    env_keys_with_open: allKeys,
    ts: Date.now(),
  })
}
