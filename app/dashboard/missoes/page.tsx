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

function AgentOutputPanel({
  steps, currentAgentId, currentToken,
}: {
  steps: Array<{ agentId: string; agentName: string; color: string; output: string }>
  currentAgentId: string | null
  currentToken: string
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const userScrolledUp = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-follow active agent
  useEffect(() => {
    if (currentAgentId) {
      setSelected(currentAgentId)
      userScrolledUp.current = false
    }
  }, [currentAgentId])

  // Auto-scroll only if user hasn't manually scrolled up
  useEffect(() => {
    if (!userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [currentToken, selected])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
    userScrolledUp.current = !atBottom
  }

  function scrollToBottom() {
    userScrolledUp.current = false
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const activeStep = selected ? steps.find(s => s.agentId === selected) : null
  const isCurrentlyStreaming = selected === currentAgentId

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Agent tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {steps.map(s => (
          <button key={s.agentId} onClick={() => { setSelected(s.agentId); userScrolledUp.current = false }}
            style={{
              padding: '3px 8px', borderRadius: 5,
              background: selected === s.agentId ? `${s.color}20` : 'var(--surface-3)',
              border: `0.5px solid ${selected === s.agentId ? `${s.color}60` : 'var(--border)'}`,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: selected === s.agentId ? s.color : 'var(--text-muted)' }}>
              {s.agentName}
            </span>
          </button>
        ))}
        {currentAgentId && !steps.find(s => s.agentId === currentAgentId) && (
          <button onClick={() => { setSelected(currentAgentId); userScrolledUp.current = false }}
            style={{ padding: '3px 8px', borderRadius: 5, background: 'var(--accent-dim)', border: '0.5px solid var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)' }}>
              {AGENTS_V2[currentAgentId]?.name ?? currentAgentId} ●
            </span>
          </button>
        )}
      </div>

      {/* Output area with manual scroll */}
      <div ref={scrollRef} onScroll={handleScroll} style={{
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

      {/* Scroll-to-bottom button */}
      <AnimatePresence>
        {userScrolledUp.current && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            style={{
              position: 'absolute', bottom: 8, right: 8,
              padding: '6px 12px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <i className="fa-solid fa-arrow-down" style={{ fontSize: 9 }} />
            Ir para live
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Status maps ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  running: 'Em Andamento',
  completed: 'Aguard. Aprovação',
  awaiting_approval: 'Aguard. Aprovação',
  approved: 'Aprovada',
  archived: 'Arquivada',
  error: 'Erro',
}
const STATUS_COLORS: Record<string, string> = {
  draft: '#8b5cf6',
  running: '#f59e0b',
  completed: '#3b82f6',
  awaiting_approval: '#3b82f6',
  approved: '#10b981',
  archived: '#6b7280',
  error: '#ef4444',
}

// ─── History Table ────────────────────────────────────────────────────────────

function HistoryTable({
  missions,
  onReactivate,
  onDelete,
}: {
  missions: MissionRecord[]
  onReactivate: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
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
                    {isArchived && !isDeleting && (
                      <button
                        onClick={() => void handleReactivate(m.id)}
                        disabled={isBusy}
                        style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(139,92,246,.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,.3)', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {isBusy ? '...' : 'Reativar'}
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
  } = useMission()

  const [uploadMsg, setUploadMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
    <div style={{ padding: '20px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── IDLE ── */}
      <AnimatePresence>
        {state === 'idle' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Nova Missão</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Descreva o que precisa analisar, planejar ou executar. Pode incluir documentos e transcrições.</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {uploadMsg && <span style={{ fontSize: 11, color: uploadMsg.includes('Erro') ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{uploadMsg}</span>}
                  <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.csv" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = '' }} />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-muted)', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {uploading
                      ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 10 }} />Extraindo...</>
                      : <><i className="fa-solid fa-paperclip" style={{ fontSize: 11 }} />Anexar</>}
                  </button>
                </div>
              </div>
              <textarea value={missionText} onChange={e => setMissionText(e.target.value)}
                placeholder="Ex: Quero lançar um produto de assinatura para PMEs brasileiras. Analise viabilidade, mercado e monte um plano de lançamento."
                style={{ width: '100%', minHeight: 120, resize: 'vertical', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
            </div>

            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 12 }}>Profundidade de Análise</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.keys(MISSION_LEVELS).map(id => (
                  <LevelCard key={id} id={id} selected={selectedLevel === id} onClick={() => setSelectedLevel(id)} />
                ))}
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 12 }}>
                Agentes Ativados — {MISSION_LEVELS[selectedLevel].label}
              </div>
              <AgentPreview level={selectedLevel} />
            </div>

            <button onClick={startMission} disabled={!missionText.trim()}
              style={{ padding: '14px 24px', borderRadius: 10, background: missionText.trim() ? 'var(--accent)' : 'var(--surface-3)', color: missionText.trim() ? '#fff' : 'var(--text-dim)', border: 'none', cursor: missionText.trim() ? 'pointer' : 'default', fontSize: 14, fontWeight: 800, fontFamily: 'inherit', transition: 'all .15s' }}>
              <i className="fa-solid fa-rocket" style={{ marginRight: 8 }} />
              Iniciar Missão {selectedLevel}
            </button>
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
                style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700 }}>
                <i className="fa-solid fa-check" style={{ marginRight: 6 }} />Aprovar e salvar
              </button>
              <button onClick={archiveMission}
                style={{ padding: '12px 20px', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
                Arquivar
              </button>
              <button onClick={newMission}
                style={{ padding: '12px 20px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700 }}>
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
          <button onClick={newMission} style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--text)' }}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── History ── */}
      {state === 'idle' && (
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 14 }}>Histórico de Missões</div>
          <HistoryTable missions={missions} onReactivate={reactivateMission} onDelete={deleteMission} />
        </div>
      )}
    </div>
  )
}
