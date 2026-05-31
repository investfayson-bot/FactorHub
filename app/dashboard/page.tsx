'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { AGENTS_V2 } from '@/lib/agents-v2'
import Link from 'next/link'

type Mission = { id: string; title: string; level: string; status: string; created_at: string; total_tokens: number; cost_usd: number; agents_used: string[] }
type Counts = { projetos: number; ideias: number; missoes: number; aprovados: number }

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ── Heatmap: tasks per (hour-bucket × weekday) ──────────────────────────────
const HOURS = ['22h', '18h', '14h', '10h', '6h', '2h']
const DAYS  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function buildHeatmap(items: { created_at: string }[]) {
  const grid: number[][] = Array.from({ length: 6 }, () => Array(7).fill(0))
  items.forEach(t => {
    const d = new Date(t.created_at)
    const dow = d.getDay()
    const bucket = Math.min(5, Math.floor(d.getHours() / 4))
    grid[5 - bucket][dow]++
  })
  return grid
}

function heatColor(v: number, max: number): string {
  if (v === 0) return '#1E2D40'
  const t = Math.min(v / Math.max(max, 1), 1)
  // teal palette: low → dark, high → bright teal
  const r = Math.round(20  + t * (20  - 20))
  const g = Math.round(45  + t * (184 - 45))
  const b = Math.round(64  + t * (166 - 64))
  return `rgb(${r},${g},${b})`
}

// ── Line chart: tasks per day last 12 days ───────────────────────────────────
function buildLineData(items: { created_at: string }[], days = 12) {
  const buckets: number[] = Array(days).fill(0)
  const now = Date.now()
  items.forEach(t => {
    const age = Math.floor((now - new Date(t.created_at).getTime()) / 86400000)
    if (age < days) buckets[days - 1 - age]++
  })
  return buckets
}

function SvgLine({ data, color, width = 420, height = 110 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (v / max) * (height - 14) - 6,
  }))
  const path = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = pts[i - 1]
    const cx = (prev.x + p.x) / 2
    return `${acc} C ${cx} ${prev.y} ${cx} ${p.y} ${p.x} ${p.y}`
  }, '')
  const fill = `${path} L ${pts[pts.length - 1].x} ${height} L 0 ${height} Z`
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#grad-${color.replace('#','')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => data[i] > 0 && (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
    </svg>
  )
}

const STATUS_COLORS: Record<string, string> = { completed: '#22C55E', running: '#F59E0B', approved: '#3b82f6', error: '#EF4444', archived: '#64748b' }
const STATUS_BG: Record<string, string> = { completed: 'rgba(34,197,94,.13)', running: 'rgba(245,158,11,.13)', approved: 'rgba(59,130,246,.13)', error: 'rgba(239,68,68,.13)' }
const STATUS_LABELS: Record<string, string> = { completed: 'Concluída', running: 'Em execução', approved: 'Aprovada', archived: 'Arquivada', error: 'Erro' }
const LEVEL_COLORS: Record<string, string> = { N1: '#0d9488', N2: '#e8622a', N3: '#6366f1', N4: '#7c3aed', N5: '#dc2626' }

const FEATURED_AGENTS = ['CEO', 'CFO', 'CMO', 'COO', 'CTO', 'MR', 'CW', 'CS']

async function getMissions(): Promise<Mission[]> {
  const { data: sess } = await supabase.auth.getSession()
  const token = sess.session?.access_token
  const res = await fetch('/api/hub/missions-list', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) return []
  const data = await res.json()
  return data.missions ?? []
}

