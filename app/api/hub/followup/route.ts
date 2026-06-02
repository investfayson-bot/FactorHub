import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'
import { getCerebroContext } from '@/lib/cerebro'

export const runtime = 'nodejs'

const FROM = process.env.FOLLOWUP_FROM || 'FactorHub <onboarding@resend.dev>'

export async function POST(req: NextRequest) {
  try {
    const { user, admin } = await getSupabaseUser(req)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { data: u } = await admin.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const empresaId = u?.empresa_id ?? user.id

    const body = (await req.json()) as { acao?: string; lead?: { nome?: string; interesse?: string; email?: string }; assunto?: string; mensagem?: string; to?: string }

    // 1) GERAR rascunho com IA
    if (body.acao === 'draft') {
      const apiKey = process.env.OPENROUTER_API_KEY
      if (!apiKey) return NextResponse.json({ error: 'IA não configurada' }, { status: 500 })
      const { formatted: cerebro } = await getCerebroContext(empresaId, admin)
      const model = process.env.MODEL_DEFAULT || 'anthropic/claude-haiku-4-5'
      const sys = `Você escreve emails de follow-up de vendas — curtos, calorosos, com 1 call-to-action claro.
${cerebro ? `[EMPRESA]\n${cerebro}\n` : ''}
Retorne JSON: {"assunto":"...","mensagem":"corpo do email em texto, 3-5 linhas, com saudação e CTA"}. Sem markdown, sem emojis.`
      const lead = body.lead ?? {}
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'FactorHub Followup' },
        body: JSON.stringify({ model, max_tokens: 600, messages: [{ role: 'system', content: sys }, { role: 'user', content: `Lead: ${lead.nome ?? 'cliente'}. Interesse: ${lead.interesse ?? 'não informado'}. Escreva o follow-up.` }] }),
      })
      const data = await r.json()
      const raw: string = data?.choices?.[0]?.message?.content ?? '{}'
      try { const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); return NextResponse.json(j) }
      catch { return NextResponse.json({ assunto: 'Tudo certo por aí?', mensagem: raw.slice(0, 400) }) }
    }

    // 2) ENVIAR email via Resend
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY não configurada' }, { status: 500 })
    if (!body.to || !body.assunto || !body.mensagem) return NextResponse.json({ error: 'destinatário, assunto e mensagem obrigatórios' }, { status: 400 })

    const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#222">${body.mensagem.replace(/\n/g, '<br>')}</div>`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [body.to], subject: body.assunto, html }),
    })
    const out = await res.json().catch(() => ({}))
    if (!res.ok) return NextResponse.json({ error: out?.message || `Resend ${res.status}` }, { status: 400 })
    return NextResponse.json({ ok: true, id: out?.id })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}
