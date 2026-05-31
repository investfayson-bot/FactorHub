'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AGENTS_V2 } from '@/lib/agents-v2'
import { useMission } from '@/app/dashboard/mission-context'

const LAYER_ORDER = ['C1', 'C2', 'C3', 'C4', 'CA'] as const
const LAYER_COLORS: Record<string, string> = {
  C1: '#e05a28', C2: '#0d9488', C3: '#6366f1', C4: '#d97706', CA: '#7c3aed',
}

const agents = Object.values(AGENTS_V2)

interface Props {
  open: boolean
  onClose: () => void
}

function formatTokens(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export default function LiveMonitor({ open, onClose }: Props) {
  const { state, phases, currentAgentId, currentToken, selectedLevel, missionText, totalTokens, costUsd, completedSteps } = useMission()
  const feedRef = useRef<HTMLDivElement>(null)
  const [tick, setTick] = useState(0)

  // Tick every second for uptime counter
  useEffect(() => {
    if (!open) return
    const t = setInterval(() => setTick(v => v + 1), 1000)
    return () => clearInterval(t)
  }, [open])

  // Auto-scroll token stream
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [currentToken])

  const runningAgents = phases.flatMap(p => p.agents).filter(a => a.status === 'running')
  const doneAgents = phases.flatMap(p => p.agents).filter(a => a.status === 'done')
  const totalAgents = phases.flatMap(p => p.agents).length

  // Figure out which agent IDs are active in the current mission
  const activeMissionAgentIds = new Set(phases.flatMap(p => p.agents).map(a => a.agentId))
  const doneAgentIds = new Set(doneAgents.map(a => a.agentId))

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 799, background: 'rgba(0,0,0,.4)' }}
          />

          {/* Panel */}
          <motion.div
            className="live-monitor-panel"
            initial={{ x: 340 }}
            animate={{ x: 0 }}
            exit={{ x: 340 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
                <motion.div
                  animate={{ opacity: state === 'running' ? [1, 0.3, 1] : 1 }}
                  transition={{ repeat: Infinity, duration: 0.9 }}
                  style={{ width: 7, height: 7, borderRadius: '50%', background: state === 'running' ? '#22c55e' : '#2c2c2c' }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  Live Monitor
                </span>
                {state === 'running' && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(34,197,94,.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,.2)', letterSpacing: '.05em' }}>
                    ATIVO
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 4 }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Mission summary bar */}
            {state !== 'idle' && (
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>
                  Missão {selectedLevel}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: 8 }}>
                  {missionText}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {/* Progress bar */}
                  <div style={{ flex: 1, height: 3, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden' }}>
                    <motion.div
                      animate={{ width: totalAgents ? `${(doneAgents.length / totalAgents) * 100}%` : '0%' }}
                      transition={{ duration: 0.4 }}
                      style={{ height: '100%', background: '#22c55e', borderRadius: 2 }}
                    />
                  </div>
                  <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)', flexShrink: 0 }}>
                    {doneAgents.length}/{totalAgents}
                  </span>
                  {totalTokens > 0 && (
                    <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)' }}>
                      {formatTokens(totalTokens)}tk
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* ── AGENT GRID ── */}
              <div style={{ padding: '14px 16px 10px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12 }}>
                  Squad — 26 Agentes
                </div>
                {LAYER_ORDER.map(layer => {
                  const layerAgents = agents.filter(a => a.layer === layer)
                  const color = LAYER_COLORS[layer]
                  return (
                    <div key={layer} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                        <div style={{ width: 3, height: 10, borderRadius: 1, background: color }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: '.06em' }}>{layer}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {layerAgents.map(agent => {
                          const isRunning = currentAgentId === agent.id
                          const isDone = doneAgentIds.has(agent.id)
                          const isInMission = activeMissionAgentIds.has(agent.id)
                          const nodeColor = isRunning ? color : isDone ? '#22c55e' : isInMission ? color : undefined

                          return (
                            <motion.div
                              key={agent.id}
                              className={`agent-node ${isRunning || isDone || isInMission ? 'active' : 'idle'}`}
                              style={{
                                color: nodeColor ?? 'var(--text-muted)',
                                background: isRunning ? `${color}18` : isDone ? 'rgba(34,197,94,.08)' : isInMission ? `${color}08` : undefined,
                                borderColor: isRunning ? color : isDone ? '#22c55e' : isInMission ? `${color}40` : undefined,
                              }}
                              animate={isRunning ? {
                                boxShadow: [`0 0 0 0px ${color}40`, `0 0 0 6px ${color}00`],
                              } : {}}
                              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeOut' }}
                              title={`${agent.name} — ${agent.role}`}
                            >
                              <span style={{ fontSize: 8, fontWeight: 800 }}>{agent.initial}</span>
                              {isRunning && (
                                <motion.div
                                  animate={{ opacity: [1, 0, 1] }}
                                  transition={{ repeat: Infinity, duration: 0.6 }}
                                  style={{ position: 'absolute', bottom: 2, right: 2, width: 4, height: 4, borderRadius: '50%', background: '#22c55e' }}
                                />
                              )}
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />

              {/* ── TOKEN STREAM (active agent) ── */}
              {state === 'running' && (
                <div style={{ padding: '14px 16px 10px', flexShrink: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>
                    Saída em tempo real
                  </div>
                  {runningAgents.map(a => (
                    <div key={a.agentId} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, background: `${a.color}20`, border: `1px solid ${a.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: a.color }}>
                          {a.agentId.slice(0, 2)}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text)' }}>{a.agentName}</span>
                        <motion.div
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                          style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', marginLeft: 'auto' }}
                        />
                      </div>
                      <div
                        ref={feedRef}
                        style={{
                          fontFamily: "'DM Mono',monospace",
                          fontSize: 10,
                          color: 'var(--text-muted)',
                          lineHeight: 1.6,
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          padding: '8px 10px',
                          maxHeight: 120,
                          overflowY: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {currentToken || ''}
                        {currentToken && (
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ repeat: Infinity, duration: 0.5 }}
                            style={{ display: 'inline-block', width: 6, height: 12, background: 'var(--text-muted)', marginLeft: 2, verticalAlign: 'middle' }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── COMPLETED STEPS ── */}
              {completedSteps.length > 0 && (
                <>
                  <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>
                      Concluídos ({completedSteps.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[...completedSteps].reverse().map((step, i) => (
                        <motion.div
                          key={`${step.agentId}-${i}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}
                        >
                          <div style={{ width: 18, height: 18, borderRadius: 4, background: `${step.color}15`, border: `1px solid ${step.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: step.color, flexShrink: 0, marginTop: 1 }}>
                            {step.agentId.slice(0, 2)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{step.agentName}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {step.output.slice(0, 120)}{step.output.length > 120 ? '…' : ''}
                            </div>
                          </div>
                          <i className="fa-solid fa-check" style={{ fontSize: 8, color: '#22c55e', marginTop: 4, flexShrink: 0 }} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* IDLE state */}
              {state === 'idle' && completedSteps.length === 0 && (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  <div style={{ fontSize: 11, marginBottom: 4 }}>Nenhuma missão ativa</div>
                  <div style={{ fontSize: 10 }}>Inicie uma missão para ver os agentes trabalhando</div>
                </div>
              )}
            </div>

            {/* Footer stats */}
            {state !== 'idle' && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, flexShrink: 0 }}>
                {[
                  { label: 'Tokens', value: formatTokens(totalTokens), mono: true },
                  { label: 'Custo', value: `$${costUsd.toFixed(4)}`, mono: true },
                  { label: 'Status', value: state === 'running' ? 'Rodando' : state === 'completed' ? 'Completo' : 'Erro' },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1 }}>
                    <div style={{ fontSize: 8, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontFamily: s.mono ? "'DM Mono',monospace" : undefined }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