export default function DashboardPage() {
  const [counts, setCounts]   = useState<Counts | null>(null)
  const [missions, setMissions] = useState<Mission[]>([])
  const [userName, setUserName] = useState('Usuário')

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserName(user.email?.split('@')[0] ?? 'Usuário')
    const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const eid = u?.empresa_id ?? user.id

    const [p, id, ms] = await Promise.all([
      supabase.from('hub_projetos').select('id', { count: 'exact', head: true }).eq('empresa_id', eid),
      supabase.from('hub_ideias').select('id', { count: 'exact', head: true }).eq('empresa_id', eid),
      getMissions(),
    ])
    const aprovados = ms.filter(m => m.status === 'approved').length
    setCounts({ projetos: p.count ?? 0, ideias: id.count ?? 0, missoes: ms.length, aprovados })
    setMissions(ms)
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const ativas = missions.filter(m => m.status === 'running')
  const totalTokens = missions.reduce((s, m) => s + (m.total_tokens ?? 0), 0)
  const totalCusto = missions.reduce((s, m) => s + Number(m.cost_usd ?? 0), 0)

  // Build line chart from missions (last 12 days)
  function buildMissionLine(ms: Mission[], days = 12) {
    const buckets: number[] = Array(days).fill(0)
    const now = Date.now()
    ms.forEach(m => {
      const age = Math.floor((now - new Date(m.created_at).getTime()) / 86400000)
      if (age < days) buckets[days - 1 - age]++
    })
    return buckets
  }

  // Build heatmap from missions
  function buildMissionHeatmap(ms: Mission[]) {
    const grid: number[][] = Array.from({ length: 6 }, () => Array(7).fill(0))
    ms.forEach(m => {
      const d = new Date(m.created_at)
      const dow = d.getDay()
      const bucket = Math.min(5, Math.floor(d.getHours() / 4))
      grid[5 - bucket][dow]++
    })
    return grid
  }

  const heatGrid = buildMissionHeatmap(missions)
  const heatMax = Math.max(...heatGrid.flat(), 1)
  const lineData = buildMissionLine(missions)

  // Compute agent mission counts from agents_used arrays
  const agentMissionCounts: Record<string, number> = {}
  missions.forEach(m => {
    (m.agents_used ?? []).forEach(aid => {
      agentMissionCounts[aid] = (agentMissionCounts[aid] ?? 0) + 1
    })
  })

  const featuredAgents = FEATURED_AGENTS.map(id => AGENTS_V2[id]).filter(Boolean)
  const recent = missions.slice(0, 8)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Welcome header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
            Bem-vindo de volta, <span style={{ color: 'var(--accent)' }}>{userName}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <input
              readOnly
              placeholder="Buscar..."
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px 7px 32px', fontSize: 12, color: 'var(--text-muted)', width: 180, outline: 'none' }}
            />
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-dim)' }} />
          </div>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <i className="fa-regular fa-calendar" style={{ fontSize: 13, color: 'var(--text-muted)' }} />
          </div>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <i className="fa-regular fa-bell" style={{ fontSize: 13, color: 'var(--text-muted)' }} />
          </div>
        </div>
      </motion.div>

      {/* ── KPI strip (4 cards) ── */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}
      >
        {[
          { label: 'Missões',        value: counts?.missoes ?? '—',           sub: 'Análises executadas',        icon: 'fa-rocket',        color: '#e8622a' },
          { label: 'Em execução',    value: ativas.length,                   sub: 'Missões ativas agora',       icon: 'fa-circle-notch',  color: '#F59E0B' },
          { label: 'Tokens gastos',  value: totalTokens.toLocaleString('pt-BR'), sub: 'Total de tokens IA',    icon: 'fa-coins',         color: '#7C3AED', mono: true },
          { label: 'Custo IA (USD)', value: `$${totalCusto.toFixed(4)}`,     sub: 'Acumulado total',            icon: 'fa-microchip',     color: '#059669', mono: true },
        ].map(k => (
          <motion.div
            key={k.label}
            variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: `${k.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`fa-solid ${k.icon}`} style={{ fontSize: 15, color: k.color }} />
                </div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1, fontFamily: k.mono ? "'DM Mono',monospace" : undefined, marginBottom: 6 }}>
                {k.value}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>{k.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{k.sub}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Heatmap */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          style={{ padding: '18px 20px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Distribuição de Missões</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Por horário e dia da semana</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: 'var(--accent-dim)', color: 'var(--accent)' }}>Semanal</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {/* Y-axis labels */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 22 }}>
              {HOURS.map(h => (
                <span key={h} style={{ fontSize: 9.5, color: 'var(--text-dim)', lineHeight: 1, whiteSpace: 'nowrap' }}>{h}</span>
              ))}
            </div>
            {/* Grid */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, 1fr)`, gridTemplateRows: `repeat(6, 1fr)`, gap: 4, marginBottom: 6 }}>
                {heatGrid.map((row, ri) =>
                  row.map((val, ci) => (
                    <motion.div
                      key={`${ri}-${ci}`}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (ri * 7 + ci) * 0.005, duration: 0.2 }}
                      title={`${val} tarefas`}
                      style={{
                        aspectRatio: '1',
                        borderRadius: 4,
                        background: heatColor(val, heatMax),
                        cursor: 'default',
                      }}
                    />
                  ))
                )}
              </div>
              {/* X-axis labels */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                {DAYS.map(d => (
                  <span key={d} style={{ fontSize: 9.5, color: 'var(--text-dim)', textAlign: 'center' }}>{d}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Line chart */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.35 }}
          style={{ padding: '18px 20px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Volume de Missões</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Últimos 12 dias</div>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 2, borderRadius: 1, background: 'var(--accent)' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tarefas</span>
              </div>
            </div>
          </div>
          {/* Y-axis labels */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 110, paddingBottom: 2 }}>
              {[Math.max(...lineData), Math.round(Math.max(...lineData) / 2), 0].map(v => (
                <span key={v} style={{ fontSize: 9.5, color: 'var(--text-dim)', lineHeight: 1 }}>{v}</span>
              ))}
            </div>
            <div style={{ flex: 1, height: 110 }}>
              <SvgLine data={lineData} color="#e8622a" />
            </div>
          </div>
          {/* X-axis */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingLeft: 24 }}>
            {Array.from({ length: 4 }, (_, i) => {
              const d = new Date()
              d.setDate(d.getDate() - Math.round((3 - i) * 3.5))
              return <span key={i} style={{ fontSize: 9.5, color: 'var(--text-dim)' }}>{d.getDate()}/{d.getMonth() + 1}</span>
            })}
          </div>
        </motion.div>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Agentes grid */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          style={{ overflow: 'hidden' }}
        >
          <div className="card-header">
            <span className="card-title">Agentes do Squad</span>
            <Link href="/dashboard/agentes" style={{ fontSize: 11.5, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Ver todos →</Link>
          </div>
          <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {featuredAgents.map((a, i) => {
              const missionCount = agentMissionCounts[a.id] ?? 0
              const isActive = ativas.some(m => (m.agents_used ?? []).includes(a.id))
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.04, duration: 0.2 }}
                >
                  <Link href="/dashboard/agentes" style={{ textDecoration: 'none' }}>
                    <motion.div
                      whileHover={{ y: -1 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 9, background: 'var(--surface-2)', border: `1px solid ${isActive ? a.color + '50' : 'var(--border)'}`, cursor: 'pointer' }}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${a.color}20`, border: `1.5px solid ${a.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: a.color, flexShrink: 0 }}>
                        {a.initial}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? '#F59E0B' : missionCount > 0 ? '#22C55E' : '#475569', flexShrink: 0 }} />
                          <span style={{ fontSize: 9.5, color: 'var(--text-dim)' }}>{missionCount} missão{missionCount !== 1 ? 'ões' : ''}</span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Workload / Recent tasks */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.35 }}
          style={{ overflow: 'hidden' }}
        >
          <div className="card-header">
            <span className="card-title">Missões recentes</span>
            <Link href="/dashboard/tarefas" style={{ fontSize: 11.5, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Ver tudo</Link>
          </div>
          <AnimatePresence initial={false}>
            {recent.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                Nenhuma missão ainda. <Link href="/dashboard/missoes" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Iniciar a primeira</Link>
              </div>
            ) : recent.map((m, i) => {
              const levelColor = LEVEL_COLORS[m.level] ?? '#e8622a'
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.035, duration: 0.22 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: `${levelColor}18`, border: `1.5px solid ${levelColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: levelColor, flexShrink: 0 }}>
                    {m.level}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{(m.agents_used ?? []).length} agentes · {(m.total_tokens ?? 0).toLocaleString()} tk</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{timeAgo(m.created_at)}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: STATUS_BG[m.status] ?? 'var(--surface-2)', color: STATUS_COLORS[m.status] ?? 'var(--text-muted)' }}>
                      {STATUS_LABELS[m.status] ?? m.status}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
