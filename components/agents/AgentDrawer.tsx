'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Agente } from '@/lib/hub-agentes'

type Tarefa = { id: string; titulo: string; status: string; resultado: string | null; custo_usd: number; prompt_tokens: number; completion_tokens: number; created_at: string }
type UsageRow = { agente_id: string; total_tokens: number; custo_usd: number; created_at: string }

const TABS = ['Visão Geral', 'System Prompt', 'Histórico', 'Uso']

const statusColor: Record<string, string> = { concluida: 'var(--green)', executando: 'var(--gold)', erro: 'var(--red)' }
const statusBg: Record<string, string> = { concluida: 'rgba(34,197,94,.12)', executando: 'rgba(245,158,11,.12)', erro: 'rgba(239,68,68,.12)' }

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

interface Props {
  agente: Agente | null
  onClose: () => void
}

export default function AgentDrawer({ agente, onClose }: Props) {
  const [tab, setTab] = useState(0)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [uso, setUso] = useState<UsageRow[]>([])
  const [loading, setLoading] = useState(false)
  const [aberta, setAberta] = useState<string | null>(null)

  const carregar = useCallback(async (id: string) => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const eid = u?.empresa_id ?? user.id

    const [tf, us] = await Promise.all([
      supabase.from('hub_tarefas').select('id,titulo,status,resultado,custo_usd,prompt_tokens,completion_tokens,created_at').eq('empresa_id', eid).eq('agente_id', id).order('created_at', { ascending: false }).limit(50),
      supabase.from('hub_uso_agentes').select('agente_id,total_tokens,custo_usd,created_at').eq('empresa_id', eid).eq('agente_id', id).order('created_at', { ascending: false }).limit(200),
    ])

    setTarefas((tf.data ?? []) as Tarefa[])
    setUso((us.data ?? []) as UsageRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (agente) { setTab(0); setAberta(null); void carregar(agente.id) }
  }, [agente, carregar])

  const totalCusto = uso.reduce((s, r) => s + Number(r.custo_usd ?? 0), 0)
  const totalTokens = uso.reduce((s, r) => s + Number(r.total_tokens ?? 0), 0)
  const taxaConclusao = tarefas.length > 0 ? Math.round(tarefas.filter(t => t.status === 'concluida').length / tarefas.length * 100) : 0

  return (
    <AnimatePresence>
      {agente && (
        <>
          {/* Overlay */}
          <motion.div
            className="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            style={{ width: 480 }}
          >
            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <motion.div
                style={{ width: 42, height: 42, borderRadius: 10, background: agente.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {agente.inicial}
              </motion.div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{agente.nome}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{agente.especialidade}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} />
                <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>Online</span>
                <button
                  onClick={onClose}
                  style={{ width: 28, height: 28, borderRadius: 7, border: '0.5px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}
                >
                  <i className="fa-solid fa-xmark" style={{ fontSize: 12, color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs-row">
              {TABS.map((t, i) => (
                <button
                  key={t}
                  className={`tab-btn${tab === i ? ' active' : ''}`}
                  onClick={() => setTab(i)}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
              {loading && tab !== 1 ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <motion.div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: agente.cor }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>

                    {/* Tab 0: Visão Geral */}
                    {tab === 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                          {[
                            { label: 'Tarefas', value: tarefas.length, color: agente.cor },
                            { label: 'Taxa conclusão', value: `${taxaConclusao}%`, color: 'var(--green)' },
                            { label: 'Custo total', value: `$${totalCusto.toFixed(4)}`, color: 'var(--text-muted)', mono: true },
                          ].map(s => (
                            <div key={s.label} style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 9, border: '0.5px solid var(--border)' }}>
                              <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: s.mono ? "'DM Mono',monospace" : undefined, marginBottom: 4 }}>{s.value}</div>
                              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{s.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Suggestions */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Sugestões de uso</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {agente.sugestoes.map((s, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.06 }}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 8, border: '0.5px solid var(--border)' }}
                              >
                                <i className="fa-solid fa-chevron-right" style={{ fontSize: 9, color: agente.cor, flexShrink: 0 }} />
                                <span style={{ fontSize: 12.5, color: 'var(--text)' }}>{s}</span>
                              </motion.div>
                            ))}
                          </div>
                        </div>

                        {/* Last task */}
                        {tarefas[0] && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Última tarefa</div>
                            <div style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 9, border: '0.5px solid var(--border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: statusBg[tarefas[0].status], color: statusColor[tarefas[0].status] }}>{tarefas[0].status}</span>
                                <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{timeAgo(tarefas[0].created_at)}</span>
                              </div>
                              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>{tarefas[0].titulo}</div>
                              {tarefas[0].resultado && (
                                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6, maxHeight: 120, overflow: 'hidden', maskImage: 'linear-gradient(to bottom, #000 60%, transparent)' }}>
                                  {tarefas[0].resultado}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 1: System Prompt */}
                    {tab === 1 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>
                          System Prompt completo
                        </div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.75, background: 'var(--surface-2)', borderRadius: 9, padding: 16, border: '0.5px solid var(--border)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {agente.system}
                        </div>
                        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fa-solid fa-brain" style={{ fontSize: 10, color: 'var(--accent)' }} />
                          O contexto do Cerebro é adicionado automaticamente acima deste prompt.
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Histórico */}
                    {tab === 2 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {tarefas.length === 0 ? (
                          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                            Nenhuma tarefa ainda.
                          </div>
                        ) : tarefas.map((t, i) => (
                          <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i * 0.03, 0.3) }}
                          >
                            <div
                              style={{ padding: '11px 4px', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}
                              onClick={() => setAberta(aberta === t.id ? null : t.id)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: statusBg[t.status], color: statusColor[t.status], flexShrink: 0 }}>{t.status}</span>
                                <span style={{ fontSize: 12.5, color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titulo}</span>
                                <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>{timeAgo(t.created_at)}</span>
                                <motion.i className="fa-solid fa-chevron-down" animate={{ rotate: aberta === t.id ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ fontSize: 9, color: 'var(--text-dim)', flexShrink: 0 }} />
                              </div>
                              <AnimatePresence>
                                {aberta === t.id && t.resultado && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.25 }}
                                    style={{ overflow: 'hidden', marginTop: 10 }}
                                  >
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 8, border: '0.5px solid var(--border)' }}>
                                      {t.resultado}
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                      <span style={{ fontSize: 10.5, color: 'var(--text-dim)', fontFamily: "'DM Mono',monospace" }}>{t.prompt_tokens + t.completion_tokens} tokens</span>
                                      <span style={{ fontSize: 10.5, color: 'var(--text-dim)', fontFamily: "'DM Mono',monospace" }}>${Number(t.custo_usd).toFixed(6)}</span>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Tab 3: Uso */}
                    {tab === 3 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {[
                            { label: 'Total de chamadas', value: uso.length },
                            { label: 'Tokens total', value: totalTokens.toLocaleString('pt-BR') },
                            { label: 'Custo acumulado', value: `$${totalCusto.toFixed(6)}`, mono: true },
                            { label: 'Custo médio/chamada', value: uso.length > 0 ? `$${(totalCusto / uso.length).toFixed(6)}` : '—', mono: true },
                          ].map(s => (
                            <div key={s.label} style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 9, border: '0.5px solid var(--border)' }}>
                              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: s.mono ? "'DM Mono',monospace" : undefined, marginBottom: 4 }}>{s.value}</div>
                              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{s.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Usage log */}
                        {uso.length > 0 && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Log de uso</div>
                            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                              {uso.slice(0, 30).map((r, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: i * 0.02 }}
                                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}
                                >
                                  <span style={{ fontSize: 10.5, color: 'var(--text-dim)', minWidth: 60 }}>{new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace", flex: 1 }}>{Number(r.total_tokens).toLocaleString()} tk</span>
                                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>${Number(r.custo_usd).toFixed(6)}</span>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {uso.length === 0 && (
                          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                            Sem registros de uso ainda.
                          </div>
                        )}
                      </div>
                    )}

                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
