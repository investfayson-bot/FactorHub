import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    openrouter: !!process.env.OPENROUTER_API_KEY,
    openrouter_prefix: process.env.OPENROUTER_API_KEY?.slice(0, 8) ?? 'missing',
    model: process.env.OPENROUTER_MODEL ?? 'missing',
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
}
