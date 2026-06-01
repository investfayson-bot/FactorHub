import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// CORS aberto — este endpoint é chamado pelo widget embedado em sites externos (VN Prime etc.)
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

type Msg = { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return new Response('config', { status: 500, headers: CORS })

  const { empresaId, messages, instrucoes } = (await req.json()) as { empresaId?: string; messages?: Msg[]; instrucoes?: string }
  if (!empresaId || !messages?.length) return new Response('bad request', { status: 400, headers: CORS })

  // service role para ler o cérebro (endpoint público, sem login)
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data: cerebro } = await admin.from('hub_cerebro').select('*').eq('empresa_id', empresaId).maybeSingle()

  const ctx: string[] = []
  if (cerebro) {
    if (cerebro.nome_empresa) ctx.push(`Empresa: ${cerebro.nome_empresa}`)
    if (cerebro.produto_principal) ctx.push(`Produto/Serviço: ${cerebro.produto_principal}`)
    if (cerebro.publico_alvo) ctx.push(`Público: ${String(cerebro.publico_alvo).slice(0, 300)}`)
    if (cerebro.diferenciais) ctx.push(`Diferenciais: ${String(cerebro.diferenciais).slice(0, 300)}`)
    if (cerebro.knowledge_vault) ctx.push(`Base de conhecimento:\n${String(cerebro.knowledge_vault).slice(0, 1500)}`)
  }

  const system = `Você é o atendente virtual 24/7 da empresa. Atenda visitantes com simpatia, objetividade e foco em ajudar e converter.

${ctx.length ? `[CONTEXTO DA EMPRESA]\n${ctx.join('\n')}\n` : ''}
${instrucoes ? `[INSTRUÇÕES ESPECÍFICAS]\n${instrucoes}\n` : ''}
REGRAS: Responda curto e útil (2-4 frases). Se não souber, ofereça encaminhar para um humano e peça nome+contato. Nunca invente preços ou dados que não estão no contexto. Português brasileiro, sem emojis em excesso.`

  const model = process.env.MODEL_DEFAULT || 'anthropic/claude-haiku-4-5'

  const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'FactorHub Atendimento' },
    body: JSON.stringify({ model, max_tokens: 600, stream: true, messages: [{ role: 'system', content: system }, ...messages.slice(-8)] }),
  })

  if (!orRes.ok || !orRes.body) return new Response('upstream', { status: 502, headers: CORS })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(ctrl) {
      const reader = orRes.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n'); buf = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (raw === '[DONE]') { ctrl.enqueue(encoder.encode('data: [DONE]\n\n')); continue }
            try { const tok = JSON.parse(raw).choices?.[0]?.delta?.content ?? ''; if (tok) ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ token: tok })}\n\n`)) } catch { /* skip */ }
          }
        }
      } finally { reader.releaseLock(); ctrl.close() }
    },
  })

  return new Response(readable, { headers: { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
}
