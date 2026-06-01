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
  N1: '#3ecf8e', N2: '#2dd4bf', N3: '#eab308', N4: '#f59e0b', N5: '#f44336',
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#888', running: '#f59e0b', completed: '#3ecf8e', awaiting_approval: '#f59e0b',
  approved: '#3ecf8e', archived: '#64748b', error: '#f44336',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho', running: 'Em andamento', completed: 'Aguard. Aprovação',
  awaiting_approval: 'Aguard. Aprovação', approved: 'Aprovada', archived: 'Arquivada', error: 'Erro',
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
          { label: 'Custo (USD)', value: `$${totais.custo.toFixed(4)}`, color: '#0d9488', icon: 'fa-dollar-sign', mono: true },
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

      {/* Mission list */}
      <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 50, display: 'flex', justifyContent: 'center' }}>
            <motion.div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-rocket" style={{ fontSize: 28, marginBottom: 12, display: 'block', opacity: 0.2 }} />
            <div style={{ fontSize: 13, marginBottom: 8 }}>Nenhuma missão encontrada</div>
            <a href="/dashboard/missoes" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              Iniciar primeira missão →
            </a>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((m, i) => {
              const open = expanded === m.id
              const color = LEVEL_COLORS[m.level] ?? '#e8622a'
              const stColor = STATUS_COLORS[m.status] ?? '#64748b'
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                  style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}
                >
                  <motion.div
                    onClick={() => setExpanded(open ? null : m.id)}
                    whileHover={{ backgroundColor: 'var(--surface-2)' }}
                    transition={{ duration: 0.1 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer' }}
                  >
                    {/* Level badge */}
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, border: `1.5px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: 0.5 }}>{m.level}</span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {m.agents_used?.length ?? 0} agente{(m.agents_used?.length ?? 0) !== 1 ? 's' : ''}
                        </span>
                        {m.total_tokens > 0 && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>
                            {m.total_tokens.toLocaleString()} tk
                          </span>
                        )}
                        {Number(m.cost_usd) > 0 && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>
                            ${Number(m.cost_usd).toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <motion.div
                        animate={m.status === 'running' ? { opacity: [1, 0.4, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, background: `${stColor}15`, color: stColor, padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}
                      >
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: stColor }} />
                        {STATUS_LABELS[m.status] ?? m.status}
                      </motion.div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace", minWidth: 50, textAlign: 'right' }}>
                        {timeAgo(m.created_at)}
                      </span>
                      <motion.i
                        className="fa-solid fa-chevron-down"
                        animate={{ rotate: open ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ fontSize: 10, color: 'var(--text-dim)' }}
                      />
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0 16px 16px 64px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                            Agentes executados
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: m.status === 'archived' ? 12 : 0 }}>
                            {(m.agents_used ?? []).map(aid => {
                              const a = AGENTS_V2[aid]
                              return (
                                <div key={aid} style={{ display: 'flex', alignItems: 'center', gap: 5, background: `${a?.color ?? '#e8622a'}12`, border: `1px solid ${a?.color ?? '#e8622a'}30`, borderRadius: 6, padding: '4px 8px' }}>
                                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: `${a?.color ?? '#e8622a'}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: a?.color ?? '#e8622a' }}>
                                    {a?.initial ?? aid.slice(0, 2)}
                                  </div>
                                  <span style={{ fontSize: 10, fontWeight: 600, color: a?.color ?? '#e8622a' }}>
                                    {a?.name ?? aid}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                          {m.status === 'archived' && (
                            <button
                              onClick={async () => {
                                setBusyId(m.id)
                                await patchMissionStatus(m.id, 'draft')
                                await carregar()
                                setBusyId(null)
                              }}
                              disabled={busyId === m.id}
                              style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, background: 'rgba(139,92,246,.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,.3)', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              <i className="fa-solid fa-rotate-left" style={{ fontSize: 9, marginRight: 5 }} />
                              {busyId === m.id ? 'Reativando...' : 'Reativar missão'}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  )
}
