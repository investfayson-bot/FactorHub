'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AGENTS_V2, type AgentV2, type AgentLayer } from '@/lib/agents-v2'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/layout/PageHeader'

type LayerTab = AgentLayer | 'ALL'

type MissionStep = {
  id: string
  created_at: string
  output: string
  tokens_used: number
  missions: { title: string; status: string } | null
}

type AgentStats = {
  totalTasks: number
  todayTasks: number
  weekTasks: number
  totalTokens: number
  totalCostUsd: number
  isRunning: boolean
  currentMission: string | null
  recentDeliveries: MissionStep[]
}

const LAYER_TABS: { id: LayerTab; label: string; color: string }[] = [
  { id: 'ALL', label: 'Todos', color: '#3ecf8e' },
  { id: 'C1', label: 'Conselho', color: '#e8622a' },
  { id: 'C2', label: 'Pesquisa', color: '#84cc16' },
  { id: 'C3', label: 'Diretores', color: '#3ecf8e' },
  { id: 'C4', label: 'Especialistas', color: '#eab308' },
  { id: 'CA', label: 'Chief of Staff', color: '#a855f7' },
]

const LAYER_ORDER: AgentLayer[] = ['C1', 'C2', 'C3', 'C4', 'CA']

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  completed: { label: 'Concluída', color: '#22c55e' },
  approved: { label: 'Aprovada', color: '#3ecf8e' },
  running: { label: 'Em andamento', color: '#f59e0b' },
  error: { label: 'Erro', color: '#ef4444' },
  archived: { label: 'Arquivada', color: '#6b6480' },
}

async function getToken(): Promise<string> {
  const { data: sess } = await supabase.auth.getSession()
  return sess.session?.access_token ?? ''
}

// ─── Agent Row (Linear-style list item) ──────────────────────────────────────

function AgentRow({ agent, isRunning, totalTasks, onClick }: {
  agent: AgentV2; isRunning: boolean; totalTasks: number; onClick: () => void
}) {
  const layerInfo = LAYER_TABS.find(t => t.id === agent.layer)
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ backgroundColor: 'rgba(255,255,255,.025)' }}
      style={{
        display: 'grid', gridTemplateColumns: '1fr 120px 80px 70px 80px',
        gap: 8, width: '100%', textAlign: 'left',
        padding: '9px 12px', borderRadius: 7,
        background: 'transparent', border: 'none', cursor: 'pointer',
        alignItems: 'center', marginBottom: 2,
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Agent name + role */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${agent.color}15`, border: `1.5px solid ${agent.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: agent.color, flexShrink: 0 }}>
          {agent.initial}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.role}</div>
        </div>
      </div>
      {/* Layer */}
      <div>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${layerInfo?.color ?? '#666'}15`, color: layerInfo?.color ?? '#666', letterSpacing: '.04em' }}>
          {agent.layer} · {agent.layerLabel}
        </span>
      </div>
      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: isRunning ? '#22c55e' : 'var(--border-light)', flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: isRunning ? '#22c55e' : 'var(--text-dim)', fontWeight: isRunning ? 600 : 400 }}>
          {isRunning ? 'Ativo' : 'Online'}
        </span>
      </div>
      {/* Missions */}
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
        {totalTasks > 0 ? totalTasks : '—'}
      </span>
      {/* Cost placeholder */}
      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>—</span>
    </motion.button>
  )
}

// ─── Agent Card ───────────────────────────────────────────────────────────────

function AgentCard({ agent, isRunning, totalTasks, onClick }: {
  agent: AgentV2
  isRunning: boolean
  totalTasks: number
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2, boxShadow: `0 8px 24px rgba(0,0,0,.4)` }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.14 }}
      style={{
        background: '#181818',
        border: `1px solid ${isRunning ? agent.color + '55' : '#2e2e2e'}`,
        borderRadius: 10,
        padding: '14px 10px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 7,
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: agent.color, opacity: isRunning ? 1 : 0.35 }} />
      <div style={{ position: 'absolute', top: 7, right: 7, fontSize: 7, fontWeight: 800, padding: '2px 5px', borderRadius: 3, background: `${agent.color}20`, color: agent.color, letterSpacing: '.04em' }}>
        {agent.layer}
      </div>
      <div style={{ position: 'relative', marginTop: 2 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: `${agent.color}15`, border: `2px solid ${agent.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: agent.color }}>
          {agent.initial}
        </div>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: isRunning ? '#22c55e' : '#374151', border: '1.5px solid #181818' }} />
      </div>
      <div style={{ width: '100%' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#ededed', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {agent.name}
        </div>
        <div style={{ fontSize: 9, color: '#888888', marginTop: 1 }}>
          {isRunning ? <span style={{ color: '#22c55e' }}>ativo</span> : totalTasks ? `${totalTasks} missões` : 'disponível'}
        </div>
      </div>
    </motion.button>
  )
}

