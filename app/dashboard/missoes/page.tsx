'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MISSION_LEVELS, AGENTS_V2, getAllAgentsInLevel } from '@/lib/agents-v2'
import { useMission, type PhaseState, type MissionRecord } from '../mission-context'

// ─── Level Card ───────────────────────────────────────────────────────────────

function LevelCard({ id, selected, onClick }: { id: string; selected: boolean; onClick: () => void }) {
  const ml = MISSION_LEVELS[id]
  const agents = getAllAgentsInLevel(id)
  return (
    <button onClick={onClick} style={{
      padding: '12px 14px', borderRadius: 10,
      border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
      background: selected ? 'var(--accent-dim)' : 'var(--surface-2)',
      cursor: 'pointer', textAlign: 'left', flex: 1, minWidth: 120,
      transition: 'all .15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: selected ? 'var(--accent)' : 'var(--text)' }}>{id}</span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>· {ml.estimatedMinutes}min</span>
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: selected ? 'var(--accent)' : 'var(--text-muted)', marginBottom: 4 }}>{ml.label}</div>
      <div style={{ fontSize: 9, color: 'var(--text-dim)' }}>{agents.length} agentes</div>
    </button>
  )
}

// ─── Agent Preview ────────────────────────────────────────────────────────────

function AgentPreview({ level }: { level: string }) {
  const ml = MISSION_LEVELS[level]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ml.chains.map((phase, pi) => (
        <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', minWidth: 50 }}>Fase {pi + 1}</span>
          {phase.map(agentId => {
            const a = AGENTS_V2[agentId]
            return (
              <div key={agentId} style={{
                padding: '2px 7px', borderRadius: 4,
                background: a ? `${a.color}15` : 'var(--surface-3)',
                border: `0.5px solid ${a ? `${a.color}40` : 'var(--border)'}`,
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: a?.color ?? 'var(--text-muted)' }}>{a?.name ?? agentId}</span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Phase Timeline ───────────────────────────────────────────────────────────

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
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .3s',
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
              {phase.status === 'running' && <span style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 600 }}>em execução...</span>}
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {phase.agents.map((a) => (
                <div key={a.agentId} style={{
                  padding: '2px 6px', borderRadius: 4,
                  background: a.status === 'done' ? `${a.color}18` : a.status === 'running' ? `${a.color}30` : 'var(--surface-3)',
                  border: `0.5px solid ${a.status === 'waiting' ? 'var(--border)' : `${a.color}50`}`, transition: 'all .3s',
                }}>
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

// ─── Agent Output Panel (with manual scroll control) ─────────────────────────

// ─── Agent Plan List (Claude Code style) ────────────────────────────────────

function AgentOutputPanel({
  steps, currentAgentId, currentToken,
}: {
  steps: Array<{ agentId: string; agentName: string; color: string; output: string }>
  currentAgentId: string | null
  currentToken: string
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const liveScrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll the live stream only — never interrupt user reading other outputs
  useEffect(() => {
    if (liveScrollRef.current) {
      liveScrollRef.current.scrollTop = liveScrollRef.current.scrollHeight
    }
  }, [currentToken])

  // Show live agent at top if not in completed steps
  const liveAgent = currentAgentId && !steps.find(s => s.agentId === currentAgentId)
    ? AGENTS_V2[currentAgentId]
    : null

  function statusIcon(agentId: string) {
    if (agentId === currentAgentId) return (
      <motion.div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <motion.div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />
      </motion.div>
    )
    return <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><i className="fa-solid fa-check" style={{ fontSize: 7, color: '#fff' }} /></div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Live streaming agent — always pinned at top */}
      <AnimatePresence>
        {liveAgent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ borderBottom: '1px solid var(--border)', flexShrink: 0, overflow: 'hidden' }}
          >
            <div style={{ padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <motion.div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${liveAgent.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <motion.div style={{ width: 6, height: 6, borderRadius: '50%', background: liveAgent.color }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />
                </motion.div>
                <span style={{ fontSize: 11, fontWeight: 700, color: liveAgent.color }}>{liveAgent.name}</span>
                <span style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 600 }}>escrevendo...</span>
              </div>
              <div ref={liveScrollRef} style={{ maxHeight: 120, overflow: 'hidden', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.7, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '8px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                {currentToken || ''}
                <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} style={{ display: 'inline-block', width: 2, height: 12, background: liveAgent.color, marginLeft: 2, verticalAlign: 'text-bottom' }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completed steps — user controls scroll, no interruption */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {steps.length === 0 && !liveAgent && (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
            Aguardando agentes...
          </div>
        )}

        {[...steps].reverse().map((step, i) => {
          const agent = AGENTS_V2[step.agentId]
          const isExpanded = expanded === step.agentId
          return (
            <motion.div
              key={step.agentId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : step.agentId)}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit' }}
              >
                {statusIcon(step.agentId)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{step.agentName}</div>
                  {!isExpanded && (
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                      {step.output.slice(0, 80)}...
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: `${step.color}15`, color: step.color }}>{agent?.layer}</span>
                  <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: 8, color: 'var(--text-dim)' }} />
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '0 12px 12px 38px', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 400, overflowY: 'auto', borderLeft: `2px solid ${step.color}40`, marginLeft: 18 }}>
                      {step.output}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Status maps ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  running: 'Em Andamento',
  completed: 'Concluída',
  awaiting_approval: 'Aguard. Aprovação',
  approved: 'Aprovada',
  archived: 'Arquivada',
  error: 'Erro',
}
const STATUS_COLORS: Record<string, string> = {
  draft: '#8b5cf6',
  running: '#f59e0b',
  completed: '#3ecf8e',
  awaiting_approval: '#3ecf8e',
  approved: '#10b981',
  archived: '#6b7280',
  error: '#ef4444',
}

// ─── History Table ────────────────────────────────────────────────────────────

function HistoryTable({
  missions,
  onReactivate,
  onDelete,
  onRerun,
}: {
  missions: MissionRecord[]
  onReactivate: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRerun: (title: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  if (!missions.length) return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      Nenhuma missão ainda. Inicie sua primeira missão acima.
    </div>
  )

  async function handleReactivate(id: string) {
    setBusy(id)
    await onReactivate(id)
    setBusy(null)
  }

  async function handleDelete(id: string) {
    setBusy(id)
    await onDelete(id)
    setBusy(null)
    setConfirmDelete(null)
  }

  return (
    <div style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Missão', 'Nível', 'Status', 'Agentes', 'Tokens', 'Custo', 'Data', ''].map(h => (
              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-muted)', letterSpacing: '.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {missions.map((m) => {
            const stColor = STATUS_COLORS[m.status] ?? '#666'
            const stLabel = STATUS_LABELS[m.status] ?? m.status
            const isArchived = m.status === 'archived'
            const isDeleting = confirmDelete === m.id
            const isBusy = busy === m.id
            return (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--border)', opacity: isArchived ? 0.7 : 1 }}>
                <td style={{ padding: '10px', maxWidth: 260 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                </td>
                <td style={{ padding: '10px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'var(--accent-dim)', color: 'var(--accent)' }}>{m.level}</span>
                </td>
                <td style={{ padding: '10px' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${stColor}15`, color: stColor }}>{stLabel}</span>
                </td>
                <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{m.agents_used?.length ?? '—'}</td>
                <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{m.total_tokens?.toLocaleString() ?? '—'}</td>
                <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{m.cost_usd ? `$${Number(m.cost_usd).toFixed(4)}` : '—'}</td>
                <td style={{ padding: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(m.created_at).toLocaleDateString('pt-BR')}</td>
                <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {/* Running/stuck — force cancel */}
                    {m.status === 'running' && !isDeleting && (
                      <button
                        onClick={() => void handleReactivate(m.id)}
                        disabled={isBusy}
                        title="Cancelar missão travada"
                        style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(239,68,68,.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,.25)', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {isBusy ? '...' : <><i className="fa-solid fa-stop" style={{ fontSize: 8, marginRight: 4 }} />Parar</>}
                      </button>
                    )}
                    {/* Archived — reactivate to draft */}
                    {isArchived && !isDeleting && (
                      <button
                        onClick={() => void handleReactivate(m.id)}
                        disabled={isBusy}
                        style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(139,92,246,.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,.3)', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {isBusy ? '...' : 'Reativar'}
                      </button>
                    )}
                    {/* Draft — re-run immediately */}
                    {m.status === 'draft' && !isDeleting && (
                      <button
                        onClick={() => onRerun(m.title)}
                        style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(16,185,129,.15)', color: '#10b981', border: '1px solid rgba(16,185,129,.3)', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        <i className="fa-solid fa-play" style={{ fontSize: 8, marginRight: 4 }} />Re-executar
                      </button>
                    )}
                    {!isDeleting ? (
                      <button
                        onClick={() => setConfirmDelete(m.id)}
                        disabled={isBusy}
                        style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, background: 'transparent', color: 'var(--text-dim)', border: '1px solid transparent', cursor: 'pointer', fontFamily: 'inherit' }}
                        title="Deletar missão"
                      >
                        <i className="fa-solid fa-trash" style={{ fontSize: 9 }} />
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Confirmar?</span>
                        <button
                          onClick={() => void handleDelete(m.id)}
                          disabled={isBusy}
                          style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          {isBusy ? '...' : 'Sim'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Não
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MissoesPage() {
  const {
    missionText, setMissionText,
    selectedLevel, setSelectedLevel,
    state, phases, completedSteps,
    currentAgentId, currentToken,
    summary, totalTokens, costUsd, errorMsg,
    missions,
    startMission, cancelMission, newMission,
    approveMission, archiveMission,
    reactivateMission, deleteMission,
    loadMissions,
  } = useMission()

  const [uploadMsg, setUploadMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [forceCancelling, setForceCancelling] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Receber prefill de Ideias
  useEffect(() => {
    const prefill = sessionStorage.getItem('factohub-mission-prefill')
    if (prefill) { setMissionText(prefill); sessionStorage.removeItem('factohub-mission-prefill') }
  }, [setMissionText])

  // Missões travadas no DB (running no DB mas React state = idle)
  const stuckMissions = state === 'idle'
    ? missions.filter(m => m.status === 'running')
    : []

  async function forceCancel(missionId: string) {
    setForceCancelling(missionId)
    try {
      const token = await getToken()
      await fetch('/api/hub/missions-list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ missionId, status: 'archived' }),
      })
      await loadMissions()
    } catch { /* ignore */ }
    setForceCancelling(null)
  }

  async function getToken() {
    const { supabase } = await import('@/lib/supabase')
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? ''
  }

  async function handleFileUpload(file: File) {
    setUploading(true)
    setUploadMsg('Extraindo texto…')
    try {
      const token = await getToken()
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/hub/extract-text', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      const json = await res.json()
      if (json.text) {
        const extracted = (json.text as string).trim().slice(0, 4000)
        setMissionText(missionText ? `${missionText}\n\n---\n${extracted}` : extracted)
        setUploadMsg('Texto adicionado!')
        setTimeout(() => setUploadMsg(''), 3000)
      } else {
        setUploadMsg(json.error ?? 'Falha na extração')
        setTimeout(() => setUploadMsg(''), 4000)
      }
    } catch {
      setUploadMsg('Erro no upload')
      setTimeout(() => setUploadMsg(''), 3000)
    } finally {
      setUploading(false)
    }
  }

  const card: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20,
  }

  return (
    <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── STUCK MISSIONS BANNER ── */}
      <AnimatePresence>
        {stuckMissions.map(m => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 10,
              background: 'rgba(239,68,68,.08)',
              border: '1px solid rgba(239,68,68,.25)',
            }}
          >
            <motion.div
              style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 0.9 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>Missão travada detectada</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.level} · {m.title || 'Sem título'} · iniciada em {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <button
              onClick={() => void forceCancel(m.id)}
              disabled={forceCancelling === m.id}
              style={{
                padding: '6px 14px', borderRadius: 7,
                background: 'rgba(239,68,68,.15)',
                border: '1px solid rgba(239,68,68,.3)',
                color: '#ef4444', cursor: forceCancelling === m.id ? 'not-allowed' : 'pointer',
                fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {forceCancelling === m.id
                ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 10 }} />Cancelando...</>
                : <><i className="fa-solid fa-xmark" style={{ fontSize: 10 }} />Cancelar</>
              }
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Active mission control bar (always visible when running) ── */}
      {state === 'running' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 10,
          background: 'rgba(34,197,94,.06)',
          border: '1px solid rgba(34,197,94,.2)',
        }}>
          <motion.div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} />
          <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#22c55e' }}>
            Missão {selectedLevel} em execução
            {currentAgentId && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
              ● {AGENTS_V2[currentAgentId]?.name ?? currentAgentId} processando...
            </span>}
          </div>
          <button
            onClick={cancelMission}
            style={{
              padding: '5px 12px', borderRadius: 6,
              background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)',
              color: '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <i className="fa-solid fa-stop" style={{ fontSize: 9 }} />Parar missão
          </button>
        </div>
      )}

      {/* ── IDLE ── */}
      <AnimatePresence>
        {state === 'idle' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Hero header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '24px 28px', borderRadius: 14, background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -20, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(62,207,142,.08) 0%, transparent 70%)' }} />
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="fa-solid fa-rocket" style={{ fontSize: 22, color: 'var(--accent)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.5px', marginBottom: 4 }}>Nova Missão</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Descreva o que precisa analisar, planejar ou executar. Seus 27 agentes vão trabalhar em cadeia até a síntese executiva.</div>
              </div>
            </div>

            {/* 2-column: textarea left, config right */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, alignItems: 'start' }}>

              {/* LEFT — textarea */}
              <div style={{ ...card, padding: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Briefing da Missão</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {uploadMsg && <span style={{ fontSize: 11, color: uploadMsg.includes('Erro') ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{uploadMsg}</span>}
                    <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.csv" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = '' }} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      style={{ padding: '5px 11px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-muted)', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {uploading
                        ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 10 }} />Extraindo...</>
                        : <><i className="fa-solid fa-paperclip" style={{ fontSize: 11 }} />Anexar PDF/TXT</>}
                    </button>
                  </div>
                </div>
                <textarea value={missionText} onChange={e => setMissionText(e.target.value)}
                  placeholder="Ex: Audite o site da VN Prime, identifique tudo que está pronto e o que precisa melhorar, e monte o roadmap de ferramentas que o FactorHub deve construir."
                  style={{ width: '100%', minHeight: 280, resize: 'vertical', background: 'transparent', border: 'none', padding: '16px 18px', fontSize: 14, color: 'var(--text)', fontFamily: 'inherit', outline: 'none', lineHeight: 1.7, boxSizing: 'border-box' }} />
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                  <button onClick={startMission} disabled={!missionText.trim()}
                    style={{ width: '100%', padding: '14px 24px', borderRadius: 10, background: missionText.trim() ? 'var(--accent)' : 'var(--surface-3)', color: missionText.trim() ? '#0a0812' : 'var(--text-dim)', border: 'none', cursor: missionText.trim() ? 'pointer' : 'default', fontSize: 15, fontWeight: 800, fontFamily: 'inherit', transition: 'all .15s' }}>
                    <i className="fa-solid fa-rocket" style={{ marginRight: 8 }} />
                    Iniciar Missão {selectedLevel}
                  </button>
                </div>
              </div>

              {/* RIGHT — level + agents */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={card}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Profundidade</div>
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.keys(MISSION_LEVELS).map(id => (
                      <LevelCard key={id} id={id} selected={selectedLevel === id} onClick={() => setSelectedLevel(id)} />
                    ))}
                  </div>
                </div>
                <div style={card}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Agentes — {MISSION_LEVELS[selectedLevel].label}
                  </div>
                  <div style={{ padding: 14 }}>
                    <AgentPreview level={selectedLevel} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RUNNING ── */}
      <AnimatePresence>
        {state === 'running' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, height: 'calc(100vh - 160px)' }}>
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>Execução em Cadeia</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{MISSION_LEVELS[selectedLevel].label} · {MISSION_LEVELS[selectedLevel].estimatedMinutes}min est.</div>
              </div>
              <PhaseTimeline phases={phases} />
              <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <button onClick={cancelMission}
                  style={{ width: '100%', padding: '8px', borderRadius: 7, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600 }}>
                  Cancelar missão
                </button>
              </div>
            </div>

            <div style={{ ...card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 12, flexShrink: 0 }}>
                Output em Tempo Real
                {currentAgentId && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: 'var(--accent)' }}>
                    ● {AGENTS_V2[currentAgentId]?.name ?? currentAgentId}
                  </span>
                )}
              </div>
              <AgentOutputPanel steps={completedSteps} currentAgentId={currentAgentId} currentToken={currentToken} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── COMPLETED ── */}
      <AnimatePresence>
        {state === 'completed' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'Status', value: 'Concluída', color: '#10b981' },
                { label: 'Nível', value: `${selectedLevel} · ${MISSION_LEVELS[selectedLevel].label}`, color: 'var(--accent)' },
                { label: 'Agentes', value: String(completedSteps.length), color: 'var(--text)' },
                { label: 'Tokens', value: totalTokens.toLocaleString(), color: 'var(--text)' },
                { label: 'Custo', value: `$${costUsd.toFixed(4)}`, color: 'var(--text)' },
              ].map(s => (
                <div key={s.label} style={{ ...card, flex: 1, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {summary && (
              <div style={{ ...card, borderColor: 'rgba(124,58,237,.3)', background: 'rgba(124,58,237,.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(124,58,237,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed' }}>CA</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Chief of Staff — Síntese Executiva</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Relatório final da missão</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'inherit', fontSize: 13, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{summary}</div>
              </div>
            )}

            <div style={{ ...card, height: 400, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '.05em', textTransform: 'uppercase', flexShrink: 0 }}>Outputs Completos</div>
              <AgentOutputPanel steps={completedSteps} currentAgentId={null} currentToken="" />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={approveMission}
                style={{ flex: 1, padding: '12px', borderRadius: 8, background: 'var(--green)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700 }}>
                <i className="fa-solid fa-check" style={{ marginRight: 6 }} />Aprovar
              </button>
              <button
                onClick={() => {
                  const text = encodeURIComponent(missionText.slice(0, 120))
                  window.location.href = `/dashboard/projetos?from=missao&nome=${text}`
                }}
                style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(99,102,241,.15)', color: '#3ecf8e', border: '1px solid rgba(99,102,241,.3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700 }}>
                <i className="fa-solid fa-diagram-project" style={{ marginRight: 6 }} />Criar Projeto
              </button>
              <button onClick={archiveMission}
                style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
                Arquivar
              </button>
              <button onClick={newMission}
                style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700 }}>
                Nova
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
          <button onClick={newMission} style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--text)' }}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── History ── */}
      {state === 'idle' && (
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 14 }}>Histórico de Missões</div>
          <HistoryTable
            missions={missions}
            onReactivate={reactivateMission}
            onDelete={deleteMission}
            onRerun={(title) => { setMissionText(title); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          />
        </div>
      )}
    </div>
  )
}
