'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AGENTS_V2, type AgentV2 } from '@/lib/agents-v2'
import { supabase } from '@/lib/supabase'

type Role = 'user' | 'assistant'
type Msg = { id: string; role: Role; content: string; agentId?: string; streaming?: boolean }

function uid() { return Math.random().toString(36).slice(2) }

async function getToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

function getSugestoes(agent: AgentV2): string[] {
  return [
    `Faça uma análise de ${agent.role} para o meu negócio`,
    `Quais são suas prioridades para os próximos 30 dias?`,
    `Me dê um diagnóstico rápido com recomendações práticas`,
  ]
}

function AgentAvatar({ agente, size = 28 }: { agente?: AgentV2; size?: number }) {
  if (!agente) return null
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.25), background: agente.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
      {agente.initial}
    </div>
  )
}

const LAYER_ORDER = ['C1', 'C2', 'C3', 'C4', 'CA'] as const
const LAYER_LABELS: Record<string, string> = {
  C1: 'Executive Council',
  C2: 'Research & Intel',
  C3: 'Directors',
  C4: 'Specialists',
  CA: 'Chief of Staff',
}

export default function ChatPage() {
  const [ativo, setAtivo] = useState<AgentV2>(Object.values(AGENTS_V2)[0])
  const [histories, setHistories] = useState<Record<string, Msg[]>>({})
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollPositions = useRef<Record<string, number>>({})
  const atBottomRef = useRef(true)
  const ativoRef = useRef(ativo)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => { ativoRef.current = ativo }, [ativo])

  const msgs = histories[ativo.id] ?? []
  const streamingContent = streaming ? (msgs[msgs.length - 1]?.content ?? '') : ''

  // Auto-scroll when at bottom
  useEffect(() => {
    if (!atBottomRef.current) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs.length, streamingContent])

  // Restore scroll position when switching agents (top=0 for new conversations)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const saved = scrollPositions.current[ativo.id]
    el.scrollTop = saved ?? 0
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    atBottomRef.current = isNearBottom
    setShowScrollBtn(!isNearBottom && el.scrollHeight > el.clientHeight + 60)
  }, [ativo.id])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    atBottomRef.current = isNearBottom
    setShowScrollBtn(!isNearBottom && el.scrollHeight > el.clientHeight + 60)
  }

  function scrollToBottom() {
    atBottomRef.current = true
    setShowScrollBtn(false)
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  function switchAgent(a: AgentV2) {
    if (a.id === ativo.id) return
    scrollPositions.current[ativo.id] = scrollRef.current?.scrollTop ?? 0
    setUnread(prev => ({ ...prev, [a.id]: 0 }))
    setAtivo(a)
    if (!histories[a.id]?.length) {
      setHistories(prev => ({
        ...prev,
        [a.id]: [{ id: uid(), role: 'assistant', agentId: a.id, content: `Olá! Sou ${a.name}. ${a.role}. Como posso ajudar?` }],
      }))
    }
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    const mention = text.match(/@(\w+)/)
    let targetAgent = ativo
    if (mention) {
      const found = AGENTS_V2[mention[1].toUpperCase()]
      if (found && found.id !== ativo.id) targetAgent = found
    }

    const targetId = targetAgent.id
    const userMsg: Msg = { id: uid(), role: 'user', content: text }
    const assistantId = uid()
    const assistantMsg: Msg = { id: assistantId, role: 'assistant', agentId: targetId, content: '', streaming: true }
    const currentHistory = histories[targetId] ?? []

    setHistories(prev => ({
      ...prev,
      [targetId]: [...(prev[targetId] ?? []), userMsg, assistantMsg],
    }))
    setInput('')
    setStreaming(true)
    atBottomRef.current = true
    setShowScrollBtn(false)
    setTimeout(() => {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    }, 30)

    const apiHistory = [...currentHistory, userMsg]
      .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content?.trim())
      .map(m => ({ role: m.role, content: m.content }))
      .slice(-5)

    try {
      const token = await getToken()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      const res = await fetch('/api/hub/chat-stream', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ agentId: targetId, messages: apiHistory }),
      })

      if (!res.ok || !res.body) {
        setHistories(prev => ({
          ...prev,
          [targetId]: (prev[targetId] ?? []).map(m =>
            m.id === assistantId ? { ...m, content: 'Erro ao conectar com o agente.', streaming: false } : m
          ),
        }))
        setStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw) as { token?: string }
            if (parsed.token) {
              full += parsed.token
              setHistories(prev => ({
                ...prev,
                [targetId]: (prev[targetId] ?? []).map(m =>
                  m.id === assistantId ? { ...m, content: full } : m
                ),
              }))
            }
          } catch { /* skip */ }
        }
      }

      setHistories(prev => ({
        ...prev,
        [targetId]: (prev[targetId] ?? []).map(m =>
          m.id === assistantId ? { ...m, streaming: false } : m
        ),
      }))

      if (targetId !== ativoRef.current.id) {
        setUnread(prev => ({ ...prev, [targetId]: (prev[targetId] ?? 0) + 1 }))
      }
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        setHistories(prev => ({
          ...prev,
          [targetId]: (prev[targetId] ?? []).map(m =>
            m.id === assistantId ? { ...m, content: 'Erro de rede.', streaming: false } : m
          ),
        }))
      }
    }

    setStreaming(false)
    abortRef.current = null
    inputRef.current?.focus()
  }, [input, streaming, histories, ativo])

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
  }

  function clearChat() {
    setHistories(prev => ({ ...prev, [ativo.id]: [] }))
  }

  const agentsByLayer = LAYER_ORDER.map(layer => ({
    layer,
    label: LAYER_LABELS[layer],
    agents: Object.values(AGENTS_V2).filter(a => a.layer === layer),
  }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 0, height: 'calc(100vh - 60px)', overflow: 'hidden', borderRadius: 12, border: '0.5px solid var(--border)', background: 'var(--surface)' }}>

      {/* Agent sidebar */}
      <div style={{ borderRight: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Squad — 28 agentes</div>
          <div style={{ fontSize: 9.5, color: 'var(--text-dim)' }}>Use @ID para mencionar</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px' }}>
          {agentsByLayer.map(({ layer, label, agents }) => (
            <div key={layer}>
              <div style={{ fontSize: 8.5, fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.1em', padding: '8px 4px 4px' }}>
                {label}
              </div>
              {agents.map((a, i) => {
                const sel = a.id === ativo.id
                const badge = unread[a.id] ?? 0
                const msgCount = (histories[a.id] ?? []).filter(m => m.role === 'assistant').length
                return (
                  <motion.button
                    key={a.id}
                    onClick={() => switchAgent(a)}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    whileHover={{ x: 2 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left',
                      padding: '6px 8px', borderRadius: 6, marginBottom: 1, cursor: 'pointer',
                      background: sel ? `${a.color}14` : 'transparent',
                      border: `0.5px solid ${sel ? a.color + '50' : 'transparent'}`,
                      transition: 'all .12s',
                    }}
                  >
                    <div style={{ width: 22, height: 22, borderRadius: 5, background: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7.5, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {a.initial}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 10.5, fontWeight: sel ? 600 : 500, color: sel ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                      <div style={{ fontSize: 8.5, color: 'var(--text-dim)', marginTop: 1 }}>
                        @{a.id}{msgCount > 0 ? ` · ${msgCount} msg` : ''}
                      </div>
                    </div>
                    {badge > 0 && !sel && (
                      <div style={{ minWidth: 15, height: 15, borderRadius: 8, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7.5, fontWeight: 800, color: '#fff', padding: '0 3px', flexShrink: 0 }}>
                        {badge}
                      </div>
                    )}
                    {sel && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', marginLeft: 'auto', flexShrink: 0 }} />}
                  </motion.button>
                )
              })}
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 12px', borderTop: '0.5px solid var(--border)', flexShrink: 0 }}>
          <button onClick={clearChat} className="btn btn-ghost btn-sm" style={{ width: '100%', fontSize: 11 }}>
            <i className="fa-solid fa-trash-can" style={{ fontSize: 10 }} />Limpar conversa
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

        {/* Topbar */}
        <div style={{ padding: '12px 18px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: ativo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>
            {ativo.initial}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{ativo.name}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{ativo.role}</div>
          </div>
          <AnimatePresence>
            {streaming && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <motion.div style={{ width: 6, height: 6, borderRadius: '50%', background: ativo.color }}
                  animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>respondendo...</span>
                <button onClick={() => { abortRef.current?.abort(); setStreaming(false) }}
                  style={{ fontSize: 10, color: '#ef4444', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', fontWeight: 600 }}>
                  parar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div style={{ marginLeft: streaming ? 0 : 'auto', fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: `${ativo.color}15`, color: ativo.color }}>
            {LAYER_LABELS[ativo.layer]}
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px' }}>
          {msgs.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: ativo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff' }}>
                {ativo.initial}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{ativo.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 320 }}>{ativo.role}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 400 }}>
                {getSugestoes(ativo).map(s => (
                  <motion.button key={s} onClick={() => { setInput(s); inputRef.current?.focus() }}
                    whileHover={{ x: 4 }}
                    style={{ padding: '10px 14px', borderRadius: 8, textAlign: 'left', cursor: 'pointer', background: 'var(--surface-2)', border: '0.5px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'inherit' }}>
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: 9, color: ativo.color, marginRight: 8 }} />
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {msgs.map((m) => {
              const agente = m.agentId ? AGENTS_V2[m.agentId] : undefined
              const isUser = m.role === 'user'
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                  style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: 10, marginBottom: 16, alignItems: 'flex-start' }}>
                  {!isUser && <AgentAvatar agente={agente} size={30} />}
                  {isUser && (
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="fa-solid fa-user" style={{ fontSize: 11, color: 'var(--text-muted)' }} />
                    </div>
                  )}
                  <div style={{ maxWidth: '75%' }}>
                    {!isUser && (
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: agente?.color ?? 'var(--text-muted)', marginBottom: 5 }}>
                        {agente?.name ?? 'Agente'}
                      </div>
                    )}
                    <div style={{
                      padding: '11px 14px',
                      borderRadius: isUser ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
                      background: isUser ? 'var(--accent)' : 'var(--surface-2)',
                      border: isUser ? 'none' : '0.5px solid var(--border)',
                      fontSize: 13, color: isUser ? '#fff' : 'var(--text)',
                      lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      {m.content || (m.streaming && (
                        <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.7 }}
                          style={{ display: 'inline-block', width: 8, height: 13, background: agente?.color ?? 'var(--text-muted)', borderRadius: 2 }} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Scroll-to-bottom */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              onClick={scrollToBottom}
              style={{
                position: 'absolute', bottom: 76, right: 20, zIndex: 10,
                padding: '7px 14px', borderRadius: 20,
                background: 'var(--surface)', border: `1px solid ${ativo.color}40`,
                boxShadow: `0 2px 16px rgba(0,0,0,.35), 0 0 0 1px ${ativo.color}20`,
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                color: ativo.color, display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <i className="fa-solid fa-arrow-down" style={{ fontSize: 9 }} />
              Ir para o fim
            </motion.button>
          )}
        </AnimatePresence>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--surface-2)', borderRadius: 10, border: `0.5px solid ${streaming ? ativo.color + '60' : 'var(--border)'}`, padding: '10px 14px', transition: 'border-color .2s' }}>
            <textarea
              ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={streaming}
              placeholder={`Mensagem para ${ativo.name}… (Shift+Enter para nova linha)`}
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', resize: 'none', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto' }}
              onInput={e => {
                const t = e.currentTarget
                t.style.height = 'auto'
                t.style.height = `${Math.min(t.scrollHeight, 120)}px`
              }}
            />
            <motion.button
              onClick={() => void send()}
              disabled={streaming || !input.trim()}
              whileHover={!streaming && input.trim() ? { scale: 1.05 } : {}}
              whileTap={!streaming && input.trim() ? { scale: 0.95 } : {}}
              style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: streaming || !input.trim() ? 'var(--surface-3)' : ativo.color,
                border: 'none', cursor: streaming || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s',
              }}
            >
              {streaming
                ? <motion.i className="fa-solid fa-circle-notch" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} style={{ fontSize: 12, color: 'var(--text-dim)' }} />
                : <i className="fa-solid fa-paper-plane" style={{ fontSize: 12, color: input.trim() ? '#fff' : 'var(--text-dim)' }} />
              }
            </motion.button>
          </div>
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 9.5, color: 'var(--text-dim)' }}>Enter para enviar · Shift+Enter nova linha · @ID para mencionar</span>
          </div>
        </div>
      </div>
    </div>
  )
}
