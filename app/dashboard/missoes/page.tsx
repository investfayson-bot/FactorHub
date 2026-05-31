'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MISSION_LEVELS, AGENTS_V2, getAllAgentsInLevel } from '@/lib/agents-v2'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type MissionState = 'idle' | 'running' | 'completed' | 'error'

type AgentStep = {
  agentId: string
  agentName: string
  layer: string
  layerLabel: string
  color: string
  output: string
  tokensUsed: number
  status: 'waiting' | 'running' | 'done'
}

type PhaseState = {
  phaseIndex: number
  phaseLabel: string
  agents: AgentStep[]
  status: 'waiting' | 'running' | 'done'
}

type MissionRecord = {
  id: string
  title: string
  level: string
  status: string
  created_at: string
  total_tokens: number
  cost_usd: number
  agents_used: string[]
}

// ─── Mission Level Selector ───────────────────────────────────────────────────

function LevelCard({
  id, selected, onClick,
}: {
  id: string
  selected: boolean
  onClick: () => void
}) {
  const ml = MISSION_LEVELS[id]
  const agents = getAllAgentsInLevel(id)
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        background: selected ? 'var(--accent-dim)' : 'var(--surface-2)',
        cursor: 'pointer', textAlign: 'left',
        transition: 'all .15s',
        flex: '1 1 0',
        minWidth: 120,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: selected ? 'var(--accent)' : 'var(--text)', fontFamily: 'monospace' }}>{id}</span>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
          ~{ml.estimatedMinutes}min
        </span>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: selected ? 'var(--accent)' : 'var(--text)', marginBottom: 2 }}>{ml.label}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 6 }}>{ml.description}</div>
      <div style={{ fontSize: 9, color: 'var(--text-dim)' }}>{agents.length} agentes</div>
    </button>
  )
}

// ─── Agent Preview Row ────────────────────────────────────────────────────────

