'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AGENTES, type Agente } from '@/lib/hub-agentes'
import { supabase } from '@/lib/supabase'
import { AgentPlan, type PlanStep } from '@/components/ui/agent-plan'
import dynamic from 'next/dynamic'

const AgentDrawer = dynamic(() => import('@/components/agents/AgentDrawer'), { ssr: false })

type Tarefa = { id: string; titulo: string; descricao: string | null; status: string; resultado: string | null; custo_usd: number; created_at: string }

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

const statusColor: Record<string, string> = { concluida: 'var(--green)', executando: 'var(--gold)', erro: 'var(--red)' }
const statusBg: Record<string, string> = { concluida: 'rgba(34,197,94,.12)', executando: 'rgba(245,158,11,.12)', erro: 'rgba(239,68,68,.12)' }

async function getToken() {
  const { data: sess } = await supabase.auth.getSession()
  return sess.session?.access_token
}

export default function AgentesPage() {
  const [ativo, setAtivo] = useState<Agente>(AGENTES[0])
  const [drawerAgente, setDrawerAgente] = useState<Agente | null>(null)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTarefas, setLoadingTarefas] = useState(false)
  const [tarefaAberta, setTarefaAberta] = useState<Tarefa | null>(null)
  const [plano, setPlano] = useState<PlanStep[] | null>(null)
  const [fase, setFase] = useState<'idle' | 'planejando' | 'executando' | 'concluido'>('idle')

  const carregarTarefas = useCallback(async (agentId: string) => {
    setLoadingTarefas(true)
    const token = await getToken()
    const res = await fetch(`/api/hub/tarefa?agentId=${agentId}&limit=30`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const payload = await res.json().catch(() => ({ tarefas: [] }))
    setTarefas(payload.tarefas ?? [])
    setLoadingTarefas(false)
  }, [])

  useEffect(() => {
    void carregarTarefas(ativo.id)
    setTarefaAberta(null)
    setTitulo('')
    setDescricao('')
    setPlano(null)
    setFase('idle')
  }, [ativo.id, carregarTarefas])

  async function executar() {
    if (!titulo.trim() || loading) return
    setLoading(true)
    setPlano(null)
    setTarefaAberta(null)

    const token = await getToken()
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }

    // Phase 1: generate plan
    setFase('planejando')
    const planRes = await fetch('/api/hub/plano', {
      method: 'POST',
      headers,
      body: JSON.stringify({ agentId: ativo.id, titulo: titulo.trim(), descricao: descricao.trim() || undefined }),
    })
    const planData = await planRes.json().catch(() => ({ etapas: [] }))
    const etapas: PlanStep[] = (planData.etapas ?? []).map((e: PlanStep) => ({ ...e, status: 'pendente' as const }))
    setPlano(etapas)

    // Animate steps one by one while waiting for execution
    setFase('executando')
    const stepDelay = 600

    // Mark steps executing sequentially (simulated progress)
    for (let i = 0; i < etapas.length; i++) {
      await new Promise(r => setTimeout(r, stepDelay))
      setPlano(prev => prev
        ? prev.map((e, idx) => idx === i ? { ...e, status: 'executando' } : e)
        : prev
      )
    }

    // Phase 2: run actual task
    const taskRes = await fetch('/api/hub/tarefa', {
      method: 'POST',
      headers,
      body: JSON.stringify({ agentId: ativo.id, titulo: titulo.trim(), descricao: descricao.trim() || undefined }),
    })
    const taskData = await taskRes.json().catch(() => ({}))

    // Mark all steps done
    setPlano(prev => prev ? prev.map(e => ({ ...e, status: 'concluida' as const })) : prev)
    setFase('concluido')
    setLoading(false)
    setTitulo('')
    setDescricao('')

    if (taskData.tarefa) {
      setTarefaAberta(taskData.tarefa as Tarefa)
      void carregarTarefas(ativo.id)
    }
  }

  return (
    <>
    <div style={{ display: 'grid', gridTemplateColumns: '248px 1fr', gap: 16, height: '100%', minHeight: 0 }}>

      {/* Agent list */}
      <div className="card" style={{ overflowY: 'auto' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
          Squad
        </div>
        <div style={{ padding: 8 }}>
          {AGENTES.map((a, i) => {
            const sel = a.id === ativo.id
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
                style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}
              >
                <motion.button
                  onClick={() => setAtivo(a)}
                  whileHover={{ x: 2 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, textAlign: 'left', padding: '9px 10px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${sel ? a.cor + '50' : 'transparent'}`, background: sel ? `${a.cor}10` : 'transparent', transition: 'background .12s, border-color .12s' }}
                >
                  <motion.div
                    className="agent-av"
                    style={{ background: a.cor, width: 30, height: 30, borderRadius: 7, fontSize: 10 }}
                    animate={sel ? { scale: [1, 1.06, 1] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    {a.inicial}
                  </motion.div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: sel ? 600 : 500, color: sel ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nome}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{a.especialidade}</div>
                  </div>
                </motion.button>
                <motion.button
                  onClick={(e) => { e.stopPropagation(); setDrawerAgente(a) }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  style={{ width: 26, height: 26, borderRadius: 6, border: '0.5px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  title="Ver detalhes"
                >
                  <i className="fa-solid fa-circle-info" style={{ fontSize: 10, color: 'var(--text-dim)' }} />
                </motion.button>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0, overflow: 'auto' }}>

        {/* Agent header + task form */}
        <AnimatePresence mode="wait">
          <motion.div
            key={ativo.id}
            className="card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <motion.div
                className="agent-av"
                style={{ background: ativo.cor, width: 40, height: 40, borderRadius: 10, fontSize: 13 }}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {ativo.inicial}
              </motion.div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{ativo.nome}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{ativo.especialidade}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                {fase === 'planejando' && (
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}
                  >
                    gerando plano...
                  </motion.span>
                )}
                {fase === 'executando' && (
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 600 }}
                  >
                    executando...
                  </motion.span>
                )}
                <div style={{ fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: `${ativo.cor}15`, color: ativo.cor, letterSpacing: '.04em' }}>IA</div>
              </div>
            </div>

            <div style={{ padding: '16px 18px' }}>
              <div style={{ marginBottom: 10 }}>
                <label className="form-label">Tarefa para {ativo.nome}</label>
                <input
                  className="form-input"
                  placeholder={ativo.sugestoes[0]}
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void executar() } }}
                  disabled={loading}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Contexto adicional (opcional)</label>
                <textarea className="form-input" rows={2} placeholder="Detalhe a tarefa se precisar..." value={descricao} onChange={e => setDescricao(e.target.value)} style={{ resize: 'vertical' }} disabled={loading} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <motion.button
                  className="btn btn-primary"
                  disabled={loading || !titulo.trim()}
                  onClick={() => void executar()}
                  whileHover={!loading && titulo.trim() ? { scale: 1.02 } : {}}
                  whileTap={!loading && titulo.trim() ? { scale: 0.97 } : {}}
                >
                  {loading ? (
                    <>
                      <motion.i
                        className="fa-solid fa-circle-notch"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                        style={{ fontSize: 12 }}
                      />
                      {fase === 'planejando' ? 'Planejando...' : 'Executando...'}
                    </>
                  ) : (
                    <><i className="fa-solid fa-play" style={{ fontSize: 11 }} />Executar</>
                  )}
                </motion.button>
                {!loading && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {ativo.sugestoes.map(s => (
                      <motion.button
                        key={s}
                        onClick={() => setTitulo(s)}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 11 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Agent Plan */}
            <AnimatePresence>
              {plano && plano.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ margin: '0 18px 18px' }}>
                    <AgentPlan etapas={plano} agenteCor={ativo.cor} agenteNome={ativo.nome} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result */}
            <AnimatePresence>
              {tarefaAberta && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ margin: '0 18px 18px', padding: 16, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <i className="fa-solid fa-check-circle" style={{ fontSize: 13, color: 'var(--green)' }} />
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{tarefaAberta.titulo}</span>
                      <span className="task-status-pill" style={{ background: statusBg[tarefaAberta.status], color: statusColor[tarefaAberta.status] }}>{tarefaAberta.status}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>${Number(tarefaAberta.custo_usd).toFixed(6)}</span>
                    </div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}
                    >
                      {tarefaAberta.resultado ?? ''}
                    </motion.div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: 14 }}
                      onClick={() => { setTarefaAberta(null); setPlano(null); setFase('idle') }}
                    >
                      Fechar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Task history */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <span className="card-title">Historico — {ativo.nome}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tarefas.length} tarefa{tarefas.length !== 1 ? 's' : ''}</span>
          </div>
          {loadingTarefas ? (
            <div style={{ padding: '30px 16px', textAlign: 'center' }}>
              <motion.div
                style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border-light)', borderTopColor: 'var(--accent)', margin: '0 auto' }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              />
            </div>
          ) : tarefas.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}
            >
              Nenhuma tarefa ainda para este agente.
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {tarefas.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className="task-row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setTarefaAberta(tarefaAberta?.id === t.id ? null : t)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="task-status-pill" style={{ background: statusBg[t.status], color: statusColor[t.status] }}>{t.status}</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titulo}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(t.created_at)}</span>
                    </div>
                    <AnimatePresence>
                      {tarefaAberta?.id === t.id && t.resultado && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginTop: 10, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 7 }}>
                            {t.resultado}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <motion.i
                    className="fa-solid fa-chevron-down"
                    animate={{ rotate: tarefaAberta?.id === t.id ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>

    <AgentDrawer agente={drawerAgente} onClose={() => setDrawerAgente(null)} />
    </>
  )
}
