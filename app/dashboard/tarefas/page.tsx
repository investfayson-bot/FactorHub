'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { AGENTES } from '@/lib/hub-agentes'

type Tarefa = { id: string; titulo: string; descricao: string | null; agente_id: string; status: string; resultado: string | null; modelo: string | null; custo_usd: number; prompt_tokens: number; completion_tokens: number; created_at: string; completed_at: string | null }

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const statusColor: Record<string, string> = { concluida: 'var(--green)', executando: 'var(--gold)', erro: 'var(--red)' }
const statusBg: Record<string, string> = { concluida: 'rgba(34,197,94,.12)', executando: 'rgba(245,158,11,.12)', erro: 'rgba(239,68,68,.12)' }

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAgente, setFiltroAgente] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [aberta, setAberta] = useState<string | null>(null)
  const [empresaId, setEmpresaId] = useState('')

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const eid = u?.empresa_id ?? user.id
    setEmpresaId(eid)
    const { data } = await supabase.from('hub_tarefas').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }).limit(200)
    setTarefas((data ?? []) as Tarefa[])
    setLoading(false)
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  useEffect(() => {
    if (!empresaId) return
    const ch = supabase.channel('tarefas-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hub_tarefas', filter: `empresa_id=eq.${empresaId}` }, () => { void carregar() })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [empresaId, carregar])

  const filtradas = tarefas.filter(t =>
    (!filtroAgente || t.agente_id === filtroAgente) &&
    (!filtroStatus || t.status === filtroStatus)
  )

  const totais = {
    concluida: tarefas.filter(t => t.status === 'concluida').length,
    executando: tarefas.filter(t => t.status === 'executando').length,
    custo: tarefas.reduce((s, t) => s + Number(t.custo_usd ?? 0), 0),
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}
      >
        {[
          { label: 'Concluidas', value: totais.concluida, color: 'var(--green)' },
          { label: 'Em execucao', value: totais.executando, color: 'var(--gold)' },
          { label: 'Custo total (USD)', value: `$${totais.custo.toFixed(4)}`, color: 'var(--text)', mono: true },
        ].map(k => (
          <motion.div
            key={k.label}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.3 }}
          >
            <div className="card" style={{ padding: '14px 16px' }}>
              <div className="kpi-val" style={{ color: k.color, fontFamily: k.mono ? "'DM Mono',monospace" : undefined }}>{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <select className="form-input form-select" value={filtroAgente} onChange={e => setFiltroAgente(e.target.value)} style={{ width: 'auto', minWidth: 180 }}>
          <option value="">Todos os agentes</option>
          {AGENTES.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        {['', 'concluida', 'executando', 'erro'].map(s => (
          <motion.button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`btn btn-sm ${filtroStatus === s ? 'btn-primary' : 'btn-ghost'}`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
          >
            {s || 'Todos'}
          </motion.button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''}
        </span>
      </motion.div>

      {/* Task list */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        style={{ overflow: 'hidden' }}
      >
        {loading ? (
          <div style={{ padding: '50px', display: 'flex', justifyContent: 'center' }}>
            <motion.div
              style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border-light)', borderTopColor: 'var(--accent)' }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            />
          </div>
        ) : filtradas.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}
          >
            Nenhuma tarefa encontrada.
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {filtradas.map((t, i) => {
              const agente = AGENTES.find(a => a.id === t.agente_id)
              const open = aberta === t.id
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <motion.div
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer' }}
                    onClick={() => setAberta(open ? null : t.id)}
                    whileHover={{ backgroundColor: 'var(--surface-2)' }}
                    transition={{ duration: 0.1 }}
                  >
                    <div className="agent-av" style={{ background: agente?.cor ?? '#334155', width: 30, height: 30, borderRadius: 7, fontSize: 10 }}>
                      {agente?.inicial ?? '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titulo}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{agente?.nome ?? t.agente_id}</span>
                        {t.modelo && <span style={{ fontSize: 10.5, color: 'var(--text-dim)', fontFamily: "'DM Mono',monospace" }}>{t.modelo}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <motion.span
                        className="task-status-pill"
                        style={{ background: statusBg[t.status], color: statusColor[t.status] }}
                        animate={t.status === 'executando' ? { opacity: [1, 0.45, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 1.3 }}
                      >
                        {t.status}
                      </motion.span>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace", minWidth: 40, textAlign: 'right' }}>{timeAgo(t.created_at)}</span>
                      <motion.i
                        className="fa-solid fa-chevron-down"
                        animate={{ rotate: open ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ fontSize: 10, color: 'var(--text-dim)' }}
                      />
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28, ease: 'easeOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0 16px 16px' }}>
                          {t.descricao && (
                            <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 7, marginBottom: 10, fontSize: 12, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>Contexto</span>
                              <div style={{ marginTop: 6 }}>{t.descricao}</div>
                            </div>
                          )}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}
                          >
                            {t.resultado ?? 'Aguardando resultado...'}
                          </motion.div>
                          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>{t.prompt_tokens + t.completion_tokens} tokens</span>
                            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>${Number(t.custo_usd).toFixed(6)}</span>
                            {t.completed_at && <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{new Date(t.completed_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  )
}
