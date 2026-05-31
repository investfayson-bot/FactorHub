'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AGENTS_V2, type AgentV2 } from '@/lib/agents-v2'

type Line = { type: 'cmd' | 'ok' | 'err' | 'info' | 'agent' | 'hint' | 'stream'; text: string }

const agents = Object.values(AGENTS_V2)

const LAYER_COLORS: Record<string, string> = {
  C1: '#e8622a', C2: '#0d9488', C3: '#6366f1', C4: '#d97706', CA: '#7c3aed',
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
    case 'ok': return '#22c55e'
    case 'err': return '#ef4444'
    case 'agent': return '#f59e0b'
    case 'hint': return '#6b7280'
    case 'stream': return '#e2e8f0'
    default: return '#94a3b8'
  }
}

interface Props { open: boolean; onClose: () => void }

export default function TerminalModal({ open, onClose }: Props) {
  const [lines, setLines] = useState<Line[]>([
    { type: 'info', text: 'FactorHub Terminal v2 — 26 agentes ativos' },
    { type: 'hint', text: 'Digite "help" para ver comandos. Ex: @CEO analise meu mercado' },
  ])
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

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
            const token = JSON.parse(d).choices?.[0]?.delta?.content ?? ''
            full += token
            setLines(prev => { const n = [...prev]; n[n.length - 1] = { type: 'stream', text: full }; return n })
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
        { type: 'hint', text: '─── Comandos ──────────────────────────────' },
        { type: 'hint', text: '  help              este menu' },
        { type: 'hint', text: '  ls                lista todos os 26 agentes' },
        { type: 'hint', text: '  ls c1|c2|c3|c4|ca filtra por camada' },
        { type: 'hint', text: '  status            saúde do sistema' },
        { type: 'hint', text: '  @CEO tarefa       conversa com agente' },
        { type: 'hint', text: '  run CEO tarefa    sintaxe alternativa' },
        { type: 'hint', text: '  clear             limpa o terminal' },
        { type: 'hint', text: '─── Exemplos ──────────────────────────────' },
        { type: 'hint', text: '  @CEO valide esta oportunidade de negócio' },
        { type: 'hint', text: '  @CFO modele o unit economics do produto' },
        { type: 'hint', text: '  @CMO crie estratégia de lançamento' },
        { type: 'hint', text: '  @MR pesquise mercado de SaaS para PMEs' },
        { type: 'hint', text: '  @CW escreva headline para landing page' },
      )
      return
    }

    if (cmd === 'status') {
      push(
        { type: 'info', text: `FactorHub OS v2.0 — ${new Date().toLocaleDateString('pt-BR')}` },
        { type: 'ok', text: `${agents.length} agentes (C1:7 C2:6 C3:8 C4:4 CA:1)` },
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
        text: `  @${a.id.padEnd(4)} [${a.layer}]  ${a.name.padEnd(22)} — ${a.role}`,
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
          className="terminal-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            className="terminal-box"
            initial={{ opacity: 0, y: -24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57', cursor: 'pointer' }} onClick={onClose} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 4 }}>FactorHub Terminal</span>
                {Object.entries(LAYER_COLORS).map(([layer, color]) => (
                  <span key={layer} style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: `${color}20`, color, letterSpacing: 0.5 }}>{layer}</span>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {running && (
                  <motion.div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }}
                    animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
                )}
                <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text-dim)' }}>CTRL+K</span>
              </div>
            </div>

            <div className="terminal-output">
              {lines.map((l, i) => (
                <div key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: lineColor(l.type), lineHeight: 1.6 }}>
                  {l.type === 'stream' && !l.text
                    ? <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }}>█</motion.span>
                    : l.text}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="terminal-input-row">
              <span style={{ color: '#e8622a', fontWeight: 700, flexShrink: 0 }}>›</span>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={running}
                placeholder={running ? 'Aguardando resposta...' : '@CEO analise · run CFO modele · ls c1 · help'}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12, fontFamily: "'DM Mono', monospace", opacity: running ? 0.5 : 1 }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
