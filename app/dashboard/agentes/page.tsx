'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AGENTS_V2, type AgentV2, type AgentLayer } from '@/lib/agents-v2'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type LayerTab = AgentLayer | 'ALL'

type AgentActivity = {
  agentId: string
  lastActive: string | null
  totalTasks: number
  status: 'idle' | 'running' | 'busy'
}

type ChatMsg = { role: 'user' | 'assistant'; content: string }

const LAYER_TABS: { id: LayerTab; label: string; desc: string; color: string }[] = [
  { id: 'ALL', label: 'Todos', desc: '26 agentes', color: '#e8622a' },
  { id: 'C1', label: 'C1 — Conselho', desc: '7 executivos', color: '#e8622a' },
  { id: 'C2', label: 'C2 — Pesquisa', desc: '6 analistas', color: '#0d9488' },
  { id: 'C3', label: 'C3 — Diretores', desc: '8 diretores', color: '#6366f1' },
  { id: 'C4', label: 'C4 — Especialistas', desc: '4 especialistas', color: '#d97706' },
  { id: 'CA', label: 'CA — Chief of Staff', desc: '1 síntese', color: '#7c3aed' },
]

const LAYER_ORDER: AgentLayer[] = ['C1', 'C2', 'C3', 'C4', 'CA']

const agents = Object.values(AGENTS_V2)

async function getToken() {
  const { data: sess } = await supabase.auth.getSession()
  return sess.session?.access_token ?? ''
}