function AgentPreview({ level }: { level: string }) {
  const ml = MISSION_LEVELS[level]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ml.chains.map((phase, pi) => (
        <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', width: 52, textAlign: 'right', flexShrink: 0 }}>
            {pi === 0 ? 'Conselho' : pi === ml.chains.length - 1 ? 'Síntese' : phase[0] === 'SI' ? 'Inteligência' : phase[0] === 'SA' ? 'Síntese Esp.' : AGENTS_V2[phase[0]]?.layerLabel ?? `Fase ${pi + 1}`}
          </span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {phase.map(agentId => {
              const a = AGENTS_V2[agentId]
              return (
                <div
                  key={agentId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 7px', borderRadius: 5,
                    background: a ? `${a.color}18` : 'var(--surface-3)',
                    border: `0.5px solid ${a ? `${a.color}40` : 'var(--border)'}`,
                  }}
                >
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: a?.color ?? '#666' }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: a?.color ?? 'var(--text-muted)' }}>{a?.name ?? agentId}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Running Phase Timeline ───────────────────────────────────────────────────

function PhaseTimeline({ phases }: { phases: PhaseState[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {phases.map((phase) => (
        <div key={phase.phaseIndex} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              background: phase.status === 'done' ? '#10b981' : phase.status === 'running' ? 'var(--accent)' : 'var(--surface-3)',
              border: `1.5px solid ${phase.status === 'done' ? '#10b981' : phase.status === 'running' ? 'var(--accent)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .3s',
            }}>
              {phase.status === 'done' && <i className="fa-solid fa-check" style={{ fontSize: 7, color: '#fff' }} />}
              {phase.status === 'running' && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }} />}
            </div>
            {phase.phaseIndex < phases.length - 1 && (
              <div style={{ width: 1, height: 20, background: phase.status === 'done' ? '#10b981' : 'var(--border)', marginTop: 2 }} />
            )}
          </div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: phase.status === 'running' ? 'var(--accent)' : phase.status === 'done' ? 'var(--text)' : 'var(--text-muted)' }}>
                {phase.phaseLabel}
              </span>
              {phase.status === 'running' && (
                <span style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 600 }}>em execução...</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {phase.agents.map((a) => (
                <div
                  key={a.agentId}
                  style={{
                    padding: '2px 6px', borderRadius: 4,
                    background: a.status === 'done' ? `${a.color}18` : a.status === 'running' ? `${a.color}30` : 'var(--surface-3)',
                    border: `0.5px solid ${a.status === 'waiting' ? 'var(--border)' : `${a.color}50`}`,
                    transition: 'all .3s',
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 700, color: a.status === 'waiting' ? 'var(--text-dim)' : a.color }}>
                    {a.agentName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Agent Output Panel ───────────────────────────────────────────────────────

function AgentOutputPanel({
  steps, currentAgentId, currentToken,
}: {
  steps: Array<{ agentId: string; agentName: string; color: string; output: string }>
  currentAgentId: string | null
  currentToken: string
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (currentAgentId) setSelected(currentAgentId)
  }, [currentAgentId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentToken])

  const activeStep = selected ? steps.find(s => s.agentId === selected) : null
  const isCurrentlyStreaming = selected === currentAgentId

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Agent tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
        {steps.map(s => (
          <button
            key={s.agentId}
            onClick={() => setSelected(s.agentId)}
            style={{
              padding: '3px 8px', borderRadius: 5,
              background: selected === s.agentId ? `${s.color}20` : 'var(--surface-3)',
              border: `0.5px solid ${selected === s.agentId ? `${s.color}60` : 'var(--border)'}`,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 700, color: selected === s.agentId ? s.color : 'var(--text-muted)' }}>
              {s.agentName}
            </span>
          </button>
        ))}
        {currentAgentId && !steps.find(s => s.agentId === currentAgentId) && (
          <button
            onClick={() => setSelected(currentAgentId)}
            style={{
              padding: '3px 8px', borderRadius: 5,
              background: 'var(--accent-dim)',
              border: '0.5px solid var(--accent)',
              cursor: 'pointer', fontFamily: 'inherit',
              animation: 'pulse 1s infinite',
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)' }}>
              {AGENTS_V2[currentAgentId]?.name ?? currentAgentId} ●
            </span>
          </button>
        )}
      </div>

      {/* Output area */}
      <div style={{
        flex: 1, overflow: 'auto', fontFamily: 'monospace',
        fontSize: 12, lineHeight: 1.7, color: 'var(--text)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {activeStep ? (
          <>
            {activeStep.output}
            {isCurrentlyStreaming && currentToken && (
              <span style={{ color: 'var(--accent)' }}>{currentToken}<span style={{ animation: 'blink 1s infinite' }}>▋</span></span>
            )}
          </>
        ) : currentAgentId && selected === currentAgentId ? (
          <>
            <span style={{ color: 'var(--text-muted)' }}>Recebendo...</span>
            {currentToken && <span style={{ color: 'var(--accent)' }}>{currentToken}</span>}
          </>
        ) : (
          <span style={{ color: 'var(--text-dim)' }}>Selecione um agente para ver o output</span>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ─── History Table ────────────────────────────────────────────────────────────

function HistoryTable({ missions }: { missions: MissionRecord[] }) {
  if (!missions.length) return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      Nenhuma missão ainda. Inicie sua primeira missão acima.
    </div>
  )

  const statusColor: Record<string, string> = {
    running: '#f59e0b',
    completed: '#10b981',
    approved: '#3b82f6',
    archived: '#6b7280',
    error: '#ef4444',
  }

  return (
    <div style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Missão', 'Nível', 'Status', 'Agentes', 'Tokens', 'Custo', 'Data'].map(h => (
              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-muted)', letterSpacing: '.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {missions.map((m) => (
            <tr key={m.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background .15s' }}>
              <td style={{ padding: '10px', maxWidth: 280 }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.title}
                </div>
              </td>
              <td style={{ padding: '10px' }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: 10, fontWeight: 800,
                  padding: '2px 6px', borderRadius: 4,
                  background: 'var(--accent-dim)', color: 'var(--accent)',
                }}>
                  {m.level}
                </span>
              </td>
              <td style={{ padding: '10px' }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                  background: `${statusColor[m.status] ?? '#666'}15`,
                  color: statusColor[m.status] ?? 'var(--text-muted)',
                }}>
                  {m.status}
                </span>
              </td>
              <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{m.agents_used?.length ?? '—'}</td>
              <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{m.total_tokens?.toLocaleString() ?? '—'}</td>
              <td style={{ padding: '10px', color: 'var(--text-muted)' }}>
                {m.cost_usd ? `$${m.cost_usd.toFixed(4)}` : '—'}
              </td>
              <td style={{ padding: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {new Date(m.created_at).toLocaleDateString('pt-BR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MissoesPage() {
  const [missionText, setMissionText] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('N2')
  const [state, setState] = useState<MissionState>('idle')
  const [phases, setPhases] = useState<PhaseState[]>([])
  const [completedSteps, setCompletedSteps] = useState<Array<{ agentId: string; agentName: string; color: string; output: string }>>([])
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null)
  const [currentToken, setCurrentToken] = useState('')
  const [summary, setSummary] = useState('')
  const [missionId, setMissionId] = useState<string | null>(null)
  const [totalTokens, setTotalTokens] = useState(0)
  const [costUsd, setCostUsd] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [missions, setMissions] = useState<MissionRecord[]>([])
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    loadMissions()
  }, [])

  async function loadMissions() {
    const res = await fetch('/api/hub/missions-list')
    if (res.ok) {
      const { missions: list } = await res.json() as { missions: MissionRecord[] }
      setMissions(list ?? [])
    }
  }

  function initPhases(level: string) {
    const ml = MISSION_LEVELS[level]
    return ml.chains.map((phase, pi) => ({
      phaseIndex: pi,
      phaseLabel: getPhaseLabel(phase, pi, ml.chains.length),
      status: 'waiting' as const,
      agents: phase.map(agentId => {
        const a = AGENTS_V2[agentId]
        return {
          agentId,
          agentName: a?.name ?? agentId,
          layer: a?.layer ?? 'C1',
          layerLabel: a?.layerLabel ?? '',
          color: a?.color ?? '#666',
          output: '',
          tokensUsed: 0,
          status: 'waiting' as const,
        }
      }),
    }))
  }

  function getPhaseLabel(phase: string[], pi: number, total: number): string {
    if (pi === total - 1) return 'Síntese Final'
    if (phase[0] === 'SI') return 'Inteligência Estratégica'
    if (phase[0] === 'SA') return 'Síntese Especialistas'
    const a = AGENTS_V2[phase[0]]
    return a?.layerLabel ?? `Fase ${pi + 1}`
  }

  const startMission = useCallback(async () => {
    if (!missionText.trim() || state === 'running') return

    setState('running')
    setErrorMsg('')
    setSummary('')
    setCompletedSteps([])
    setCurrentAgentId(null)
    setCurrentToken('')
    setTotalTokens(0)
    setCostUsd(0)
    setMissionId(null)

    const initialPhases = initPhases(selectedLevel)
    setPhases(initialPhases)

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/hub/mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission: missionText, level: selectedLevel }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(`Erro ao iniciar missão: ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          try {
            const evt = JSON.parse(raw) as Record<string, unknown>

            if (evt.event === 'mission_start') {
              setMissionId(evt.missionId as string)
            }

            if (evt.event === 'phase_start') {
              const pi = evt.phaseIndex as number
              setPhases(prev => prev.map((p, i) => i === pi ? { ...p, status: 'running' } : p))
            }

            if (evt.event === 'agent_start') {
              const agentId = evt.agentId as string
              const pi = evt.phaseIndex as number
              setCurrentAgentId(agentId)
              setCurrentToken('')
              setPhases(prev => prev.map((p, i) => i === pi ? {
                ...p,
                agents: p.agents.map(a => a.agentId === agentId ? { ...a, status: 'running' } : a),
              } : p))
            }

            if (evt.event === 'token') {
              const token = evt.token as string
              setCurrentToken(prev => prev + token)
            }

            if (evt.event === 'agent_done') {
              const agentId = evt.agentId as string
              const output = evt.output as string
              const pi = evt.phaseIndex as number
              const tokens = evt.tokensUsed as number

              const a = AGENTS_V2[agentId]
              setCompletedSteps(prev => [...prev, {
                agentId,
                agentName: a?.name ?? agentId,
                color: a?.color ?? '#666',
                output,
              }])

              setPhases(prev => prev.map((p, i) => i === pi ? {
                ...p,
                agents: p.agents.map(ag => ag.agentId === agentId ? {
                  ...ag, status: 'done', output, tokensUsed: tokens,
                } : ag),
              } : p))

              setCurrentToken('')
            }

            if (evt.event === 'phase_done') {
              const pi = evt.phaseIndex as number
              setPhases(prev => prev.map((p, i) => i === pi ? { ...p, status: 'done' } : p))
            }

            if (evt.event === 'mission_done') {
              setCurrentAgentId(null)
              setSummary(evt.summary as string)
              setTotalTokens(evt.totalTokens as number)
              setCostUsd(evt.costUsd as number)
              setState('completed')
              loadMissions()
            }

            if (evt.event === 'error') {
              throw new Error(evt.message as string)
            }

          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue
            throw parseErr
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setState('idle')
        return
      }
      setErrorMsg(err instanceof Error ? err.message : 'Erro desconhecido')
      setState('error')
    }
  }, [missionText, selectedLevel, state])

  function cancelMission() {
    abortRef.current?.abort()
    setState('idle')
  }

  function newMission() {
    setState('idle')
    setMissionText('')
    setPhases([])
    setCompletedSteps([])
    setSummary('')
    setCurrentAgentId(null)
    setCurrentToken('')
  }

  async function approveMission() {
    if (!missionId) return
    await fetch(`/api/hub/missions-list`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionId, status: 'approved' }),
    })
    loadMissions()
    newMission()
  }

  async function archiveMission() {
    if (!missionId) return
    await fetch(`/api/hub/missions-list`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionId, status: 'archived' }),
    })
    loadMissions()
    newMission()
  }

  const card: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 20,
  }

  return (
    <div style={{ padding: '20px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── IDLE — Mission builder ── */}
      <AnimatePresence>
        {state === 'idle' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Nova Missão</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Descreva o que precisa analisar, planejar ou executar. O sistema decide quem analisa e em que ordem.</div>
              </div>
              <textarea
                value={missionText}
                onChange={e => setMissionText(e.target.value)}
                placeholder="Ex: Quero lançar um produto de assinatura para PMEs brasileiras no setor de logística. Analise viabilidade, mercado, concorrência e monte um plano de lançamento."
                style={{
                  width: '100%', minHeight: 120, resize: 'vertical',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '12px 14px',
                  fontSize: 13, color: 'var(--text)', fontFamily: 'inherit',
                  outline: 'none', lineHeight: 1.6,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Level selector */}
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 12 }}>
                Profundidade de Análise
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.keys(MISSION_LEVELS).map(id => (
                  <LevelCard key={id} id={id} selected={selectedLevel === id} onClick={() => setSelectedLevel(id)} />
                ))}
              </div>
            </div>

            {/* Agent preview */}
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 12 }}>
                Agentes Ativados — {MISSION_LEVELS[selectedLevel].label}
              </div>
              <AgentPreview level={selectedLevel} />
            </div>

            <button
              onClick={startMission}
              disabled={!missionText.trim()}
              style={{
                padding: '14px 24px', borderRadius: 10,
                background: missionText.trim() ? 'var(--accent)' : 'var(--surface-3)',
                color: missionText.trim() ? '#fff' : 'var(--text-dim)',
                border: 'none', cursor: missionText.trim() ? 'pointer' : 'default',
                fontSize: 14, fontWeight: 800, letterSpacing: '.03em',
                fontFamily: 'inherit', transition: 'all .15s',
              }}
            >
              <i className="fa-solid fa-rocket" style={{ marginRight: 8 }} />
              Iniciar Missão {selectedLevel}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RUNNING ── */}
      <AnimatePresence>
        {state === 'running' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 500 }}>
            {/* Left: Phase timeline */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>Execução em Cadeia</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{MISSION_LEVELS[selectedLevel].label} · {MISSION_LEVELS[selectedLevel].estimatedMinutes}min est.</div>
              </div>
              <PhaseTimeline phases={phases} />
              <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={cancelMission}
                  style={{
                    width: '100%', padding: '8px', borderRadius: 7,
                    background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
                    color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 12, fontWeight: 600,
                  }}
                >
                  Cancelar missão
                </button>
              </div>
            </div>

            {/* Right: Streaming output */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>
                Output em Tempo Real
                {currentAgentId && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: 'var(--accent)' }}>
                    ● {AGENTS_V2[currentAgentId]?.name ?? currentAgentId}
                  </span>
                )}
              </div>
              <AgentOutputPanel
                steps={completedSteps}
                currentAgentId={currentAgentId}
                currentToken={currentToken}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── COMPLETED ── */}
      <AnimatePresence>
        {state === 'completed' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Summary stats */}
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'Status', value: 'Concluída', color: '#10b981' },
                { label: 'Nível', value: `${selectedLevel} · ${MISSION_LEVELS[selectedLevel].label}`, color: 'var(--accent)' },
                { label: 'Agentes', value: String(completedSteps.length), color: 'var(--text)' },
                { label: 'Tokens', value: totalTokens.toLocaleString(), color: 'var(--text)' },
                { label: 'Custo', value: `$${costUsd.toFixed(4)}`, color: 'var(--text)' },
              ].map(s => (
                <div key={s.label} style={{ ...card, flex: 1, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* CA Executive Summary */}
            {summary && (
              <div style={{ ...card, borderColor: 'rgba(124,58,237,.3)', background: 'rgba(124,58,237,.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(124,58,237,.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed' }}>CA</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Chief of Staff — Síntese Executiva</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Relatório final da missão</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'inherit', fontSize: 13, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                  {summary}
                </div>
              </div>
            )}

            {/* All agent outputs */}
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '.05em', textTransform: 'uppercase' }}>
                Outputs Completos de Todos os Agentes
              </div>
              <div style={{ height: 400, overflow: 'hidden' }}>
                <AgentOutputPanel steps={completedSteps} currentAgentId={null} currentToken="" />
              </div>
            </div>

            {/* Approval buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={approveMission}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  background: '#10b981', color: '#fff', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                }}
              >
                <i className="fa-solid fa-check" style={{ marginRight: 6 }} />
                Aprovar e salvar
              </button>
              <button
                onClick={archiveMission}
                style={{
                  padding: '12px 20px', borderRadius: 8,
                  background: 'var(--surface-2)', color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                }}
              >
                Arquivar
              </button>
              <button
                onClick={newMission}
                style={{
                  padding: '12px 20px', borderRadius: 8,
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                }}
              >
                Nova missão
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ERROR ── */}
      {state === 'error' && (
        <div style={{ ...card, borderColor: 'rgba(239,68,68,.3)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>Erro na missão</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{errorMsg}</div>
          <button onClick={newMission} style={{
            padding: '8px 16px', borderRadius: 7, background: 'var(--surface-2)',
            border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 12, color: 'var(--text)',
          }}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── History ── */}
      {state === 'idle' && (
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 14 }}>
            Histórico de Missões
          </div>
          <HistoryTable missions={missions} />
        </div>
      )}
    </div>
  )
}
