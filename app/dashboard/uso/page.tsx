'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { AGENTS_V2 } from '@/lib/agents-v2'

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

type AgentStat = {
  agentId: string
  missions: number
  tokens: number
  cost: number
}

const LEVEL_COLORS: Record<string, string> = {
  N1: '#0d9488', N2: '#e8622a', N3: '#6366f1', N4: '#7c3aed', N5: '#dc2626',
}

async function getToken() {
  const { data: sess } = await supabase.auth.getSession()
  return sess.session?.access_token ?? ''
}

type DayStat = { day: string; cost: number; missions: number }
type ThresholdCfg = { alerts: boolean; value: number }

export default function UsoPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [threshold, setThreshold] = useState<ThresholdCfg>({ alerts: false, value: 10 })

  useEffect(() => {
    const stored = localStorage.getItem('fh_settings')
    if (stored) {
      try {
        const s = JSON.parse(stored) as { costAlerts?: boolean; costThreshold?: number }
        setThreshold({ alerts: s.costAlerts ?? false, value: s.costThreshold ?? 10 })
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    void (async () => {
      const token = await getToken()
      const res = await fetch('/api/hub/missions-list', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setMissions(data.missions ?? [])
      }
      setLoading(false)
    })()
  }, [])

  // Compute per-agent stats from agents_used arrays
  const agentStats: AgentStat[] = Object.values(AGENTS_V2).map(a => {
    const relevant = missions.filter(m => (m.agents_used ?? []).includes(a.id))
    const agentCount = missions.reduce((count, m) => {
      return count + (m.agents_used ?? []).filter(id => id === a.id).length
    }, 0)
    const estTokensPerAgent = relevant.reduce((s, m) => {
      const cnt = (m.agents_used ?? []).length || 1
      return s + (m.total_tokens ?? 0) / cnt
    }, 0)
    const estCostPerAgent = relevant.reduce((s, m) => {
      const cnt = (m.agents_used ?? []).length || 1
      return s + Number(m.cost_usd ?? 0) / cnt
    }, 0)
    return { agentId: a.id, missions: agentCount, tokens: Math.round(estTokensPerAgent), cost: estCostPerAgent }
  }).filter(s => s.missions > 0).sort((a, b) => b.missions - a.missions)

  // Per-level stats
  const levelStats = Object.entries(LEVEL_COLORS).map(([level, color]) => {
    const lm = missions.filter(m => m.level === level)
    return { level, color, count: lm.length, tokens: lm.reduce((s, m) => s + (m.total_tokens ?? 0), 0), cost: lm.reduce((s, m) => s + Number(m.cost_usd ?? 0), 0) }
  }).filter(l => l.count > 0)

  const totais = {
    missions: missions.length,
    tokens: missions.reduce((s, m) => s + (m.total_tokens ?? 0), 0),
    cost: missions.reduce((s, m) => s + Number(m.cost_usd ?? 0), 0),
    agents: agentStats.length,
  }

  const maxMissions = Math.max(...agentStats.map(s => s.missions), 1)

  // Monthly projection
  const today = new Date()
  const dayOfMonth = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const thisMonthMissions = missions.filter(m => {
    const d = new Date(m.created_at)
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  })
  const thisMonthCost = thisMonthMissions.reduce((s, m) => s + Number(m.cost_usd ?? 0), 0)
  const projectedMonthly = dayOfMonth > 0 ? (thisMonthCost / dayOfMonth) * daysInMonth : 0
  const todayCost = missions.filter(m => {
    const d = new Date(m.created_at)
    return d.toDateString() === today.toDateString()
  }).reduce((s, m) => s + Number(m.cost_usd ?? 0), 0)

  // Daily stats for last 14 days
  const dayStats: DayStat[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i))
    const key = d.toDateString()
    const dm = missions.filter(m => new Date(m.created_at).toDateString() === key)
    return { day: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), cost: dm.reduce((s, m) => s + Number(m.cost_usd ?? 0), 0), missions: dm.length }
  })
  const maxDayCost = Math.max(...dayStats.map(d => d.cost), 0.0001)

  const thresholdExceeded = threshold.alerts && todayCost > threshold.value

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Threshold alert */}
      {thresholdExceeded && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444', fontSize: 13 }} />
          <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
            Alerta de custo: ${todayCost.toFixed(4)} hoje (limite: ${threshold.value})
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>Verifique Configurações → Alertas</span>
        </motion.div>
      )}

      {/* KPIs */}
      <motion.div
        initial="hidden" animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}
      >
        {[
          { label: 'Missões executadas', value: totais.missions, icon: 'fa-rocket', color: '#e8622a' },
          { label: 'Agentes ativos', value: totais.agents, icon: 'fa-robot', color: '#6366f1' },
          { label: 'Total tokens', value: totais.tokens.toLocaleString('pt-BR'), icon: 'fa-coins', color: '#f59e0b', mono: true },
          { label: 'Custo estimado (USD)', value: `$${totais.cost.toFixed(4)}`, icon: 'fa-dollar-sign', color: '#22c55e', mono: true },
        ].map(k => (
          <motion.div key={k.label} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.3 }}>
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${k.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`fa-solid ${k.icon}`} style={{ fontSize: 13, color: k.color }} />
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', fontFamily: k.mono ? "'DM Mono',monospace" : undefined, marginBottom: 4 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Monthly projection + daily chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
        {/* Projection card */}
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Projeção Mensal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Hoje', value: `$${todayCost.toFixed(4)}`, color: todayCost > 0 ? '#f59e0b' : 'var(--text-muted)' },
              { label: `Este mês (${dayOfMonth}d)`, value: `$${thisMonthCost.toFixed(4)}`, color: 'var(--text)' },
              { label: `Projeção (${daysInMonth}d)`, value: `$${projectedMonthly.toFixed(4)}`, color: projectedMonthly > threshold.value ? '#ef4444' : '#22c55e' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: r.color, fontFamily: "'DM Mono',monospace" }}>{r.value}</span>
              </div>
            ))}
            <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((dayOfMonth / daysInMonth) * 100, 100)}%`, background: 'var(--accent)', borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', textAlign: 'right' }}>{Math.round((dayOfMonth / daysInMonth) * 100)}% do mês</div>
          </div>
        </motion.div>

        {/* Daily cost chart */}
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Custo por Dia — últimos 14 dias</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 64 }}>
            {dayStats.map((d, i) => {
              const pct = (d.cost / maxDayCost) * 100
              const isToday = i === 13
              return (
                <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}
                  title={`${d.day}: $${d.cost.toFixed(4)} · ${d.missions} missão${d.missions !== 1 ? 'ões' : ''}`}>
                  <div style={{ width: '100%', height: `${Math.max(pct, 2)}%`, background: isToday ? '#e8622a' : d.cost > 0 ? 'var(--accent)' : 'var(--surface-3)', borderRadius: '3px 3px 0 0', opacity: isToday ? 1 : 0.7, transition: 'height .3s', minHeight: d.cost > 0 ? 3 : 0 }} />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{dayStats[0].day}</span>
            <span style={{ fontSize: 9, color: '#e8622a', fontWeight: 700 }}>hoje</span>
          </div>
        </motion.div>
      </div>

      {/* Usage by Level */}
      {levelStats.length > 0 && (
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ padding: '16px 20px' }}>
          <div className="card-header" style={{ marginBottom: 14 }}>
            <span className="card-title">Missões por Nível</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {levelStats.map(l => (
              <div key={l.level} style={{ flex: 1, background: `${l.color}10`, border: `1px solid ${l.color}30`, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: l.color }}>{l.count}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: l.color, marginTop: 2 }}>{l.level}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, fontFamily: "'DM Mono',monospace" }}>
                  {l.tokens.toLocaleString()} tk
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Usage by Agent */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ overflow: 'hidden' }}>
        <div className="card-header">
          <span className="card-title">Consumo por Agente</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{agentStats.length} agente{agentStats.length !== 1 ? 's' : ''} com atividade</span>
        </div>
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <motion.div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
          </div>
        ) : agentStats.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <i className="fa-solid fa-chart-bar" style={{ fontSize: 28, marginBottom: 12, display: 'block', opacity: 0.2 }} />
            Nenhuma missão executada ainda.
          </div>
        ) : (
          <>
            <div style={{ padding: '12px 18px 6px' }}>
              {agentStats.slice(0, 15).map((s, i) => {
                const agent = AGENTS_V2[s.agentId]
                const pct = Math.round((s.missions / maxMissions) * 100)
                return (
                  <motion.div
                    key={s.agentId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `${agent?.color ?? '#e8622a'}20`, border: `1.5px solid ${agent?.color ?? '#e8622a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: agent?.color ?? '#e8622a', flexShrink: 0 }}>
                      {agent?.initial ?? s.agentId.slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>{agent?.name ?? s.agentId}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>
                          {s.missions}x · ~{s.tokens.toLocaleString()} tk
                        </span>
                      </div>
                      <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.2 + i * 0.04, duration: 0.5, ease: 'easeOut' }}
                          style={{ height: '100%', background: agent?.color ?? '#e8622a', borderRadius: 3 }}
                        />
                      </div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: agent?.color ?? '#e8622a', minWidth: 24, textAlign: 'right', letterSpacing: 0.3 }}>
                      {agent?.layer}
                    </span>
                  </motion.div>
                )
              })}
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', borderTop: '0.5px solid var(--border)' }}>
              <table className="crud-table">
                <thead>
                  <tr>
                    <th>Agente</th>
                    <th>Camada</th>
                    <th>Missões</th>
                    <th>Tokens (est.)</th>
                    <th>Custo est. (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {agentStats.map(s => {
                    const agent = AGENTS_V2[s.agentId]
                    return (
                      <tr key={s.agentId}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 24, height: 24, borderRadius: 5, background: `${agent?.color ?? '#e8622a'}20`, border: `1.5px solid ${agent?.color ?? '#e8622a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: agent?.color ?? '#e8622a' }}>
                              {agent?.initial ?? s.agentId.slice(0, 2)}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{agent?.name ?? s.agentId}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${agent?.color ?? '#e8622a'}15`, color: agent?.color ?? '#e8622a' }}>
                            {agent?.layer}
                          </span>
                        </td>
                        <td style={{ fontFamily: "'DM Mono',monospace", color: 'var(--text)', fontSize: 12 }}>{s.missions}</td>
                        <td style={{ fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)', fontSize: 11 }}>~{s.tokens.toLocaleString('pt-BR')}</td>
                        <td style={{ fontFamily: "'DM Mono',monospace", color: s.cost > 0.01 ? '#f59e0b' : 'var(--text-muted)', fontSize: 12 }}>~${s.cost.toFixed(4)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </motion.div>

      {/* Recent missions log */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ overflow: 'hidden' }}>
        <div className="card-header">
          <span className="card-title">Histórico de Missões</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>últimas {Math.min(missions.length, 50)}</span>
        </div>
        {missions.length === 0 && !loading ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Sem missões registradas ainda.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crud-table">
              <thead>
                <tr><th>Data</th><th>Missão</th><th>Nível</th><th>Agentes</th><th>Tokens</th><th>Custo (USD)</th></tr>
              </thead>
              <tbody>
                {missions.slice(0, 50).map((m, i) => {
                  const color = LEVEL_COLORS[m.level] ?? '#e8622a'
                  return (
                    <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.4) }}>
                      <td style={{ color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace", fontSize: 11 }}>
                        {new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${color}15`, color }}>{m.level}</span>
                      </td>
                      <td style={{ fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)', fontSize: 12 }}>{(m.agents_used ?? []).length}</td>
                      <td style={{ fontFamily: "'DM Mono',monospace", color: 'var(--text)', fontSize: 12 }}>{(m.total_tokens ?? 0).toLocaleString()}</td>
                      <td style={{ fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)', fontSize: 12 }}>${Number(m.cost_usd ?? 0).toFixed(4)}</td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
