'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AGENTS_V2, type AgentV2, type AgentLayer } from '@/lib/agents-v2'
import { supabase } from '@/lib/supabase'

type LayerTab = AgentLayer | 'ALL'
type ChatMsg = { role: 'user' | 'assistant'; content: string }

type AgentActivity = {
  agentId: string
  lastActive: string | null
  totalTasks: number
  currentMission: string | null
  status: 'idle' | 'running'
}

const LAYER_TABS: { id: LayerTab; label: string; color: string; icon: string }[] = [
  { id: 'ALL', label: 'Todos', color: '#e8622a', icon: 'fa-grid-2' },
  { id: 'C1', label: 'Conselho', color: '#e8622a', icon: 'fa-crown' },
  { id: 'C2', label: 'Pesquisa', color: '#0d9488', icon: 'fa-magnifying-glass-chart' },
  { id: 'C3', label: 'Diretores', color: '#6366f1', icon: 'fa-sitemap' },
  { id: 'C4', label: 'Especialistas', color: '#d97706', icon: 'fa-wrench' },
  { id: 'CA', label: 'Chief of Staff', color: '#7c3aed', icon: 'fa-star' },
]

const LAYER_ORDER: AgentLayer[] = ['C1', 'C2', 'C3', 'C4', 'CA']

const LAYER_DESCS: Record<string, string> = {
  C1: 'Conselho Executivo',
  C2: 'Pesquisa & Análise',
  C3: 'Diretores Operacionais',
  C4: 'Especialistas',
  CA: 'Chief of Staff',
}

const agents = Object.values(AGENTS_V2)

async function getToken() {
  const { data: sess } = await supabase.auth.getSession()
  return sess.session?.access_token ?? ''
}

// ─── Agent Card (grid tile) ───────────────────────────────────────────────────

