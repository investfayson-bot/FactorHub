'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { AGENTS_V2 } from '@/lib/agents-v2'
import PageHeader from '@/components/layout/PageHeader'

type Mission = {
  id: string
  title: string
  level: string
  status: string
  created_at: string
  total_tokens: number
  cost_usd: number
  agents_used: string[]
}

const LEVEL_COLORS: Record<string, string> = {
  N1: '#3ecf8e', N2: '#84cc16', N3: '#eab308', N4: '#f59e0b', N5: '#f44336',
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#888', running: '#f59e0b', completed: '#3ecf8e', awaiting_approval: '#f59e0b',
  approved: '#3ecf8e', archived: '#64748b', error: '#f44336',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho', running: 'Em andamento', completed: 'Aguard. Aprovação',
  awaiting_approval: 'Aguard. Aprovação', approved: 'Aprovada', archived: 'Arquivada', error: 'Erro',
}

// Kanban columns by status
const KANBAN_COLS: { id: string; label: string; color: string; match: string[] }[] = [
  { id: 'draft',    label: 'Rascunho',    color: '#888888', match: ['draft'] },
  { id: 'running',  label: 'Em Andamento', color: '#f59e0b', match: ['running'] },
  { id: 'review',   label: 'Aprovação',   color: '#84cc16', match: ['completed', 'awaiting_approval'] },
  { id: 'approved', label: 'Aprovada',    color: '#3ecf8e', match: ['approved'] },
  { id: 'archived', label: 'Arquivada',   color: '#555555', match: ['archived', 'error'] },
]

function btnStyle(color: string): React.CSSProperties {
  return { fontSize: 9, fontWeight: 700, padding: '4px 8px', borderRadius: 5, background: `${color}18`, color, border: `1px solid ${color}40`, cursor: 'pointer', fontFamily: 'inherit' }
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

async function getToken() {
  const { data: sess } = await supabase.auth.getSession()
  return sess.session?.access_token ?? ''
}

async function patchMissionStatus(id: string, status: string) {
  const token = await getToken()
  return fetch('/api/hub/missions-list', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ missionId: id, status }),
  })
}

