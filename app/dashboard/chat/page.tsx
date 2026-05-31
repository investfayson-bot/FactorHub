'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AGENTES, type Agente } from '@/lib/hub-agentes'
import { supabase } from '@/lib/supabase'

type Role = 'user' | 'assistant'
type Msg = { id: string; role: Role; content: string; agentId?: string; streaming?: boolean }

function uid() { return Math.random().toString(36).slice(2) }

async function getToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

function AgentAvatar({ agente, size = 28 }: { agente?: Agente; size?: number }) {
  if (!agente) return null
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.25), background: agente.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
      {agente.inicial}
    </div>
  )
}

export default function ChatPage() {
  const [ativo, setAtivo] = useState<Agente>(AGENTES[0])
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  // Switch agent: add a system note to the conversation
  function switchAgent(a: Agente) {
    if (a.id === ativo.id) return
    setAtivo(a)
    setMsgs(prev => [...prev, {
      id: uid(), role: 'assistant', agentId: a.id,
      content: `Olá! Sou o ${a.nome}. Como posso ajudar?`,
    }])
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    // Detect @mention to switch agent
    const mention = text.match(/@(\w+)/)
    let activeAgent = ativo
    if (mention) {
      const found = AGENTES.find(a => a.id === mention[1].toLowerCase())
      if (found && found.id !== ativo.id) {
        setAtivo(found)
        activeAgent = found
      }
    }

    const userMsg: Msg = { id: uid(), role: 'user', content: text }
    const assistantId = uid()
    const assistantMsg: Msg = { id: assistantId, role: 'assistant', agentId: activeAgent.id, content: '', streaming: true }

    setMsgs(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setStreaming(true)

    const history = [...msgs, userMsg]
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))
      .filter(m => m.content.trim())
      .slice(-20)

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
        body: JSON.stringify({ agentId: activeAgent.id, messages: history }),
      })

      if (!res.ok || !res.body) {
        setMsgs(prev => prev.map(m => m.id === assistantId
          ? { ...m, content: 'Erro ao conectar com o agente.', streaming: false }
          : m))
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
              setMsgs(prev => prev.map(m => m.id === assistantId ? { ...m, content: full } : m))
            }
          } catch { /* skip */ }
        }
      }

      setMsgs(prev => prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m))
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        setMsgs(prev => prev.map(m => m.id === assistantId
          ? { ...m, content: 'Erro de rede.', streaming: false }
          : m))
      }
    }

    setStreaming(false)
    abortRef.current = null
    inputRef.current?.focus()
  }, [input, streaming, msgs, ativo])

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
  }

  function clearChat() {
    setMsgs([])
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 0, height: 'calc(100vh - 60px)', overflow: 'hidden', borderRadius: 12, border: '0.5px solid var(--border)', background: 'var(--surface)' }}>

      {/* Agent sidebar */}
      <div style={{ borderRight: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Agentes</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Use @agente para mencionar</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {AGENTES.map((a, i) => {
            const sel = a.id === ativo.id
            return (
              <motion.button
                key={a.id}
                onClick={() => switchAgent(a)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ x: 2 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                  padding: '8px 9px', borderRadius: 7, marginBottom: 2, cursor: 'pointer',
                  background: sel ? `${a.cor}14` : 'transparent',
                  border: `0.5px solid ${sel ? a.cor + '50' : 'transparent'}`,
                  transition: 'all .12s',
                }}
              >
                <div style={{ width: 26, height: 26, borderRadius: 6, background: a.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {a.inicial}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: sel ? 600 : 500, color: sel ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nome}</div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-dim)', marginTop: 1 }}>@{a.id}</div>
                </div>
                {sel && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', marginLeft: 'auto', flexShrink: 0 }} />}
              </motion.button>
            )
          })}
        </div>
        <div style={{ padding: '10px 12px', borderTop: '0.5px solid var(--border)' }}>
          <button
            onClick={clearChat}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', fontSize: 11 }}
          >
            <i className="fa-solid fa-trash-can" style={{ fontSize: 10 }} />Limpar conversa
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ padding: '12px 18px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: ativo.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>
            {ativo.inicial}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{ativo.nome}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{ativo.especialidade}</div>
          </div>
          <AnimatePresence>
            {streaming && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <motion.div
                  style={{ width: 6, height: 6, borderRadius: '50%', background: ativo.cor }}
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                />
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>respondendo...</span>
                <button
                  onClick={() => { abortRef.current?.abort(); setStreaming(false) }}
                  style={{ fontSize: 10, color: 'var(--red)', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', fontWeight: 600 }}
                >
                  parar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div style={{ marginLeft: streaming ? 0 : 'auto', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: `${ativo.cor}15`, color: ativo.cor }}>
            IA
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px' }}>
          {msgs.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}
            >
              <div style={{ width: 56, height: 56, borderRadius: 14, background: ativo.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff' }}>
                {ativo.inicial}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{ativo.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 320 }}>{ativo.especialidade}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 400 }}>
                {ativo.sugestoes.map(s => (
                  <motion.button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus() }}
                    whileHover={{ x: 4 }}
                    style={{
                      padding: '10px 14px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                      background: 'var(--surface-2)', border: '0.5px solid var(--border)',
                      fontSize: 12, color: 'var(--text-muted)', fontFamily: 'inherit',
                    }}
                  >
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: 9, color: ativo.cor, marginRight: 8 }} />
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {msgs.map((m) => {
              const agente = AGENTES.find(a => a.id === m.agentId)
              const isUser = m.role === 'user'
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex',
                    flexDirection: isUser ? 'row-reverse' : 'row',
                    gap: 10,
                    marginBottom: 16,
                    alignItems: 'flex-start',
                  }}
                >
                  {!isUser && <AgentAvatar agente={agente} size={30} />}
                  {isUser && (
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="fa-solid fa-user" style={{ fontSize: 11, color: 'var(--text-muted)' }} />
                    </div>
                  )}
                  <div style={{ maxWidth: '75%' }}>
                    {!isUser && (
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: agente?.cor ?? 'var(--text-muted)', marginBottom: 5 }}>
                        {agente?.nome ?? 'Agente'}
                      </div>
                    )}
                    <div style={{
                      padding: '11px 14px',
                      borderRadius: isUser ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
                      background: isUser ? 'var(--accent)' : 'var(--surface-2)',
                      border: isUser ? 'none' : '0.5px solid var(--border)',
                      fontSize: 13,
                      color: isUser ? '#fff' : 'var(--text)',
                      lineHeight: 1.65,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {m.content || (m.streaming && (
                        <motion.span
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ repeat: Infinity, duration: 0.7 }}
                          style={{ display: 'inline-block', width: 8, height: 13, background: agente?.cor ?? 'var(--text-muted)', borderRadius: 2 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--surface-2)', borderRadius: 10, border: `0.5px solid ${streaming ? ativo.cor + '60' : 'var(--border)'}`, padding: '10px 14px', transition: 'border-color .2s' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={streaming}
              placeholder={`Mensagem para ${ativo.nome}… (Shift+Enter para nova linha)`}
              rows={1}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', resize: 'none',
                lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
              }}
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
                background: streaming || !input.trim() ? 'var(--surface-3)' : ativo.cor,
                border: 'none', cursor: streaming || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .15s',
              }}
            >
              {streaming
                ? <motion.i className="fa-solid fa-circle-notch" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} style={{ fontSize: 12, color: 'var(--text-dim)' }} />
                : <i className="fa-solid fa-paper-plane" style={{ fontSize: 12, color: input.trim() ? '#fff' : 'var(--text-dim)' }} />
              }
            </motion.button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9.5, color: 'var(--text-dim)' }}>Enter para enviar · Shift+Enter nova linha · @agente para mencionar</span>
          </div>
        </div>
      </div>
    </div>
  )
}