function AgentCard({ agent, activity, onClick }: {
  agent: AgentV2
  activity: AgentActivity | undefined
  onClick: () => void
}) {
  const isRunning = activity?.status === 'running'

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.16 }}
      style={{
        aspectRatio: '1 / 1',
        background: 'var(--surface)',
        border: `1.5px solid ${isRunning ? agent.color : 'var(--border)'}`,
        borderRadius: 16,
        padding: '18px 14px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isRunning ? `0 0 20px ${agent.color}25` : '0 1px 4px rgba(0,0,0,.15)',
        textAlign: 'center',
      }}
    >
      {/* top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: agent.color, borderRadius: '16px 16px 0 0', opacity: isRunning ? 1 : 0.35 }} />

      {/* Layer pill */}
      <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 8, fontWeight: 800, letterSpacing: 0.8, padding: '2px 6px', borderRadius: 4, background: `${agent.color}20`, color: agent.color }}>
        {agent.layer}
      </div>

      {/* Avatar */}
      <div style={{ position: 'relative' }}>
        <motion.div
          animate={isRunning ? { boxShadow: [`0 0 0 0px ${agent.color}60`, `0 0 0 10px ${agent.color}00`] } : {}}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: `${agent.color}18`,
            border: `2.5px solid ${agent.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: agent.color, letterSpacing: 0.5,
          }}
        >
          {agent.initial}
        </motion.div>
        <motion.div
          animate={isRunning ? { scale: [1, 1.4, 1], opacity: [1, 0.7, 1] } : {}}
          transition={{ duration: 0.9, repeat: Infinity }}
          style={{
            position: 'absolute', bottom: -1, right: -1,
            width: 12, height: 12, borderRadius: '50%',
            background: isRunning ? '#22c55e' : '#374151',
            border: '2px solid var(--surface)',
          }}
        />
      </div>

      {/* Name */}
      <div style={{ width: '100%' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.3, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {agent.name}
        </div>
        <div style={{ fontSize: 9, color: 'var(--muted)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {agent.role}
        </div>
      </div>

      {/* Status chip */}
      <div style={{
        fontSize: 8, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
        background: isRunning ? '#22c55e20' : 'var(--surface-2)',
        color: isRunning ? '#22c55e' : 'var(--muted)',
        letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: isRunning ? '#22c55e' : '#374151' }} />
        {isRunning ? 'ATIVO' : activity?.totalTasks ? `${activity.totalTasks} missões` : 'DISPONÍVEL'}
      </div>
    </motion.button>
  )
}

// ─── Agent Modal ──────────────────────────────────────────────────────────────

function AgentModal({ agent, activity, onClose }: {
  agent: AgentV2
  activity: AgentActivity | undefined
  onClose: () => void
}) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState('')
  const [tab, setTab] = useState<'info' | 'chat'>('info')
  const bottomRef = useRef<HTMLDivElement>(null)
  const isRunning = activity?.status === 'running'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, streaming])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setTab('chat')
    const userMsg: ChatMsg = { role: 'user', content: text }
    setMsgs(prev => [...prev, userMsg])
    setLoading(true)
    setStreaming('')
    try {
      const token = await getToken()
      const res = await fetch('/api/hub/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ agentId: agent.id, messages: [...msgs, userMsg] }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const reader = res.body?.getReader()
      if (!reader) throw new Error('no stream')
      let full = ''
      const dec = new TextDecoder()
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
          if (d === '[DONE]') break
          try { full += JSON.parse(d).choices?.[0]?.delta?.content ?? ''; setStreaming(full) } catch { /* ignore */ }
        }
      }
      setMsgs(prev => [...prev, { role: 'assistant', content: full }])
      setStreaming('')
    } catch (e) {
      setMsgs(prev => [...prev, { role: 'assistant', content: `Erro: ${e}` }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, msgs, agent.id])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 20, opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{
          width: '100%', maxWidth: 600,
          maxHeight: 'calc(100vh - 48px)',
          background: 'var(--surface)',
          border: `1.5px solid ${agent.color}50`,
          borderRadius: 20,
          boxShadow: `0 24px 80px rgba(0,0,0,.5), 0 0 0 1px ${agent.color}20`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          background: `linear-gradient(135deg, ${agent.color}18 0%, transparent 60%)`,
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <motion.div
                animate={isRunning ? { boxShadow: [`0 0 0 0px ${agent.color}50`, `0 0 0 12px ${agent.color}00`] } : {}}
                transition={{ duration: 1.4, repeat: Infinity }}
                style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: `${agent.color}18`, border: `2.5px solid ${agent.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800, color: agent.color,
                }}
              >
                {agent.initial}
              </motion.div>
              <div style={{
                position: 'absolute', bottom: 1, right: 1,
                width: 14, height: 14, borderRadius: '50%',
                background: isRunning ? '#22c55e' : '#374151',
                border: '2px solid var(--surface)',
              }} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{agent.name}</span>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 7px', borderRadius: 5, background: `${agent.color}20`, color: agent.color, letterSpacing: 0.8 }}>
                  {agent.layer}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{agent.role}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: isRunning ? '#22c55e' : '#374151' }} />
                <span style={{ fontSize: 11, color: isRunning ? '#22c55e' : 'var(--muted)', fontWeight: 600 }}>
                  {isRunning ? 'Em execução' : 'Disponível'}
                </span>
                {activity?.totalTasks ? (
                  <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 8 }}>
                    · {activity.totalTasks} missão{activity.totalTasks !== 1 ? 'ões' : ''} executadas
                  </span>
                ) : null}
              </div>
            </div>

            <button onClick={onClose} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--muted)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fa-solid fa-xmark" style={{ fontSize: 13 }} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
            {(['info', 'chat'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: tab === t ? agent.color : 'var(--surface-2)',
                color: tab === t ? '#fff' : 'var(--muted)',
                transition: 'all .15s',
              }}>
                {t === 'info' ? 'Perfil' : `Chat${msgs.length ? ` (${msgs.filter(m => m.role === 'user').length})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <AnimatePresence mode="wait">
          {tab === 'info' ? (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {/* Status card */}
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: isRunning ? '#22c55e18' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`fa-solid ${isRunning ? 'fa-bolt' : 'fa-clock'}`} style={{ fontSize: 14, color: isRunning ? '#22c55e' : 'var(--muted)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                    {isRunning ? 'Executando missão' : 'Aguardando tarefa'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {activity?.currentMission ? `"${activity.currentMission}"` : isRunning ? 'Em andamento…' : 'Nenhuma missão ativa'}
                  </div>
                </div>
              </div>

              {/* Camada */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase' }}>Camada</div>
                <div style={{ background: `${agent.color}12`, border: `1px solid ${agent.color}30`, borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: agent.color, marginBottom: 2 }}>{agent.layer} — {LAYER_DESCS[agent.layer]}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{agent.layerLabel}</div>
                </div>
              </div>

              {/* Especialidade */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase' }}>Especialidade</div>
                <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, background: 'var(--surface-2)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)' }}>
                  {agent.role}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: agent.color }}>{activity?.totalTasks ?? 0}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Missões executadas</div>
                </div>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: agent.color }}>{agent.maxTokens.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Tokens por resposta</div>
                </div>
              </div>

              {/* Last active */}
              {activity?.lastActive && (
                <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', opacity: 0.6 }}>
                  Última atividade: {new Date(activity.lastActive).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}

              {/* CTA */}
              <button
                onClick={() => setTab('chat')}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                  background: agent.color, color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <i className="fa-solid fa-comment-dots" style={{ fontSize: 12 }} />
                Conversar com {agent.name.split(' ')[0]}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {msgs.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 20px' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Faça uma pergunta</div>
                    <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
                      {agent.name} está pronto para ajudar com {agent.role.toLowerCase()}
                    </div>
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}>
                    {m.role === 'assistant' && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `${agent.color}20`, border: `1.5px solid ${agent.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: agent.color, marginTop: 2 }}>
                        {agent.initial}
                      </div>
                    )}
                    <div style={{
                      maxWidth: '78%',
                      background: m.role === 'user' ? 'var(--accent)' : 'var(--surface-2)',
                      color: m.role === 'user' ? '#fff' : 'var(--foreground)',
                      borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      padding: '10px 14px', fontSize: 13, lineHeight: 1.6,
                      border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>{m.content}</div>
                  </div>
                ))}
                {streaming && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `${agent.color}20`, border: `1.5px solid ${agent.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: agent.color, marginTop: 2 }}>
                      {agent.initial}
                    </div>
                    <div style={{ maxWidth: '78%', background: 'var(--surface-2)', borderRadius: '14px 14px 14px 4px', padding: '10px 14px', fontSize: 13, lineHeight: 1.6, border: '1px solid var(--border)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {streaming}
                      <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ display: 'inline-block', width: 2, height: 13, background: agent.color, marginLeft: 2, verticalAlign: 'middle' }} />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
                    placeholder={`Pergunte ao ${agent.name.split(' ')[0]}…`}
                    rows={2}
                    style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--foreground)', resize: 'none', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit' }}
                  />
                  <button
                    onClick={() => void send()}
                    disabled={loading || !input.trim()}
                    style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: loading || !input.trim() ? 'var(--border)' : agent.color, color: '#fff', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    {loading
                      ? <motion.i className="fa-solid fa-spinner" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ fontSize: 13 }} />
                      : <i className="fa-solid fa-paper-plane" style={{ fontSize: 13 }} />}
                  </button>
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6, opacity: 0.5 }}>Enter para enviar · Shift+Enter nova linha</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AgentesPage() {
  const [activeTab, setActiveTab] = useState<LayerTab>('ALL')
  const [selectedAgent, setSelectedAgent] = useState<AgentV2 | null>(null)
  const [activities, setActivities] = useState<Record<string, AgentActivity>>({})
  const [search, setSearch] = useState('')

  useEffect(() => { loadActivities() }, [])

  async function loadActivities() {
    try {
      const token = await getToken()
      const res = await fetch('/api/hub/missions-list', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!res.ok) return
      const data = await res.json()
      const missions: { agents_used?: string[]; created_at: string; status: string; title?: string }[] = data.missions ?? []
      const map: Record<string, AgentActivity> = {}
      for (const m of missions) {
        for (const aid of (m.agents_used ?? [])) {
          if (!map[aid]) map[aid] = { agentId: aid, lastActive: null, totalTasks: 0, currentMission: null, status: 'idle' }
          map[aid].totalTasks++
          if (!map[aid].lastActive || m.created_at > map[aid].lastActive!) map[aid].lastActive = m.created_at
          if (m.status === 'running') { map[aid].status = 'running'; map[aid].currentMission = m.title ?? null }
        }
      }
      setActivities(map)
    } catch { /* ignore */ }
  }

  const visibleAgents = agents.filter(a => {
    const matchLayer = activeTab === 'ALL' || a.layer === activeTab
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.role.toLowerCase().includes(search.toLowerCase())
    return matchLayer && matchSearch
  })

  const layerColor = LAYER_TABS.find(t => t.id === activeTab)?.color ?? '#e8622a'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '24px 28px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Squad de Agentes</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
              {visibleAgents.length} de 26 agentes · clique para ver status e conversar
            </p>
          </div>
          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar agente…"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px 8px 34px', fontSize: 13, color: 'var(--foreground)', outline: 'none', width: 200 }}
            />
          </div>
        </div>

        {/* Layer tabs */}
        <div style={{ display: 'flex', gap: 6, paddingBottom: 16, overflowX: 'auto' }}>
          {LAYER_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flexShrink: 0, padding: '7px 16px', borderRadius: 8, border: `1px solid ${activeTab === tab.id ? tab.color : 'var(--border)'}`,
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: activeTab === tab.id ? tab.color : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--muted)',
              transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <i className={`fa-solid ${tab.icon}`} style={{ fontSize: 10 }} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 28px 28px' }}>
        {activeTab === 'ALL' ? (
          LAYER_ORDER.map(layer => {
            const layerAgents = visibleAgents.filter(a => a.layer === layer)
            if (!layerAgents.length) return null
            const info = LAYER_TABS.find(t => t.id === layer)!
            return (
              <div key={layer} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 4, height: 18, borderRadius: 2, background: info.color }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: info.color, letterSpacing: 0.6, textTransform: 'uppercase' }}>{info.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>{layerAgents.length} agentes</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)', opacity: 0.5 }} />
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: 10,
                }}>
                  {layerAgents.map(agent => (
                    <AgentCard key={agent.id} agent={agent} activity={activities[agent.id]} onClick={() => setSelectedAgent(agent)} />
                  ))}
                </div>
              </div>
            )
          })
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: `${layerColor}10`, border: `1px solid ${layerColor}30`, borderRadius: 10 }}>
              <i className={`fa-solid ${LAYER_TABS.find(t => t.id === activeTab)?.icon}`} style={{ color: layerColor, fontSize: 12 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: layerColor }}>{LAYER_TABS.find(t => t.id === activeTab)?.label}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{LAYER_DESCS[activeTab]}</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)' }}>{visibleAgents.length} agentes</div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 12,
            }}>
              {visibleAgents.map(agent => (
                <AgentCard key={agent.id} agent={agent} activity={activities[agent.id]} onClick={() => setSelectedAgent(agent)} />
              ))}
            </div>
          </div>
        )}

        {visibleAgents.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '80px 20px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Nenhum agente encontrado</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>Tente outro termo de busca</div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <AgentModal
            key={selectedAgent.id}
            agent={selectedAgent}
            activity={activities[selectedAgent.id]}
            onClose={() => setSelectedAgent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