export default function TarefasPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const token = await getToken()
    const res = await fetch('/api/hub/missions-list', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.ok) {
      const data = await res.json()
      setMissions(data.missions ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  async function act(id: string, status: string) {
    setBusyId(id)
    await patchMissionStatus(id, status)
    await carregar()
    setBusyId(null)
  }

  const filtered = missions.filter(m =>
    (!filterStatus || m.status === filterStatus) &&
    (!filterLevel || m.level === filterLevel)
  )

  const totais = {
    total: missions.length,
    concluidas: missions.filter(m => m.status === 'completed' || m.status === 'approved').length,
    rodando: missions.filter(m => m.status === 'running').length,
    tokens: missions.reduce((s, m) => s + (m.total_tokens ?? 0), 0),
    custo: missions.reduce((s, m) => s + Number(m.cost_usd ?? 0), 0),
  }

  const levels = Array.from(new Set(missions.map(m => m.level))).sort()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <PageHeader
        title="Tarefas"
        subtitle={`Histórico de missões executadas pelos agentes — ${missions.length} no total`}
        action={
          <a href="/dashboard/missoes" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <i className="fa-solid fa-rocket" style={{ fontSize: 11 }} />Nova Missão
          </a>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {[
          { label: 'Total de missões', value: totais.total, color: '#e8622a', icon: 'fa-rocket' },
          { label: 'Concluídas', value: totais.concluidas, color: '#22c55e', icon: 'fa-circle-check' },
          { label: 'Em execução', value: totais.rodando, color: '#f59e0b', icon: 'fa-bolt' },
          { label: 'Total tokens', value: totais.tokens.toLocaleString('pt-BR'), color: '#3ecf8e', icon: 'fa-coins', mono: true },
          { label: 'Custo (USD)', value: `$${totais.custo.toFixed(4)}`, color: '#84cc16', icon: 'fa-dollar-sign', mono: true },
        ].map(k => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${k.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`fa-solid ${k.icon}`} style={{ fontSize: 11, color: k.color }} />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: k.mono ? "'DM Mono',monospace" : undefined, lineHeight: 1.1 }}>{k.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{k.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          className="form-input form-select"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ width: 'auto', minWidth: 160, fontSize: 12 }}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <select
          className="form-input form-select"
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value)}
          style={{ width: 'auto', minWidth: 120, fontSize: 12 }}
        >
          <option value="">Todos os níveis</option>
          {levels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length} missão{filtered.length !== 1 ? 'ões' : ''}
        </span>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div style={{ padding: 50, display: 'flex', justifyContent: 'center' }}>
          <motion.div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
        </div>
      ) : missions.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-rocket" style={{ fontSize: 28, marginBottom: 12, display: 'block', opacity: 0.2 }} />
          <div style={{ fontSize: 13, marginBottom: 8 }}>Nenhuma missão ainda</div>
          <a href="/dashboard/missoes" className="btn btn-primary" style={{ textDecoration: 'none' }}>Iniciar primeira missão</a>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, alignItems: 'start' }}>
          {KANBAN_COLS.map(col => {
            const colItems = filtered.filter(m => col.match.includes(m.status))
            return (
              <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 2px' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{col.label}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)', marginLeft: 'auto' }}>{colItems.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {colItems.map(m => {
                    const open = expanded === m.id
                    const lvColor = LEVEL_COLORS[m.level] ?? '#e8622a'
                    return (
                      <motion.div
                        key={m.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setExpanded(open ? null : m.id)}
                        whileHover={{ y: -1 }}
                        style={{ background: 'var(--surface)', border: `1px solid ${open ? col.color + '60' : 'var(--border)'}`, borderRadius: 8, padding: '10px 11px', cursor: 'pointer', transition: 'border-color .15s' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 3, background: `${lvColor}1f`, color: lvColor }}>{m.level}</span>
                          <span style={{ fontSize: 8, color: 'var(--text-dim)', marginLeft: 'auto', fontFamily: "'DM Mono',monospace" }}>{timeAgo(m.created_at)}</span>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, marginBottom: 6 }}>{m.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 8.5, color: 'var(--text-dim)' }}>
                          <span>{m.agents_used?.length ?? 0} agentes</span>
                          {Number(m.cost_usd) > 0 && <span style={{ fontFamily: "'DM Mono',monospace" }}>${Number(m.cost_usd).toFixed(4)}</span>}
                        </div>

                        {/* Expanded: agents + actions */}
                        <AnimatePresence>
                          {open && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
                                {(m.agents_used ?? []).map(aid => {
                                  const a = AGENTS_V2[aid]
                                  return <div key={aid} title={a?.name ?? aid} style={{ width: 18, height: 18, borderRadius: 5, background: `${a?.color ?? '#888'}20`, border: `1px solid ${a?.color ?? '#888'}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: a?.color ?? '#888' }}>{a?.initial ?? aid.slice(0, 2)}</div>
                                })}
                              </div>
                              {/* ACTION BUTTONS per status */}
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {(m.status === 'completed' || m.status === 'awaiting_approval') && (
                                  <button onClick={() => act(m.id, 'approved')} disabled={busyId === m.id} style={btnStyle('#3ecf8e')}><i className="fa-solid fa-check" style={{ fontSize: 8, marginRight: 3 }} />Aprovar</button>
                                )}
                                {m.status === 'archived'
                                  ? <button onClick={() => act(m.id, 'draft')} disabled={busyId === m.id} style={btnStyle('#a855f7')}><i className="fa-solid fa-rotate-left" style={{ fontSize: 8, marginRight: 3 }} />Reativar</button>
                                  : <button onClick={() => act(m.id, 'archived')} disabled={busyId === m.id} style={btnStyle('#888')}>Arquivar</button>
                                }
                                {m.status === 'approved' && (
                                  <button onClick={() => { window.location.href = `/dashboard/projetos?from=missao&nome=${encodeURIComponent(m.title)}` }} style={btnStyle('#3ecf8e')}><i className="fa-solid fa-diagram-project" style={{ fontSize: 8, marginRight: 3 }} />Virar Projeto</button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                  {colItems.length === 0 && (
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0', border: '1px dashed var(--border)', borderRadius: 7 }}>vazio</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
