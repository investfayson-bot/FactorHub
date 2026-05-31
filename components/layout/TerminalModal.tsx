'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AGENTES } from '@/lib/hub-agentes'

type Line = { type: 'cmd' | 'ok' | 'err' | 'info' | 'agent' | 'hint' | 'stream'; text: string }

const HELP: Line[] = [
  { type: 'hint', text: 'Comandos: status · ls · run <agente> <tarefa> · clear · help' },
  { type: 'hint', text: 'Mencione agentes com @agente: @ceo, @pm, @cmo, @copywriter, @analista, @dev, @conteudo, @chief' },
  { type: 'hint', text: 'Pressione Ctrl+K para abrir/fechar este terminal' },
]

const STATUS_LINES: Line[] = [
  { type: 'info', text: `FactorHub OS v1.0 — ${new Date().toLocaleDateString('pt-BR')}` },
  { type: 'ok',   text: `${AGENTES.length} agentes ativos` },
  { type: 'info', text: 'Supabase: conectado · OpenRouter: ativo · Vercel: deployed' },
]

function getAgentFromMention(input: string) {
  const match = input.match(/@(\w+)/)
  if (!match) return null
  return AGENTES.find(a => a.id === match[1].toLowerCase()) ?? null
}

function extractTask(input: string) {
  return input.replace(/@\w+/, '').replace(/^run\s+\w+\s*/, '').trim()
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function TerminalModal({ open, onClose }: Props) {
  const [lines, setLines] = useState<Line[]>([
    { type: 'info', text: 'FactorHub Terminal — Ctrl+K para fechar' },
    { type: 'hint', text: 'Digite "help" para ver os comandos disponíveis' },
  ])
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 80) }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const push = useCallback((...newLines: Line[]) => {
    setLines(prev => [...prev, ...newLines])
  }, [])

  async function runAgent(agentId: string, task: string) {
    if (!task) { push({ type: 'err', text: 'Descreva a tarefa após mencionar o agente.' }); return }
    setRunning(true)
    push({ type: 'agent', text: `→ Enviando para @${agentId}: "${task}"` })

    let streamLine = ''
    const streamIdx = lines.length + 1
    setLines(prev => [...prev, { type: 'stream', text: '' }])

    try {
      const res = await fetch('/api/hub/tarefa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agente_id: agentId, titulo: task, descricao: task }),
      })
      const data = await res.json() as { resultado?: string; error?: string }
      if (data.error) {
        setLines(prev => { const n = [...prev]; n[n.length - 1] = { type: 'err', text: data.error! }; return n })
      } else {
        const result = data.resultado ?? ''
        setLines(prev => { const n = [...prev]; n[n.length - 1] = { type: 'ok', text: result }; return n })
      }
    } catch {
      setLines(prev => { const n = [...prev]; n[n.length - 1] = { type: 'err', text: 'Erro de rede.' }; return n })
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
    if (cmd === 'help') { push(...HELP); return }
    if (cmd === 'status') { push(...STATUS_LINES); return }
    if (cmd === 'ls') {
      AGENTES.forEach(a => push({ type: 'info', text: `  @${a.id.padEnd(12)} ${a.nome} — ${a.especialidade}` }))
      return
    }

    // run <agentId> <task>
    const runMatch = raw.match(/^run\s+(\w+)\s+(.+)$/i)
    if (runMatch) {
      const [, id, task] = runMatch
      const agent = AGENTES.find(a => a.id === id.toLowerCase())
      if (!agent) { push({ type: 'err', text: `Agente "@${id}" não encontrado. Use "ls" para listar.` }); return }
      await runAgent(agent.id, task)
      return
    }

    // @mention shorthand
    const agent = getAgentFromMention(raw)
    if (agent) {
      const task = extractTask(raw)
      await runAgent(agent.id, task)
      return
    }

    push({ type: 'err', text: `Comando não reconhecido: "${raw}". Digite "help".` })
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !running) { void handleSubmit() }
    if (e.key === 'Escape') { onClose() }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const idx = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(idx)
      setInput(history[idx] ?? '')
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const idx = Math.max(histIdx - 1, -1)
      setHistIdx(idx)
      setInput(idx === -1 ? '' : history[idx] ?? '')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="terminal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            className="terminal-box"
            initial={{ opacity: 0, y: -24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57', cursor: 'pointer' }} onClick={onClose} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 4 }}>FactorHub Terminal</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {running && (
                  <motion.div
                    style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                )}
                <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>CTRL+K</span>
              </div>
            </div>

            {/* Output */}
            <div className="terminal-output">
              {lines.map((l, i) => (
                <div key={i} className={`term-${l.type}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {l.type === 'stream' && !l.text
                    ? <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }}>█</motion.span>
                    : l.text
                  }
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="terminal-input-row">
              <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>›</span>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={running}
                placeholder={running ? 'Aguardando resposta...' : 'Digite um comando ou @agente tarefa...'}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text)', fontSize: 12, fontFamily: "'DM Mono', monospace",
                  opacity: running ? 0.5 : 1,
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
