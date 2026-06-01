'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AGENTS_V2, type AgentV2 } from '@/lib/agents-v2'

type Line = { type: 'cmd' | 'ok' | 'err' | 'info' | 'agent' | 'hint' | 'stream'; text: string }

const agents = Object.values(AGENTS_V2)

const LAYER_COLORS: Record<string, string> = {
  C1: '#e8622a', C2: '#84cc16', C3: '#3ecf8e', C4: '#eab308', CA: '#a855f7',
}

function findAgent(input: string): AgentV2 | null {
  const mention = input.match(/@([A-Za-z]+)/)?.[1]?.toUpperCase()
  if (mention) return AGENTS_V2[mention] ?? agents.find(a => a.name.toUpperCase().includes(mention)) ?? null
  const runId = input.match(/^run\s+(\S+)/i)?.[1]?.toUpperCase()
  if (runId) return AGENTS_V2[runId] ?? agents.find(a => a.id.toUpperCase() === runId) ?? null
  return null
}

function extractTask(input: string): string {
  return input.replace(/@\S+/g, '').replace(/^run\s+\S+\s*/i, '').trim()
}

function lineColor(type: Line['type']): string {
  switch (type) {
    case 'cmd': return '#e8622a'
    case 'ok': return '#4ade80'
    case 'err': return '#f87171'
    case 'agent': return '#fbbf24'
    case 'hint': return '#4b5563'
    case 'stream': return '#e2e8f0'
    default: return '#9ca3af'
  }
}

interface Props { open: boolean; onClose: () => void }

