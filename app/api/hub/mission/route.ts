import { NextRequest } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase-route'
import { AGENTS_V2, MISSION_LEVELS, getAgentV2 } from '@/lib/agents-v2'
import { getCerebroContext, buildSystemPrompt, buildHandoffContext } from '@/lib/cerebro'

function getModelForLayer(layer: string): string {
  if (layer === 'C1') return process.env.MODEL_C1 || 'anthropic/claude-sonnet-4-5'
  return process.env.MODEL_DEFAULT || 'anthropic/claude-haiku-4-5'
}

export const runtime = 'nodejs'
export const maxDuration = 300

type MissionStep = {
  agentId: string
  agentName: string
  layer: string
  layerLabel: string
  output: string
  tokensUsed: number
}

async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  model: string,
  onToken: (t: string) => void
): Promise<{ text: string; tokens: number }> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY não configurada')

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'FactorHub OS',
      'HTTP-Referer': 'https://factor-hub.vercel.app',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  })

  if (!res.ok || !res.body) {
    const err = await res.text()
    throw new Error(`OpenRouter error ${res.status}: ${err}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let tokens = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') continue
        try {
          const parsed = JSON.parse(raw) as {
            choices?: { delta?: { content?: string } }[]
            usage?: { total_tokens?: number }
          }
          const token = parsed.choices?.[0]?.delta?.content ?? ''
          if (token) {
            full += token
            tokens++
            onToken(token)
          }
          if (parsed.usage?.total_tokens) tokens = parsed.usage.total_tokens
        } catch { /* skip malformed */ }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return { text: full, tokens }
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return new Response('OPENROUTER_API_KEY não configurada', { status: 500 })
  }

  const { user, supabase } = await getSupabaseUser(req)
  if (!user) return new Response('Não autorizado', { status: 401 })

  const { data: usrRow } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .maybeSingle()
  const empresaId = usrRow?.empresa_id ?? user.id

  const body = (await req.json()) as {
    mission: string
    level: string
    product?: string
  }

  const { mission, level, product } = body
  if (!mission?.trim()) return new Response('Missão obrigatória', { status: 400 })
  if (!MISSION_LEVELS[level]) return new Response('Nível inválido', { status: 400 })

  const missionLevel = MISSION_LEVELS[level]
  const encoder = new TextEncoder()

  const send = (controller: ReadableStreamDefaultController, event: string, data: unknown) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, ...data as object })}\n\n`))
  }

  const stream = new ReadableStream({
    async start(controller) {
      let missionId: string | null = null
      const steps: MissionStep[] = []

      try {
        // Load cerebro context once
        const { formatted: cerebroFormatted } = await getCerebroContext(empresaId, supabase)

        // Create mission record
        const allAgents = missionLevel.chains.flat()
        const { data: missionRow } = await supabase
          .from('missions')
          .insert({
            empresa_id: empresaId,
            title: mission.slice(0, 120),
            description: mission,
            level,
            status: 'running',
            product: product ?? 'general',
            agents_used: allAgents,
          })
          .select('id')
          .single()

        missionId = missionRow?.id ?? null

        send(controller, 'mission_start', {
          missionId,
          level,
          label: missionLevel.label,
          totalPhases: missionLevel.chains.length,
          allAgents,
        })

        // Execute phases sequentially
        for (let phaseIdx = 0; phaseIdx < missionLevel.chains.length; phaseIdx++) {
          const phase = missionLevel.chains[phaseIdx]
          const phaseLabel = getPhaseLabel(phase)

          send(controller, 'phase_start', {
            phaseIndex: phaseIdx,
            phaseLabel,
            agents: phase,
          })

          for (const agentId of phase) {
            const agent = getAgentV2(agentId)
            if (!agent) continue

            send(controller, 'agent_start', {
              phaseIndex: phaseIdx,
              agentId,
              agentName: agent.name,
              layer: agent.layer,
              layerLabel: agent.layerLabel,
              color: agent.color,
            })

            const handoffContext = buildHandoffContext(mission, steps)
            const systemPrompt = buildSystemPrompt(cerebroFormatted, agent, handoffContext)

            const userMessage = buildUserMessage(agentId, mission, steps)

            let agentOutput = ''
            const { text, tokens } = await callOpenRouter(
              systemPrompt,
              userMessage,
              agent.maxTokens,
              getModelForLayer(agent.layer),
              (token) => {
                agentOutput += token
                send(controller, 'token', { agentId, token })
              }
            )

            agentOutput = text

            // Save step to Supabase
            if (missionId) {
              await supabase.from('mission_steps').insert({
                mission_id: missionId,
                agent_id: agentId,
                agent_name: agent.name,
                layer: agent.layer,
                input_context: userMessage.slice(0, 5000),
                output: agentOutput,
                tokens_used: tokens,
              })
            }

            steps.push({
              agentId,
              agentName: agent.name,
              layer: agent.layer,
              layerLabel: agent.layerLabel,
              output: agentOutput,
              tokensUsed: tokens,
            })

            send(controller, 'agent_done', {
              phaseIndex: phaseIdx,
              agentId,
              agentName: agent.name,
              output: agentOutput,
              tokensUsed: tokens,
            })
          }

          send(controller, 'phase_done', { phaseIndex: phaseIdx, phaseLabel })
        }

        // Finalize mission
        const totalTokens = steps.reduce((s, st) => s + st.tokensUsed, 0)
        const costUsd = totalTokens * 0.00000015 // gpt-4o-mini estimate

        if (missionId) {
          await supabase
            .from('missions')
            .update({
              status: 'completed',
              total_tokens: totalTokens,
              cost_usd: costUsd,
              completed_at: new Date().toISOString(),
            })
            .eq('id', missionId)
        }

        // CA output is the last step
        const caStep = steps.findLast(s => s.agentId === 'CA')

        send(controller, 'mission_done', {
          missionId,
          totalSteps: steps.length,
          totalTokens,
          costUsd,
          summary: caStep?.output ?? '',
        })

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido'

        if (missionId) {
          await supabase.from('missions').update({ status: 'error' }).eq('id', missionId)
        }

        send(controller, 'error', { message: msg })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

function getPhaseLabel(agentIds: string[]): string {
  if (!agentIds.length) return 'Fase'
  const agent = AGENTS_V2[agentIds[0]]
  if (!agent) return 'Fase'
  if (agentIds.length === 1 && agentIds[0] === 'CA') return 'Síntese Final'
  if (agentIds.length === 1 && agentIds[0] === 'SI') return 'Inteligência Estratégica'
  if (agentIds.length === 1 && agentIds[0] === 'SA') return 'Síntese Especialistas'
  return agent.layerLabel
}

function buildUserMessage(
  agentId: string,
  mission: string,
  previousSteps: MissionStep[]
): string {
  if (!previousSteps.length) {
    return `MISSÃO: ${mission}\n\nExecute sua análise conforme seu papel e as regras fundamentais.`
  }

  if (agentId === 'CA') {
    return `MISSÃO ORIGINAL: ${mission}\n\nVocê recebeu a análise completa de todos os agentes. Produza o relatório executivo final conforme sua estrutura obrigatória.`
  }

  if (agentId === 'SI') {
    const researchAgents = ['MR', 'CI', 'CR', 'TI', 'DA']
    const researchSteps = previousSteps.filter(s => researchAgents.includes(s.agentId))
    const prefix = researchSteps.length
      ? `Você recebeu os outputs da camada de pesquisa. Sintetize-os em um briefing estratégico para os Diretores.`
      : `Analise a missão e produza o briefing estratégico.`
    return `MISSÃO: ${mission}\n\n${prefix}`
  }

  if (agentId === 'SA') {
    return `MISSÃO ORIGINAL: ${mission}\n\nVocê recebeu os outputs de todos os especialistas. Produza a síntese cross-funcional e o plano de execução integrado.`
  }

  return `MISSÃO: ${mission}\n\nExecute sua análise com base no contexto da cadeia e nas regras fundamentais.`
}
