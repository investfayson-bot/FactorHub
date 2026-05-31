import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { user } = await getSupabaseUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Arquivo muito grande (max 5MB)' }, { status: 413 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const buf = Buffer.from(await file.arrayBuffer())

  if (['txt', 'md', 'csv'].includes(ext)) {
    return NextResponse.json({ text: buf.toString('utf-8') })
  }

  if (ext === 'pdf') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const data = await pdfParse(buf)
      return NextResponse.json({ text: data.text })
    } catch {
      return NextResponse.json({ error: 'Falha ao extrair PDF. Tente um arquivo .txt' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: `Formato .${ext} não suportado. Use PDF, TXT ou MD.` }, { status: 415 })
}