// ─── AgentCard ────────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  activity,
  onClick,
  isSelected,
}: {
  agent: AgentV2
  activity: AgentActivity | undefined
  onClick: () => void
  isSelected: boolean
}) {
  const isRunning = activity?.status === 'running'

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18 }}
      style={{
        width: '100%',
        textAlign: 'left',
        background: isSelected ? 'var(--surface-2)' : 'var(--surface)',
        border: `1px solid ${isSelected ? agent.color : 'var(--border)'}`,
        borderRadius: 12,
        padding: '14px 16px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isSelected ? `0 0 0 1px ${agent.color}40, 0 4px 20px ${agent.color}20` : 'none',
        transition: 'border-color .2s, box-shadow .2s',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: isRunning || isSelected ? agent.color : 'transparent', transition: 'background .3s' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <motion.div
            animate={isRunning ? { boxShadow: [`0 0 0 0px ${agent.color}60`, `0 0 0 8px ${agent.color}00`] } : {}}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: `${agent.color}20`,
              border: `2px solid ${agent.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: agent.color, letterSpacing: 0.5,
            }}
          >
            {agent.initial}
          </motion.div>
          <motion.div
            animate={isRunning ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 10, height: 10, borderRadius: '50%',
              background: isRunning ? '#22c55e' : '#374151',
              border: '2px solid var(--surface)',
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{agent.name}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
              color: agent.color, background: `${agent.color}15`,
              padding: '2px 6px', borderRadius: 4,
            }}>{agent.layer}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {agent.role}
          </div>
          {activity && activity.totalTasks > 0 && (
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, opacity: 0.6 }}>
              {activity.totalTasks} missão{activity.totalTasks !== 1 ? 'ões' : ''} executadas
            </div>
          )}
        </div>

        <i className="fa-solid fa-chevron-right" style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.4 }} />
      </div>
    </motion.button>
  )
}

// ─── AgentPanel ───────────────────────────────────────────────────────────────

function AgentPanel({ agent, onClose }: { agent: AgentV2; onClose: () => void }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, streaming])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
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
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = dec.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6)
          if (d === '[DONE]') break
          try {
            const t = JSON.parse(d).choices?.[0]?.delta?.content ?? ''
            full += t
            setStreaming(full)
          } catch { /* ignore */ }
        }
      }
      setMsgs(prev => [...prev, { role: 'assistant', content: full }])
      setStreaming('')
    } catch (e) {
      setMsgs(prev => [...prev, { role: 'assistant', content: `Erro: ${e}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ duration: 0.22 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}
    >
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: `linear-gradient(135deg, ${agent.color}12 0%, transparent 100%)`,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: `${agent.color}20`, border: `2px solid ${agent.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: agent.color,
        }}>{agent.initial}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{agent.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{agent.role}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, fontSize: 16 }}>
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {msgs.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 20px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 14px',
              background: `${agent.color}15`, border: `2px solid ${agent.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: agent.color,
            }}>{agent.initial}</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{agent.name}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Faça uma pergunta ou solicite uma análise</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}>
            {m.role === 'assistant' && (
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: `${agent.color}20`, border: `1.5px solid ${agent.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, color: agent.color, marginTop: 2,
              }}>{agent.initial}</div>
            )}
            <div style={{
              maxWidth: '80%',
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
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: `${agent.color}20`, border: `1.5px solid ${agent.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: agent.color, marginTop: 2,
            }}>{agent.initial}</div>
            <div style={{
              maxWidth: '80%', background: 'var(--surface-2)', borderRadius: '14px 14px 14px 4px',
              padding: '10px 14px', fontSize: 13, lineHeight: 1.6,
              border: '1px solid var(--border)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {streaming}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{ display: 'inline-block', width: 2, height: 13, background: agent.color, marginLeft: 2, verticalAlign: 'middle' }}
              />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={`Pergunte ao ${agent.name}…`}
            rows={2}
            style={{
              flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 14px', fontSize: 13,
              color: 'var(--foreground)', resize: 'none', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit',
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              width: 40, height: 40, borderRadius: 10, border: 'none',
              background: loading || !input.trim() ? 'var(--border)' : agent.color,
              color: '#fff', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            {loading
              ? <motion.i className="fa-solid fa-spinner" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ fontSize: 13 }} />
              : <i className="fa-solid fa-paper-plane" style={{ fontSize: 13 }} />
            }
          </button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6, opacity: 0.5 }}>Enter para enviar · Shift+Enter nova linha</div>
      </div>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AgentesPage() {
  const [activeTab, setActiveTab] = useState<LayerTab>('ALL')
  const [selectedAgent, setSelectedAgent] = useState<AgentV2 | null>(null)
  const [activities, setActivities] = useState<Record<string, AgentActivity>>({})
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadActivities()
  }, [])

  async function loadActivities() {
    try {
      const token = await getToken()
      const res = await fetch('/api/hub/missions-list', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!res.ok) return
      const data = await res.json()
      const missions: { agents_used?: string[]; created_at: string; status: string }[] = data.missions ?? []
      const map: Record<string, AgentActivity> = {}
      for (const m of missions) {
        for (const aid of (m.agents_used ?? [])) {
          if (!map[aid]) map[aid] = { agentId: aid, lastActive: null, totalTasks: 0, status: 'idle' }
          map[aid].totalTasks++
          if (!map[aid].lastActive || m.created_at > map[aid].lastActive!) map[aid].lastActive = m.created_at
          if (m.status === 'running') map[aid].status = 'running'
        }
      }
      setActivities(map)
    } catch { /* ignore */ }
  }

  const visibleAgents = agents.filter(a => {
    const matchLayer = activeTab === 'ALL' || a.layer === activeTab
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.role.toLowerCase().includes(search.toLowerCase())
    return matchLayer && matchSearch
  }).sort((a, b) => {
    const lo = LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer)
    return lo !== 0 ? lo : a.name.localeCompare(b.name)
  })

  const activeTabInfo = LAYER_TABS.find(t => t.id === activeTab)!

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '24px 28px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Squad de Agentes</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>26 agentes · 4 camadas · clique para interagir diretamente</p>
          </div>
          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar agente…"
              style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '8px 14px 8px 34px', fontSize: 13,
                color: 'var(--foreground)', outline: 'none', width: 200,
              }}
            />
          </div>
        </div>

        {/* Layer tabs */}
        <div style={{ display: 'flex', gap: 6, paddingBottom: 16, overflowX: 'auto' }}>
          {LAYER_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flexShrink: 0, padding: '7px 14px', borderRadius: 8, border: 'none',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: activeTab === tab.id ? tab.color : 'var(--surface-2)',
              color: activeTab === tab.id ? '#fff' : 'var(--muted)',
              transition: 'all .15s',
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', gap: 16, padding: '0 28px 24px', overflow: 'hidden' }}>
        {/* List */}
        <div style={{ flex: selectedAgent ? '0 0 340px' : 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeTab !== 'ALL' && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 4,
              background: `${activeTabInfo.color}10`, border: `1px solid ${activeTabInfo.color}30`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: activeTabInfo.color }}>{activeTabInfo.label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{activeTabInfo.desc}</div>
            </div>
          )}

          {visibleAgents.length === 0
            ? <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '60px 20px', fontSize: 13 }}>Nenhum agente encontrado</div>
            : activeTab === 'ALL'
              ? LAYER_ORDER.map(layer => {
                  const layerAgents = visibleAgents.filter(a => a.layer === layer)
                  if (!layerAgents.length) return null
                  const info = LAYER_TABS.find(t => t.id === layer)!
                  return (
                    <div key={layer}>
                      <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: info.color }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: info.color, letterSpacing: 0.5 }}>{info.label.toUpperCase()}</span>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{layerAgents.length} agentes</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                        {layerAgents.map(agent => (
                          <AgentCard key={agent.id} agent={agent} activity={activities[agent.id]} isSelected={selectedAgent?.id === agent.id}
                            onClick={() => setSelectedAgent(prev => prev?.id === agent.id ? null : agent)} />
                        ))}
                      </div>
                    </div>
                  )
                })
              : visibleAgents.map(agent => (
                  <AgentCard key={agent.id} agent={agent} activity={activities[agent.id]} isSelected={selectedAgent?.id === agent.id}
                    onClick={() => setSelectedAgent(prev => prev?.id === agent.id ? null : agent)} />
                ))
          }
        </div>

        {/* Panel */}
        <AnimatePresence>
          {selectedAgent && (
            <motion.div
              key={selectedAgent.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0, minWidth: 380, flex: 1 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: 'hidden' }}
            >
              <AgentPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
