import { NextRequest } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'
import { getCerebroContext } from '@/lib/cerebro'

export const runtime = 'nodejs'
export const maxDuration = 120

type Msg = { role: 'user' | 'assistant'; content: string }

const SYSTEM = `Você é o Construtor de Ferramentas do FactorHub OS — um engenheiro front-end sênior.

TAREFA: Gerar uma FERRAMENTA WEB COMPLETA e FUNCIONAL como um único arquivo HTML standalone, baseado no pedido do usuário.

REGRAS ABSOLUTAS:
1. Saída = APENAS o código HTML completo. Comece com <!DOCTYPE html> e termine com </html>.
2. NUNCA use cercas de markdown (sem \`\`\`html). Só o HTML cru.
3. Tudo inline: CSS dentro de <style>, JS dentro de <script>. Zero dependências externas exceto CDNs públicas confiáveis (ex: chart.js, tailwind via cdn) se necessário.
4. A ferramenta deve FUNCIONAR de verdade — botões, cálculos, interações reais. Não faça mockup estático.
5. Design: tema escuro premium (fundo #0a0a0a / #101010, cards #181818, borda #2e2e2e, texto #ededed, accent verde #3ecf8e). Limpo, denso, profissional. Sem emojis.
6. Responsivo. Fonte system-ui / Inter.
7. Se for relatório/documento, formate para impressão (botão "Imprimir / PDF" com window.print()).

Gere a ferramenta mais útil e completa possível para o pedido. Pense no que o usuário realmente precisa.`

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return new Response('OPENROUTER_API_KEY não configurada', { status: 500 })

  const { user, admin } = await getSupabaseUser(req)
  if (!user) return new Response('Não autorizado', { status: 401 })

  const { data: usrRow } = await admin.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
  const empresaId = usrRow?.empresa_id ?? user.id

  const { prompt, messages } = (await req.json()) as { prompt?: string; messages?: Msg[] }
  const userPrompt = prompt ?? messages?.findLast(m => m.role === 'user')?.content
  if (!userPrompt) return new Response('Pedido obrigatório', { status: 400 })

  // contexto da empresa para a ferramenta ser sob medida
  const { formatted: cerebro } = await getCerebroContext(empresaId, admin)
  const system = `${SYSTEM}\n\n[CONTEXTO DA EMPRESA — use se relevante]\n${cerebro}`

  const model = process.env.MODEL_BUILD || process.env.MODEL_C1 || 'anthropic/claude-sonnet-4-5'

  const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'FactorHub Build Tool',
      'HTTP-Referer': 'https://factor-hub.vercel.app',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      stream: true,
      messages: [
        { role: 'system', content: system },
        ...(messages ?? [{ role: 'user', content: userPrompt }]),
      ],
    }),
  })

  if (!orRes.ok || !orRes.body) {
    const err = await orRes.text()
    return new Response(`OpenRouter error: ${err}`, { status: 502 })
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(ctrl) {
      const reader = orRes.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let full = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (raw === '[DONE]') {
              ctrl.enqueue(encoder.encode('data: [DONE]\n\n'))
              continue
            }
            try {
              const p = JSON.parse(raw) as {
                choices?: { delta?: { content?: string } }[]
                usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number }
              }
              const tok = p.choices?.[0]?.delta?.content ?? ''
              if (tok) {
                full += tok
                ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ token: tok })}\n\n`))
              }
              if (p.usage) {
                void admin.from('hub_uso_agentes').insert({
                  empresa_id: empresaId, agente_id: 'DV', modelo: model,
                  prompt_tokens: p.usage.prompt_tokens ?? 0, completion_tokens: p.usage.completion_tokens ?? 0,
                  total_tokens: (p.usage.prompt_tokens ?? 0) + (p.usage.completion_tokens ?? 0), custo_usd: p.usage.cost ?? 0,
                })
              }
            } catch { /* skip */ }
          }
        }
      } finally {
        reader.releaseLock()
        ctrl.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
