'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { AGENTS_V2 } from '@/lib/agents-v2'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

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

type UsageRow = {
  agente_id: string
  modelo: string
  total_tokens: number
  custo_usd: number
  created_at: string
}

type CerebroRow = {
  nome_empresa?: string | null
  slogan?: string | null
  missao?: string | null
  produto_principal?: string | null
  publico_alvo?: string | null
  metas?: string | null
  dna_fundador?: string | null
  knowledge_vault?: string | null
  playbooks?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOURS = ['22h', '18h', '14h', '10h', '6h', '2h']

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

function heatColor(v: number, max: number) {
  if (v === 0) return '#1a1530'
  const t = Math.min(v / Math.max(max, 1), 1)
  const r = Math.round(30 + t * (201 - 30))
  const g = Math.round(20 + t * (168 - 20))
  const b = Math.round(40 + t * (76 - 40))
  return `rgb(${r},${g},${b})`
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e', running: '#f59e0b', approved: '#3b82f6',
  error: '#ef4444', archived: '#6b6480', awaiting_approval: '#a855f7',
  draft: '#7a6e9a',
}
const STATUS_LABELS: Record<string, string> = {
  completed: 'Aguard. Aprovação', running: 'Em andamento', approved: 'Aprovada',
  error: 'Erro', archived: 'Arquivada', awaiting_approval: 'Aguard. Aprovação',
  draft: 'Rascunho',
}

const CEREBRO_FIELDS: { key: keyof CerebroRow; label: string }[] = [
  { key: 'nome_empresa', label: 'Empresa' },
  { key: 'slogan', label: 'Slogan' },
  { key: 'missao', label: 'Missão' },
  { key: 'produto_principal', label: 'Produto' },
  { key: 'publico_alvo', label: 'Público-alvo' },
  { key: 'metas', label: 'Metas' },
  { key: 'dna_fundador', label: 'DNA do Fundador' },
  { key: 'knowledge_vault', label: 'Knowledge Base' },
  { key: 'playbooks', label: 'Playbooks' },
]

const FEATURED_AGENTS = ['CEO', 'COO', 'CFO', 'CMO', 'CTO', 'MR', 'CW', 'CS']

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0f0d18', border: '1px solid #1e1a2e', borderRadius: 6, padding: '6px 10px', fontSize: 11 }}>
      <div style={{ color: '#7a6e9a', marginBottom: 2 }}>{label}</div>
      <div style={{ color: '#f0f0f0', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{payload[0].value}</div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [usage, setUsage] = useState<UsageRow[]>([])
  const [cerebro, setCerebro] = useState<CerebroRow | null>(null)
  const [userName, setUserName] = useState('')
  const [expandedMission, setExpandedMission] = useState<string | null>(null)
  const [missionFilter, setMissionFilter] = useState<string>('all')
  const [loadingMissions, setLoadingMissions] = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserName(user.email?.split('@')[0] ?? '')

    const { data: usrRow } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const eid = usrRow?.empresa_id ?? user.id

    const { data: sess } = await supabase.auth.getSession()
    const token = sess.session?.access_token

    const [missionsRes, usageRes, cerebroRes] = await Promise.all([
      fetch('/api/hub/missions-list', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
      supabase.from('hub_uso_agentes').select('agente_id, modelo, total_tokens, custo_usd, created_at').eq('empresa_id', eid),
      supabase.from('hub_cerebro').select('*').eq('empresa_id', eid).maybeSingle(),
    ])

    if (missionsRes.ok) {
      const d = await missionsRes.json() as { missions?: Mission[] }
      setMissions(d.missions ?? [])
    }
    setLoadingMissions(false)
    setUsage(usageRes.data ?? [])
    setCerebro(cerebroRes.data as CerebroRow | null)
  }, [])

  useEffect(() => { void load() }, [load])

  // ── Derived data ──
  const now = Date.now()
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

  const activeMissions = missions.filter(m => m.status === 'running')
  const todayMissions = missions.filter(m => new Date(m.created_at) >= todayStart)
  const totalCostAll = missions.reduce((s, m) => s + Number(m.cost_usd ?? 0), 0)
  const todayCost = usage.filter(u => new Date(u.created_at) >= todayStart).reduce((s, u) => s + Number(u.custo_usd ?? 0), 0)
  const agentsActive = new Set(activeMissions.flatMap(m => m.agents_used ?? [])).size

  const cerebroPct = cerebro
    ? Math.round(CEREBRO_FIELDS.filter(f => cerebro[f.key] && String(cerebro[f.key]).trim().length > 0).length / CEREBRO_FIELDS.length * 100)
    : 0

  // Agent bar chart (top 10 by total missions)
  const agentCounts: Record<string, number> = {}
  missions.forEach(m => (m.agents_used ?? []).forEach(id => { agentCounts[id] = (agentCounts[id] ?? 0) + 1 }))
  const agentBarData = Object.entries(agentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ name: id, count, color: AGENTS_V2[id]?.color ?? '#c9a84c' }))

  // 14-day cost area chart
  const costByDay: { date: string; custo: number }[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now - (13 - i) * 86400000)
    const key = d.toISOString().slice(0, 10)
    const custo = usage.filter(u => u.created_at.slice(0, 10) === key).reduce((s, u) => s + Number(u.custo_usd ?? 0), 0)
    return { date: fmtDate(d.toISOString()), custo: Math.round(custo * 10000) / 10000 }
  })

  // Monthly cost projection
  const hoursElapsed = new Date().getHours() + 1
  const projMensal = hoursElapsed > 0 ? (todayCost / hoursElapsed) * 24 * 30 : 0

  // Hourly activity timeline (last 24h from usage)
  const hourlyData = Array.from({ length: 24 }, (_, h) => {
    const count = usage.filter(u => {
      const d = new Date(u.created_at)
      const diffH = (now - d.getTime()) / 3600000
      return diffH >= 0 && diffH < 24 && d.getHours() === h
    }).length
    return { hora: `${String(h).padStart(2, '0')}h`, ações: count }
  })

  // Heatmap
  const heatGrid = buildHeatmap(missions)
  const heatMax = Math.max(...heatGrid.flat(), 1)

  // Filtered missions for table
  const filteredMissions = missionFilter === 'all' ? missions : missions.filter(m => m.status === missionFilter)

  // Cerebro sections fill
  const cerebroSections = CEREBRO_FIELDS.map(f => ({
    ...f,
    value: cerebro?.[f.key] ? String(cerebro[f.key]).slice(0, 80) : null,
    filled: !!(cerebro?.[f.key] && String(cerebro[f.key]).trim().length > 0),
  }))

  const kpis = [
    { label: 'Missões ativas', value: activeMissions.length, sub: 'rodando agora', icon: 'fa-circle-notch', color: '#f59e0b', mono: true },
    { label: 'Missões hoje', value: todayMissions.length, sub: 'criadas hoje', icon: 'fa-rocket', color: '#e8622a', mono: true },
    { label: 'Agentes ativos', value: agentsActive, sub: 'em missões', icon: 'fa-robot', color: '#6366f1', mono: true },
    { label: 'Custo hoje', value: `$${todayCost.toFixed(4)}`, sub: `proj. mês $${projMensal.toFixed(2)}`, icon: 'fa-coins', color: '#c9a84c', mono: true },
    { label: 'Cérebro', value: `${cerebroPct}%`, sub: 'contexto preenchido', icon: 'fa-brain', color: cerebroPct < 40 ? '#ef4444' : cerebroPct < 70 ? '#f59e0b' : '#22c55e', mono: true },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Welcome ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', letterSpacing: '-.3px' }}>
            {userName ? <>Olá, <span style={{ color: '#c9a84c' }}>{userName}</span></> : 'FactorHub OS'}
          </div>
          <div style={{ fontSize: 11, color: '#7a6e9a', marginTop: 3 }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
        </div>
        <Link
          href="/dashboard/missoes"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 7,
            background: '#c9a84c', color: '#0a0812',
            textDecoration: 'none', fontSize: 11, fontWeight: 700,
          }}
        >
          <i className="fa-solid fa-rocket" style={{ fontSize: 10 }} />
          Nova Missão
        </Link>
      </div>

      {/* ── KPI Strip ── */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}
      >
        {kpis.map(k => (
          <motion.div
            key={k.label}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ background: '#0f0d18', border: '1px solid #1e1a2e', borderRadius: 10, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: k.color, opacity: 0.7 }} />
            <div style={{ width: 30, height: 30, borderRadius: 7, background: `${k.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <i className={`fa-solid ${k.icon}`} style={{ fontSize: 12, color: k.color }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f0f0f0', lineHeight: 1, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-.5px' }}>
              {k.value}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#f0f0f0', marginTop: 6 }}>{k.label}</div>
            <div style={{ fontSize: 10, color: '#7a6e9a', marginTop: 2 }}>{k.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Middle row: Missions table + Agent bar chart ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12 }}>

        {/* Missions table */}
        <div style={{ background: '#0f0d18', border: '1px solid #1e1a2e', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #1e1a2e' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#f0f0f0' }}>Missões</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['all', 'Todas'], ['running', 'Ativas'], ['approved', 'Aprovadas'], ['archived', 'Arquivadas']].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setMissionFilter(v)}
                  style={{
                    padding: '3px 9px', borderRadius: 5, border: `1px solid ${missionFilter === v ? '#c9a84c' : '#1e1a2e'}`,
                    background: missionFilter === v ? '#c9a84c18' : 'transparent',
                    color: missionFilter === v ? '#c9a84c' : '#7a6e9a',
                    fontSize: 9, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {loadingMissions ? (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3,4].map(i => <div key={i} className="shimmer" style={{ height: 40, borderRadius: 6 }} />)}
              </div>
            ) : filteredMissions.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#7a6e9a', fontSize: 12 }}>
                {missionFilter === 'all' ? 'Nenhuma missão ainda.' : 'Nenhuma missão com este status.'}
              </div>
            ) : filteredMissions.map(m => {
              const sc = STATUS_COLORS[m.status] ?? '#7a6e9a'
              const isExpanded = expandedMission === m.id
              return (
                <div key={m.id} style={{ borderBottom: '1px solid #1e1a2e' }}>
                  <button
                    onClick={() => setExpandedMission(isExpanded ? null : m.id)}
                    style={{ width: '100%', background: isExpanded ? '#14101f' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, transition: 'background .12s' }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: `${sc}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: sc, flexShrink: 0 }}>
                      {m.level}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#f0f0f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                      <div style={{ fontSize: 9, color: '#7a6e9a', marginTop: 1 }}>
                        {(m.agents_used ?? []).length} agentes · {(m.total_tokens ?? 0).toLocaleString('pt-BR')} tk
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 9, color: '#7a6e9a' }}>{timeAgo(m.created_at)}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${sc}15`, color: sc }}>
                        {STATUS_LABELS[m.status] ?? m.status}
                      </span>
                    </div>
                    <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: 8, color: '#3a3055', flexShrink: 0 }} />
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
                        <div style={{ padding: '10px 16px 14px 54px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(m.agents_used ?? []).map(aid => {
                            const a = AGENTS_V2[aid]
                            if (!a) return null
                            return (
                              <span key={aid} style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${a.color}15`, color: a.color }}>
                                {a.name.split(' ')[0]}
                              </span>
                            )
                          })}
                          {m.cost_usd > 0 && (
                            <span style={{ fontSize: 9, color: '#7a6e9a', marginLeft: 4 }}>
                              custo: ${Number(m.cost_usd).toFixed(4)}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>

        {/* Agent activity bar chart */}
        <div style={{ background: '#0f0d18', border: '1px solid #1e1a2e', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f0f0f0', marginBottom: 4 }}>Atividade por Agente</div>
          <div style={{ fontSize: 10, color: '#7a6e9a', marginBottom: 14 }}>missões por agente (top 10)</div>
          {agentBarData.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a3055', fontSize: 12 }}>Nenhuma missão ainda</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={agentBarData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid horizontal={false} stroke="#1e1a2e" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#7a6e9a' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#7a6e9a' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#1e1a2e' }} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {agentBarData.map((entry, i) => (
                    <rect key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Bottom row: Heatmap + Cost chart + Cerebro ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 260px', gap: 12 }}>

        {/* Heatmap */}
        <div style={{ background: '#0f0d18', border: '1px solid #1e1a2e', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f0f0f0', marginBottom: 2 }}>Distribuição de Missões</div>
          <div style={{ fontSize: 10, color: '#7a6e9a', marginBottom: 14 }}>por horário e dia da semana</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 20 }}>
              {HOURS.map(h => <span key={h} style={{ fontSize: 9, color: '#7a6e9a', lineHeight: 1 }}>{h}</span>)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: 3, marginBottom: 4 }}>
                {heatGrid.map((row, ri) =>
                  row.map((val, ci) => (
                    <div
                      key={`${ri}-${ci}`}
                      title={`${val} missões`}
                      style={{ aspectRatio: '1', borderRadius: 3, background: heatColor(val, heatMax), transition: 'background .2s' }}
                    />
                  ))
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                {DAYS.map(d => <span key={d} style={{ fontSize: 9, color: '#7a6e9a', textAlign: 'center' }}>{d}</span>)}
              </div>
            </div>
          </div>
        </div>

        {/* 14-day cost area chart */}
        <div style={{ background: '#0f0d18', border: '1px solid #1e1a2e', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f0f0f0', marginBottom: 2 }}>Custo de IA</div>
              <div style={{ fontSize: 10, color: '#7a6e9a' }}>últimos 14 dias</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#c9a84c', fontFamily: "'JetBrains Mono', monospace" }}>
                ${totalCostAll.toFixed(4)}
              </div>
              <div style={{ fontSize: 9, color: '#7a6e9a' }}>total acumulado</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={costByDay} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#1e1a2e" />
              <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#7a6e9a' }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 8, fill: '#7a6e9a' }} axisLine={false} tickLine={false} width={36} tickFormatter={v => `$${v}`} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#1e1a2e' }} />
              <Area type="monotone" dataKey="custo" stroke="#c9a84c" strokeWidth={1.5} fill="url(#costGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Cerebro status */}
        <div style={{ background: '#0f0d18', border: '1px solid #1e1a2e', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#f0f0f0' }}>Cérebro</span>
            <Link href="/dashboard/cerebro" style={{ fontSize: 9, color: '#c9a84c', textDecoration: 'none', fontWeight: 600 }}>
              Editar →
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#1e1a2e', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${cerebroPct}%`, background: cerebroPct < 40 ? '#ef4444' : cerebroPct < 70 ? '#f59e0b' : '#22c55e', borderRadius: 2, transition: 'width .5s' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: cerebroPct < 40 ? '#ef4444' : cerebroPct < 70 ? '#f59e0b' : '#22c55e', fontFamily: "'JetBrains Mono', monospace" }}>{cerebroPct}%</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {cerebroSections.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: s.filled ? '#22c55e' : '#1e1a2e' }} />
                <span style={{ fontSize: 10, color: s.filled ? '#f0f0f0' : '#3a3055', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 4: Hourly activity timeline ── */}
      <div style={{ background: '#0f0d18', border: '1px solid #1e1a2e', borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f0f0f0', marginBottom: 2 }}>Timeline de Atividade</div>
            <div style={{ fontSize: 10, color: '#7a6e9a' }}>ações por hora nas últimas 24h</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={hourlyData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#1e1a2e" />
            <XAxis dataKey="hora" tick={{ fontSize: 7.5, fill: '#7a6e9a' }} axisLine={false} tickLine={false} interval={3} />
            <YAxis hide />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#1e1a2e' }} />
            <Line type="monotone" dataKey="ações" stroke="#c9a84c" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Section 6: Recent usage table ── */}
      <div style={{ background: '#0f0d18', border: '1px solid #1e1a2e', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1a2e' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#f0f0f0' }}>Uso Recente de Agentes</span>
          <span style={{ fontSize: 10, color: '#7a6e9a', marginLeft: 8 }}>últimas {Math.min(usage.length, 20)} interações</span>
        </div>
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {usage.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#7a6e9a', fontSize: 12 }}>Nenhuma interação ainda</div>
          ) : [...usage].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20).map((u, i) => {
            const a = AGENTS_V2[u.agente_id]
            const isC1 = a?.layer === 'C1'
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid #1e1a2e', transition: 'background .1s' }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: `${a?.color ?? '#c9a84c'}18`, border: `1px solid ${a?.color ?? '#c9a84c'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: a?.color ?? '#c9a84c', flexShrink: 0 }}>
                  {a?.initial ?? u.agente_id.slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#f0f0f0' }}>{a?.name ?? u.agente_id}</div>
                  <div style={{ fontSize: 9, color: '#7a6e9a' }}>{u.modelo}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#c9a84c' }}>
                    ${Number(u.custo_usd).toFixed(5)}
                  </div>
                  <div style={{ fontSize: 9, color: '#7a6e9a' }}>{(u.total_tokens ?? 0).toLocaleString()} tk</div>
                </div>
                <div style={{ fontSize: 9, color: '#3a3055', width: 36, textAlign: 'right', flexShrink: 0 }}>
                  {timeAgo(u.created_at)}
                </div>
                <div style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: isC1 ? '#e8622a18' : '#0d948818', color: isC1 ? '#e8622a' : '#0d9488', flexShrink: 0, minWidth: 42, textAlign: 'center' }}>
                  {isC1 ? 'Sonnet' : 'Haiku'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Section 9: Products ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { name: 'FactorOne', desc: 'Finance OS para PMEs', url: 'https://factorone-mvp2.vercel.app', color: '#6366f1', icon: 'fa-chart-line', status: 'live' },
          { name: 'LifeOS', desc: 'Sistema de gestão pessoal', url: '#', color: '#10b981', icon: 'fa-leaf', status: 'dev' },
          { name: 'VN Prime', desc: 'Imóveis e patrimônio', url: '#', color: '#c9a84c', icon: 'fa-building', status: 'dev' },
        ].map(p => (
          <div key={p.name} style={{ background: '#0f0d18', border: `1px solid ${p.color}30`, borderRadius: 10, padding: '16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: p.color, opacity: 0.6 }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${p.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fa-solid ${p.icon}`} style={{ fontSize: 14, color: p.color }} />
              </div>
              <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: p.status === 'live' ? '#22c55e18' : '#f59e0b18', color: p.status === 'live' ? '#22c55e' : '#f59e0b', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                {p.status === 'live' ? 'Live' : 'Dev'}
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0', marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: '#7a6e9a', marginBottom: 12 }}>{p.desc}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ fontSize: 10, color: '#3a3055' }}>
                {missions.filter(m => (m.agents_used ?? []).length > 0).length} missões relacionadas
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Featured agents ── */}
      <div style={{ background: '#0f0d18', border: '1px solid #1e1a2e', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #1e1a2e' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#f0f0f0' }}>Conselho Executivo</span>
          <Link href="/dashboard/agentes" style={{ fontSize: 10, color: '#c9a84c', textDecoration: 'none', fontWeight: 600 }}>Ver squad completo →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, padding: '12px 14px' }}>
          {FEATURED_AGENTS.map(aid => {
            const a = AGENTS_V2[aid]
            if (!a) return null
            const count = agentCounts[aid] ?? 0
            const isActive = activeMissions.some(m => (m.agents_used ?? []).includes(aid))
            return (
              <Link key={aid} href="/dashboard/agentes" style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ y: -1 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#14101f', border: `1px solid ${isActive ? a.color + '40' : '#1e1a2e'}`, cursor: 'pointer', transition: 'border-color .15s' }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: `${a.color}18`, border: `1.5px solid ${a.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: a.color, flexShrink: 0 }}>
                    {a.initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#f0f0f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: isActive ? '#f59e0b' : count > 0 ? '#22c55e' : '#374151', flexShrink: 0 }} />
                      <span style={{ fontSize: 9, color: '#7a6e9a' }}>{count} missões</span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </div>

    </div>
  )
}