export default function TerminalModal({ open, onClose }: Props) {
  const [lines, setLines] = useState<Line[]>([
    { type: 'info', text: 'FactorHub Terminal v2 — 28 agentes · Ctrl+K para abrir/fechar' },
    { type: 'hint', text: 'Digite "help" · Ex: @CEO analise meu mercado · @CFO modele unit economics' },
  ])
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [height, setHeight] = useState(260)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  // Drag-to-resize handle
  function onDragStart(e: React.MouseEvent) {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startH: height }
    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return
      const delta = dragRef.current.startY - ev.clientY
      setHeight(Math.min(600, Math.max(160, dragRef.current.startH + delta)))
    }
    function onUp() {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const push = useCallback((...newLines: Line[]) => {
    setLines(prev => [...prev, ...newLines])
  }, [])

  async function runAgent(agent: AgentV2, task: string) {
    if (!task) { push({ type: 'err', text: 'Descreva a tarefa após o agente.' }); return }
    setRunning(true)
    push({ type: 'agent', text: `→ ${agent.name} [${agent.layer}]: "${task}"` })
    setLines(prev => [...prev, { type: 'stream', text: '' }])

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: sess } = await supabase.auth.getSession()
      const authToken = sess.session?.access_token

      const res = await fetch('/api/hub/agent-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ agentId: agent.id, messages: [{ role: 'user', content: task }] }),
      })

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => `${res.status}`)
        setLines(prev => { const n = [...prev]; n[n.length - 1] = { type: 'err', text: `Erro ${res.status}: ${errText}` }; return n })
        setRunning(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n')
        buffer = parts.pop() ?? ''
        for (const line of parts) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d === '[DONE]') break
          try {
            const parsed = JSON.parse(d)
            // Support both OpenRouter format and our custom format
            const token = parsed.token ?? parsed.choices?.[0]?.delta?.content ?? ''
            if (token) {
              full += token
              setLines(prev => { const n = [...prev]; n[n.length - 1] = { type: 'stream', text: full }; return n })
            }
          } catch { /* ignore */ }
        }
      }
      setLines(prev => { const n = [...prev]; n[n.length - 1] = { type: 'ok', text: full || '(sem resposta)' }; return n })
    } catch (e) {
      setLines(prev => { const n = [...prev]; n[n.length - 1] = { type: 'err', text: `Erro: ${e}` }; return n })
    }
    setRunning(false)
  }

  async function handleSubmit() {
    const raw = input.trim()
    if (!raw) return
    push({ type: 'cmd', text: `$ ${raw}` })
    setHistory(h => [raw, ...h.slice(0, 49)])
    setHistIdx(-1)
    setInput('')

    const cmd = raw.toLowerCase()

    if (cmd === 'clear') { setLines([]); return }

    if (cmd === 'help') {
      push(
        { type: 'hint', text: '─── Comandos ──────────────────────────────────────' },
        { type: 'hint', text: '  help              este menu' },
        { type: 'hint', text: '  ls                lista todos os 28 agentes' },
        { type: 'hint', text: '  ls c1|c2|c3|c4|ca filtra por camada' },
        { type: 'hint', text: '  status            saúde do sistema' },
        { type: 'hint', text: '  @CEO tarefa       conversa com agente' },
        { type: 'hint', text: '  run CEO tarefa    sintaxe alternativa' },
        { type: 'hint', text: '  clear             limpa o terminal' },
        { type: 'hint', text: '─── Exemplos ───────────────────────────────────────' },
        { type: 'hint', text: '  @CEO valide esta oportunidade de negócio' },
        { type: 'hint', text: '  @CFO modele o unit economics do produto' },
        { type: 'hint', text: '  @CMO crie estratégia de lançamento' },
        { type: 'hint', text: '  @CW escreva copy para landing page' },
      )
      return
    }

    if (cmd === 'status') {
      push(
        { type: 'info', text: `FactorHub OS v2.0 — ${new Date().toLocaleDateString('pt-BR')}` },
        { type: 'ok', text: `${agents.length} agentes (C1:7 C2:6 C3:5 C4:9 CA:1)` },
        { type: 'info', text: 'OpenRouter · Supabase · Vercel — todos ativos' },
      )
      return
    }

    if (cmd.startsWith('ls')) {
      const filter = cmd.replace('ls', '').trim().toUpperCase()
      const filtered = filter ? agents.filter(a => a.layer === filter) : agents
      if (filter && !filtered.length) { push({ type: 'err', text: `Camada "${filter}" inválida. Use: c1, c2, c3, c4, ca` }); return }
      filtered.forEach(a => push({
        type: 'info',
        text: `  @${a.id.padEnd(5)} [${a.layer}]  ${a.name.padEnd(24)} — ${a.role}`,
      }))
      return
    }

    const agent = findAgent(raw)
    if (agent) {
      await runAgent(agent, extractTask(raw))
      return
    }

    push({ type: 'err', text: 'Não reconhecido. Digite "help".' })
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !running) { void handleSubmit() }
    if (e.key === 'Escape') { onClose() }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const idx = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(idx); setInput(history[idx] ?? '')
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const idx = Math.max(histIdx - 1, -1)
      setHistIdx(idx); setInput(idx === -1 ? '' : history[idx] ?? '')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 'var(--sidebar-width, 220px)',
            right: 0,
            zIndex: 900,
            background: '#101010',
            borderTop: '1px solid #2e2e2e',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: "'DM Mono', 'JetBrains Mono', monospace",
          }}
        >
          {/* Drag handle */}
          <div
            onMouseDown={onDragStart}
            style={{
              height: 4,
              cursor: 'ns-resize',
              flexShrink: 0,
              background: 'transparent',
              borderTop: '1px solid #2e2e2e',
            }}
          >
            <div style={{ margin: '1px auto', width: 36, height: 2, borderRadius: 2, background: '#2a2545' }} />
          </div>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 14px 5px 12px',
            borderBottom: '1px solid #2e2e2e',
            flexShrink: 0,
            background: '#0d0b1a',
          }}>
            {/* Tab */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: '4px 4px 0 0',
              background: '#101010', borderBottom: '1px solid #101010',
              marginBottom: -1,
            }}>
              <i className="fa-solid fa-terminal" style={{ fontSize: 9, color: '#e8622a' }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: '#c4b8e0' }}>Terminal</span>
            </div>

            {/* Layer badges */}
            <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
              {Object.entries(LAYER_COLORS).map(([layer, color]) => (
                <span key={layer} style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: `${color}18`, color, letterSpacing: 0.5 }}>{layer}</span>
              ))}
            </div>

            <div style={{ flex: 1 }} />

            {running && (
              <motion.div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }}
                animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} />
            )}
            <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: '#2e2e2e', color: '#4b5563' }}>Ctrl+K</span>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', fontSize: 12, padding: '2px 4px', lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          {/* Output */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px', fontSize: 12, lineHeight: 1.7 }}>
            {lines.map((l, i) => (
              <div key={i} style={{ color: lineColor(l.type), whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {l.type === 'stream' && !l.text
                  ? <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }}>█</motion.span>
                  : l.text}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 14px',
            borderTop: '1px solid #2e2e2e',
            flexShrink: 0,
            background: '#0d0b1a',
          }}>
            <span style={{ color: '#e8622a', fontWeight: 700, fontSize: 13, userSelect: 'none' }}>›</span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={running}
              placeholder={running ? 'Aguardando resposta...' : '@CEO analise · @CFO modele · ls · help'}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#e2e8f0', fontSize: 12,
                fontFamily: "'DM Mono', 'JetBrains Mono', monospace",
                opacity: running ? 0.5 : 1,
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
