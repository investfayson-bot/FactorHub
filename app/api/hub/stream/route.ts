import { NextRequest } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'
import { getAgente } from '@/lib/hub-agentes'

const MODELO_PADRAO = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return new Response('OPENROUTER_API_KEY não configurada', { status: 500 })
  }

  const { user, supabase } = await getSupabaseUser(req)
  if (!user) return new Response('Não autorizado', { status: 401 })

  const { data: usrRow } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
  const empresaId = usrRow?.empresa_id ?? user.id

  const { agentId, titulo, descricao } = (await req.json()) as { agentId?: string; titulo?: string; descricao?: string }
  const agente = agentId ? getAgente(agentId) : undefined
  if (!agente) return new Response('Agente inválido', { status: 400 })
  if (!titulo?.trim()) return new Response('Título obrigatório', { status: 400 })

  // Load cerebro context
  const { data: cerebro } = await supabase.from('hub_cerebro').select('*').eq('empresa_id', empresaId).maybeSingle()

  let systemPrompt = agente.system
  if (cerebro) {
    const ctx: string[] = ['=== CONTEXTO DA EMPRESA (Cerebro) ===']
    if (cerebro.nome_empresa) ctx.push(`Empresa: ${cerebro.nome_empresa}`)
    if (cerebro.slogan) ctx.push(`Slogan: ${cerebro.slogan}`)
    if (cerebro.missao) ctx.push(`Missão: ${cerebro.missao}`)
    if (cerebro.produto_principal) ctx.push(`Produto principal: ${cerebro.produto_principal}`)
    if (cerebro.publico_alvo) ctx.push(`Público-alvo: ${cerebro.publico_alvo}`)
    if (cerebro.diferenciais) ctx.push(`Diferenciais: ${cerebro.diferenciais}`)
    if (cerebro.metas) ctx.push(`Metas atuais: ${cerebro.metas}`)
    if (cerebro.restricoes) ctx.push(`Restrições: ${cerebro.restricoes}`)
    ctx.push('=== FIM DO CONTEXTO ===')
    systemPrompt = `${ctx.join('\n')}\n\n${agente.system}`
  }

  const modelo = agente.modelo || MODELO_PADRAO
  const prompt = descricao ? `${titulo}\n\n${descricao}` : titulo

  const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'FactorHub',
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 1500,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!orRes.ok || !orRes.body) {
    return new Response('Falha ao conectar com o modelo', { status: 502 })
  }

  // Pipe SSE stream through, forwarding only data chunks
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      const reader = orRes.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (raw === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              continue
            }
            try {
              const parsed = JSON.parse(raw) as { choices?: { delta?: { content?: string } }[] }
              const token = parsed.choices?.[0]?.delta?.content ?? ''
              if (token) {
                full += token
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      } finally {
        reader.releaseLock()
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