// ─── Agent Drawer ─────────────────────────────────────────────────────────────

function AgentDrawer({ agent, stats, loading, onClose }: {
  agent: AgentV2
  stats: AgentStats | null
  loading: boolean
  onClose: () => void
}) {
  const [tab, setTab] = useState<'perfil' | 'tarefa' | 'config'>('perfil')
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null)
  const [taskInput, setTaskInput] = useState('')
  const [taskLoading, setTaskLoading] = useState(false)
  const [taskResponse, setTaskResponse] = useState('')
  const [streaming, setStreaming] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (streaming) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [streaming])

  const sendTask = useCallback(async () => {
    const text = taskInput.trim()
    if (!text || taskLoading) return
    setTaskInput('')
    setTaskResponse('')
    setStreaming('')
    setTaskLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/hub/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ agentId: agent.id, messages: [{ role: 'user', content: text }] }),
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let full = ''
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n')
        buf = parts.pop() ?? ''
        for (const line of parts) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d === '[DONE]') continue
          try {
            const p = JSON.parse(d) as { token?: string; choices?: { delta?: { content?: string } }[] }
            const tok = p.token ?? p.choices?.[0]?.delta?.content ?? ''
            if (tok) { full += tok; setStreaming(full) }
          } catch { /* skip */ }
        }
      }
      setTaskResponse(full)
      setStreaming('')
    } catch (e) {
      setTaskResponse(`Erro ao conectar: ${e}`)
      setStreaming('')
    } finally {
      setTaskLoading(false)
    }
  }, [taskInput, taskLoading, agent.id])

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
  const fmtCost = (v: number) => v < 0.001 ? `$${(v * 1000).toFixed(2)}m` : `$${v.toFixed(4)}`
  const fmtNum = (v: number) => v.toLocaleString('pt-BR')

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        style={{
          position: 'fixed', top: 46, right: 0, bottom: 0, zIndex: 201,
          width: 460, background: '#181818',
          borderLeft: '1px solid #2e2e2e',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Color bar */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${agent.color}, ${agent.color}88)`, flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid #2e2e2e', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${agent.color}15`, border: `2.5px solid ${agent.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: agent.color }}>
                {agent.initial}
              </div>
              {stats?.isRunning && (
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: '#22c55e', border: '2px solid #181818' }}
                />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#ededed' }}>{agent.name}</span>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: `${agent.color}20`, color: agent.color, letterSpacing: '.04em' }}>{agent.layer}</span>
              </div>
              <div style={{ fontSize: 11, color: '#888888', marginBottom: 6, lineHeight: 1.4 }}>{agent.role}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: stats?.isRunning ? '#22c55e' : '#374151' }} />
                <span style={{ fontSize: 10, color: stats?.isRunning ? '#22c55e' : '#888888', fontWeight: 600 }}>
                  {stats?.isRunning
                    ? (stats.currentMission ? `Missão: ${stats.currentMission.slice(0, 28)}…` : 'Em execução')
                    : 'Disponível'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: 7, cursor: 'pointer', color: '#888888', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <i className="fa-solid fa-xmark" style={{ fontSize: 10 }} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {([['perfil', 'Perfil'], ['tarefa', 'Tarefa'], ['config', 'Config']] as const).map(([t, l]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: `1px solid ${tab === t ? agent.color : '#2e2e2e'}`,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: tab === t ? `${agent.color}20` : 'transparent',
                  color: tab === t ? agent.color : '#888888',
                  transition: 'all .15s',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 'perfil' ? (
            <>
              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Hoje', value: loading ? '—' : fmtNum(stats?.todayTasks ?? 0) },
                  { label: 'Esta semana', value: loading ? '—' : fmtNum(stats?.weekTasks ?? 0) },
                  { label: 'Total', value: loading ? '—' : fmtNum(stats?.totalTasks ?? 0) },
                ].map(m => (
                  <div key={m.label} style={{ background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: agent.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{m.value}</div>
                    <div style={{ fontSize: 9, color: '#888888', marginTop: 4, letterSpacing: '.03em' }}>{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Cost row */}
              <div style={{ background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 9, color: '#888888', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Tokens acumulados</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#ededed' }}>
                    {loading ? '—' : fmtNum(stats?.totalTokens ?? 0)}
                  </div>
                </div>
                <div style={{ width: 1, height: 32, background: '#2e2e2e' }} />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: '#888888', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Custo acumulado</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#c9a84c' }}>
                    {loading ? '—' : fmtCost(stats?.totalCostUsd ?? 0)}
                  </div>
                </div>
              </div>

              {/* Last deliveries */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: '#888888', textTransform: 'uppercase', marginBottom: 10 }}>
                  Últimas Entregas
                </div>
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ height: 40, background: '#1e1e1e', borderRadius: 7, animation: 'shimmer 1.4s infinite' }} />
                    ))}
                  </div>
                ) : !stats?.recentDeliveries.length ? (
                  <div style={{ fontSize: 12, color: '#555555', textAlign: 'center', padding: '24px 0' }}>
                    <i className="fa-regular fa-clock" style={{ marginBottom: 8, fontSize: 20, display: 'block' }} />
                    Nenhuma entrega ainda
                  </div>
                ) : stats.recentDeliveries.map(d => {
                  const sb = STATUS_BADGE[d.missions?.status ?? 'completed']
                  return (
                    <div key={d.id} style={{ borderBottom: '1px solid #2e2e2e', paddingBottom: 10, marginBottom: 10 }}>
                      <button
                        onClick={() => setExpandedDelivery(expandedDelivery === d.id ? null : d.id)}
                        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: 10 }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#ededed', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {d.missions?.title ?? 'Missão sem título'}
                          </div>
                          <div style={{ fontSize: 10, color: '#888888', marginTop: 2 }}>
                            {fmtDate(d.created_at)} · {fmtNum(d.tokens_used ?? 0)} tk
                          </div>
                        </div>
                        {sb && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${sb.color}15`, color: sb.color, flexShrink: 0 }}>
                            {sb.label}
                          </span>
                        )}
                        <i className={`fa-solid fa-chevron-${expandedDelivery === d.id ? 'up' : 'down'}`} style={{ fontSize: 9, color: '#555555', flexShrink: 0 }} />
                      </button>
                      {expandedDelivery === d.id && (
                        <div style={{ marginTop: 8, padding: '10px 12px', background: '#101010', borderRadius: 6, border: '1px solid #2e2e2e', fontSize: 11, color: '#c4b8e0', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 220, overflowY: 'auto' }}>
                          {d.output || 'Sem conteúdo registrado.'}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Layer info */}
              <div style={{ background: `${agent.color}0d`, border: `1px solid ${agent.color}25`, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 9, color: agent.color, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>{agent.layer} · {agent.layerLabel}</div>
                <div style={{ fontSize: 11, color: '#c4b8e0', lineHeight: 1.5 }}>{agent.role}</div>
              </div>
            </>
          ) : tab === 'config' ? (
            <>
              {/* Model info */}
              <div style={{ background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: 8, padding: '12px 14px', marginBottom: 4 }}>
                <div style={{ fontSize: 9, color: '#888888', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Modelo de IA</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#ededed', fontFamily: "'JetBrains Mono', monospace" }}>
                    {agent.layer === 'C1' ? 'claude-sonnet-4-5' : 'claude-haiku-4-5'}
                  </div>
                  <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 3, background: agent.layer === 'C1' ? '#e8622a18' : '#84cc1618', color: agent.layer === 'C1' ? '#e8622a' : '#84cc16' }}>
                    {agent.layer === 'C1' ? 'Sonnet' : 'Haiku'}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#888888', marginTop: 4 }}>
                  {agent.layer === 'C1' ? 'Camada executiva — modelo premium' : 'Camada operacional — modelo rápido e econômico'}
                </div>
              </div>

              {/* Layer + max tokens */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
                <div style={{ background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, color: '#888888', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Camada</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: agent.color, fontFamily: "'JetBrains Mono', monospace" }}>{agent.layer}</div>
                  <div style={{ fontSize: 9, color: '#888888', marginTop: 2 }}>{agent.layerLabel}</div>
                </div>
                <div style={{ background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, color: '#888888', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Max Tokens</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#ededed', fontFamily: "'JetBrains Mono', monospace" }}>{agent.maxTokens.toLocaleString()}</div>
                </div>
              </div>

              {/* System prompt */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: '#888888', textTransform: 'uppercase', marginBottom: 8 }}>System Prompt</div>
                <div style={{
                  background: '#101010', border: '1px solid #2e2e2e', borderRadius: 8,
                  padding: '12px', fontSize: 10.5, color: '#c4b8e0', lineHeight: 1.75,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 340, overflowY: 'auto',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {agent.systemPrompt}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: '#888888', textTransform: 'uppercase', marginBottom: 10 }}>
                  Tarefa para {agent.name.split(' ')[0]}
                </div>
                <textarea
                  value={taskInput}
                  onChange={e => setTaskInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendTask() } }}
                  placeholder={`Descreva a tarefa…`}
                  rows={4}
                  style={{
                    width: '100%', background: '#1e1e1e', border: '1px solid #2e2e2e',
                    borderRadius: 8, padding: '10px 12px', fontSize: 12,
                    color: '#ededed', resize: 'none', outline: 'none',
                    lineHeight: 1.6, fontFamily: 'inherit', display: 'block',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 9, color: '#555555' }}>Enter para enviar · Shift+Enter nova linha</span>
                  <button
                    onClick={() => void sendTask()}
                    disabled={taskLoading || !taskInput.trim()}
                    style={{
                      padding: '6px 16px', borderRadius: 6, border: 'none',
                      background: taskLoading || !taskInput.trim() ? '#2e2e2e' : agent.color,
                      color: taskLoading || !taskInput.trim() ? '#555555' : '#fff',
                      fontSize: 11, fontWeight: 700,
                      cursor: taskLoading || !taskInput.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
                    }}
                  >
                    {taskLoading
                      ? <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 10 }} /> Processando…</>
                      : <><i className="fa-solid fa-paper-plane" style={{ fontSize: 10 }} /> Enviar</>
                    }
                  </button>
                </div>
              </div>

              {(streaming || taskResponse) && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: '#888888', textTransform: 'uppercase', marginBottom: 8 }}>
                    Resposta
                  </div>
                  <div style={{ background: '#101010', border: '1px solid #2e2e2e', borderRadius: 8, padding: '14px', fontSize: 12, color: '#c4b8e0', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 420, overflowY: 'auto' }}>
                    {streaming || taskResponse}
                    {taskLoading && streaming && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        style={{ display: 'inline-block', width: 2, height: 12, background: agent.color, marginLeft: 2, verticalAlign: 'text-bottom' }}
                      />
                    )}
                    <div ref={bottomRef} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AgentesPage() {
  const [activeTab, setActiveTab] = useState<LayerTab>('ALL')
  const [search, setSearch] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<AgentV2 | null>(null)
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [missionMap, setMissionMap] = useState<Record<string, { total: number; isRunning: boolean; currentMission: string | null }>>({})

  useEffect(() => { void loadMissionMap() }, [])

  // abrir agente direto via ?open=ID (vindo dos Setores)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('open')
    if (id && AGENTS_V2[id]) {
      openAgent(AGENTS_V2[id])
      window.history.replaceState({}, '', '/dashboard/agentes')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadMissionMap() {
    const token = await getToken()
    const res = await fetch('/api/hub/missions-list', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!res.ok) return
    const data = await res.json() as { missions?: { agents_used?: string[]; status: string; title?: string }[] }
    const map: Record<string, { total: number; isRunning: boolean; currentMission: string | null }> = {}
    for (const m of (data.missions ?? [])) {
      for (const aid of (m.agents_used ?? [])) {
        if (!map[aid]) map[aid] = { total: 0, isRunning: false, currentMission: null }
        map[aid].total++
        if (m.status === 'running') { map[aid].isRunning = true; map[aid].currentMission = m.title ?? null }
      }
    }
    setMissionMap(map)
  }

  async function loadAgentStats(agent: AgentV2) {
    setLoadingStats(true)
    setAgentStats(null)
    try {
      const [usageRes, stepsRes] = await Promise.all([
        supabase.from('hub_uso_agentes').select('total_tokens, custo_usd, created_at').eq('agente_id', agent.id),
        supabase.from('mission_steps').select('id, created_at, output, tokens_used, missions(title, status)').eq('agent_id', agent.id).order('created_at', { ascending: false }).limit(5),
      ])

      const usage = usageRes.data ?? []
      const now = Date.now()
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const weekStart = new Date(now - 7 * 86400000)

      const totalTokens = usage.reduce((s, u) => s + (u.total_tokens ?? 0), 0)
      const totalCostUsd = usage.reduce((s, u) => s + Number(u.custo_usd ?? 0), 0)
      const todayTasks = usage.filter(u => new Date(u.created_at) >= todayStart).length
      const weekTasks = usage.filter(u => new Date(u.created_at) >= weekStart).length
      const info = missionMap[agent.id]

      setAgentStats({
        totalTasks: info?.total ?? 0,
        todayTasks,
        weekTasks,
        totalTokens,
        totalCostUsd,
        isRunning: info?.isRunning ?? false,
        currentMission: info?.currentMission ?? null,
        recentDeliveries: (stepsRes.data ?? []) as unknown as MissionStep[],
      })
    } catch { /* ignore — drawer shows graceful zeros */ }
    setLoadingStats(false)
  }

  function openAgent(agent: AgentV2) {
    setSelectedAgent(agent)
    void loadAgentStats(agent)
  }

  const allAgents = Object.values(AGENTS_V2)
  const visible = allAgents.filter(a => {
    const matchLayer = activeTab === 'ALL' || a.layer === activeTab
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.role.toLowerCase().includes(search.toLowerCase())
    return matchLayer && matchSearch
  })
  const activeCount = Object.values(missionMap).filter(m => m.isRunning).length
  const workingAgents = allAgents.filter(a => missionMap[a.id]?.isRunning)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <div style={{ marginBottom: 14 }}>
          <PageHeader
            title="Squad de Agentes"
            subtitle={`${allAgents.length} agentes · ${activeCount > 0 ? `${activeCount} em execução` : 'todos disponíveis'}`}
            action={
              <div style={{ position: 'relative' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-muted)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar…"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 12px 6px 28px', fontSize: 11, color: 'var(--text)', outline: 'none', width: 170 }}
                />
              </div>
            }
          />
        </div>

        {/* Layer tabs */}
        <div style={{ display: 'flex', gap: 4, paddingBottom: 14, overflowX: 'auto' }}>
          {LAYER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flexShrink: 0, padding: '5px 12px', borderRadius: 6,
                border: `1px solid ${activeTab === tab.id ? tab.color : '#2e2e2e'}`,
                cursor: 'pointer', fontSize: 10, fontWeight: 600,
                background: activeTab === tab.id ? `${tab.color}18` : 'transparent',
                color: activeTab === tab.id ? tab.color : '#888888',
                transition: 'all .15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Working Now strip */}
      {workingAgents.length > 0 && (
        <div style={{ margin: '0 24px 16px', padding: '12px 14px', borderRadius: 10, background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <motion.div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '.08em' }}>Trabalhando agora — {workingAgents.length} agente{workingAgents.length > 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {workingAgents.map(a => (
              <motion.button
                key={a.id}
                onClick={() => openAgent(a)}
                whileHover={{ y: -1 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8,
                  background: `${a.color}10`, border: `1px solid ${a.color}40`, cursor: 'pointer',
                }}
              >
                <div style={{ width: 26, height: 26, borderRadius: 7, background: `${a.color}20`, border: `1.5px solid ${a.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: a.color }}>
                  {a.initial}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ededed' }}>{a.name}</div>
                  <div style={{ fontSize: 9, color: '#888888', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {missionMap[a.id]?.currentMission ?? 'missão ativa'}
                  </div>
                </div>
                <motion.div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', marginLeft: 4, flexShrink: 0 }} animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Kanban board — columns by layer */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, alignItems: 'start' }}>
          {LAYER_ORDER.map(layer => {
            const info = LAYER_TABS.find(t => t.id === layer)!
            const layerAgents = visible.filter(a => a.layer === layer)
            return (
              <div key={layer} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 2px' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: info.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{info.label}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)', marginLeft: 'auto' }}>{layerAgents.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {layerAgents.map(agent => {
                    const isRunning = missionMap[agent.id]?.isRunning ?? false
                    const total = missionMap[agent.id]?.total ?? 0
                    return (
                      <motion.div
                        key={agent.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => openAgent(agent)}
                        whileHover={{ y: -1 }}
                        style={{ background: 'var(--surface)', border: `1px solid ${isRunning ? agent.color + '60' : 'var(--border)'}`, borderRadius: 8, padding: '10px', cursor: 'pointer', transition: 'border-color .15s' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: `${agent.color}15`, border: `1.5px solid ${agent.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8.5, fontWeight: 800, color: agent.color, flexShrink: 0 }}>{agent.initial}</div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.name}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 7, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{agent.role}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: isRunning ? '#3ecf8e' : 'var(--border-light)' }} />
                          <span style={{ fontSize: 8.5, color: isRunning ? '#3ecf8e' : 'var(--text-dim)' }}>{isRunning ? 'Ativo' : 'Online'}</span>
                          {total > 0 && <span style={{ fontSize: 8.5, color: 'var(--text-dim)', marginLeft: 'auto' }}>{total} missões</span>}
                        </div>
                      </motion.div>
                    )
                  })}
                  {layerAgents.length === 0 && (
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0', border: '1px dashed var(--border)', borderRadius: 7 }}>vazio</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {visible.length === 0 && (
          <div style={{ textAlign: 'center', color: '#888888', padding: '60px 20px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 22, marginBottom: 10, display: 'block', opacity: 0.3 }} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>Nenhum agente encontrado</div>
          </div>
        )}
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selectedAgent && (
          <AgentDrawer
            key={selectedAgent.id}
            agent={selectedAgent}
            stats={agentStats}
            loading={loadingStats}
            onClose={() => { setSelectedAgent(null); setAgentStats(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
