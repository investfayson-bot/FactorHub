'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { AGENTES } from '@/lib/hub-agentes'

type Projeto = { id: string; nome: string; descricao: string | null; status: string; progresso: number; categoria: string | null; created_at: string }
type Tarefa = { id: string; titulo: string; agente_id: string; status: string; resultado: string | null; custo_usd: number; created_at: string }

const ST: Record<string, string> = { ideia: '#F59E0B', planejamento: '#2563EB', desenvolvimento: '#7C3AED', concluido: '#22C55E', pausado: '#64748B' }
const statusColor: Record<string, string> = { concluida: 'var(--green)', executando: 'var(--gold)', erro: 'var(--red)' }
const statusBg: Record<string, string> = { concluida: 'rgba(34,197,94,.12)', executando: 'rgba(245,158,11,.12)', erro: 'rgba(239,68,68,.12)' }
const TABS = ['Visão Geral', 'Tarefas IA', 'Criar Tarefa']

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

interface Props {
  projeto: Projeto | null
  onClose: () => void
  onSave: (p: Projeto) => void
}

export default function ProjectDrawer({ projeto, onClose, onSave }: Props) {
  const [tab, setTab] = useState(0)
  const [editing, setEditing] = useState<Partial<Projeto>>({})
  const [saving, setSaving] = useState(false)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loadingTf, setLoadingTf] = useState(false)
  const [tfAberta, setTfAberta] = useState<string | null>(null)
  // Criar tarefa form
  const [agenteSel, setAgenteSel] = useState(AGENTES[0].id)
  const [tfTitulo, setTfTitulo] = useState('')
  const [tfDesc, setTfDesc] = useState('')
  const [criando, setCriando] = useState(false)
  const [tfResult, setTfResult] = useState<string | null>(null)

  const carregarTarefas = useCallback(async (id: string) => {
    setLoadingTf(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const eid = u?.empresa_id ?? user.id
    // Load recent tasks (no projeto_id column — show all, sorted by recency)
    const { data } = await supabase.from('hub_tarefas')
      .select('id,titulo,agente_id,status,resultado,custo_usd,created_at')
      .eq('empresa_id', eid)
      .order('created_at', { ascending: false })
      .limit(30)
    setTarefas((data ?? []) as Tarefa[])
    setLoadingTf(false)
  }, [])

  // Open drawer
  const handleOpen = useCallback((p: Projeto) => {
    setEditing({
      nome: p.nome, descricao: p.descricao ?? '',
      status: p.status, progresso: p.progresso, categoria: p.categoria ?? '',
    })
    setTab(0)
    setTfResult(null)
    setTfTitulo('')
    void carregarTarefas(p.id)
  }, [carregarTarefas])

  // Run effect when projeto changes
  const prevId = useState<string | null>(null)
  if (projeto && projeto.id !== prevId[0]) {
    prevId[1](projeto.id)
    handleOpen(projeto)
  }

  async function saveChanges() {
    if (!projeto) return
    setSaving(true)
    const payload = {
      nome: editing.nome ?? projeto.nome,
      descricao: editing.descricao || null,
      status: editing.status ?? projeto.status,
      progresso: Number(editing.progresso ?? projeto.progresso),
      categoria: editing.categoria || null,
    }
    const { data } = await supabase.from('hub_projetos').update(payload).eq('id', projeto.id).select().single()
    setSaving(false)
    if (data) onSave(data as Projeto)
  }

  async function criarTarefa() {
    if (!tfTitulo.trim() || criando) return
    setCriando(true)
    setTfResult(null)
    const token = (await supabase.auth.getSession()).data.session?.access_token
    const context = projeto ? `Projeto: ${projeto.nome}${projeto.descricao ? `\n${projeto.descricao}` : ''}` : undefined
    const res = await fetch('/api/hub/tarefa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ agentId: agenteSel, titulo: tfTitulo.trim(), descricao: context ? `${context}\n\n${tfDesc}` : tfDesc || undefined }),
    })
    const data = await res.json() as { tarefa?: { resultado?: string }; resultado?: string }
    setTfResult(data.tarefa?.resultado ?? data.resultado ?? null)
    setCriando(false)
    void carregarTarefas(projeto?.id ?? '')
  }

  if (!projeto) return null

  const displayEditing = { ...projeto, ...editing }

  return (
    <AnimatePresence>
      {projeto && (
        <>
          <motion.div
            className="drawer-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="drawer"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            style={{ width: 500 }}
          >
            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${ST[projeto.status] ?? '#64748B'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="fa-solid fa-diagram-project" style={{ fontSize: 16, color: ST[projeto.status] ?? '#64748B' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  value={editing.nome ?? projeto.nome}
                  onChange={e => setEditing(v => ({ ...v, nome: e.target.value }))}
                  style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 15, fontWeight: 700, color: 'var(--text)', width: '100%', fontFamily: 'inherit' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Criado {new Date(projeto.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <motion.button
                  className="btn btn-primary btn-sm"
                  onClick={() => void saveChanges()}
                  disabled={saving}
                  whileHover={!saving ? { scale: 1.02 } : {}}
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </motion.button>
                <button
                  onClick={onClose}
                  style={{ width: 28, height: 28, borderRadius: 7, border: '0.5px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <i className="fa-solid fa-xmark" style={{ fontSize: 12, color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs-row">
              {TABS.map((t, i) => (
                <button key={t} className={`tab-btn${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}>{t}</button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>

                  {/* Tab 0: Visão Geral */}
                  {tab === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Progress */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <label className="form-label" style={{ marginBottom: 0 }}>Progresso</label>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: "'DM Mono',monospace" }}>{editing.progresso ?? projeto.progresso}%</span>
                        </div>
                        <input
                          type="range" min={0} max={100}
                          value={editing.progresso ?? projeto.progresso}
                          onChange={e => setEditing(v => ({ ...v, progresso: Number(e.target.value) }))}
                          style={{ width: '100%', accentColor: 'var(--accent)' }}
                        />
                        <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
                          <motion.div
                            animate={{ width: `${editing.progresso ?? projeto.progresso}%` }}
                            transition={{ duration: 0.3 }}
                            style={{ height: '100%', background: 'var(--accent)', borderRadius: 2 }}
                          />
                        </div>
                      </div>

                      {/* Status + Categoria */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="form-label">Status</label>
                          <select className="form-input form-select" value={editing.status ?? projeto.status} onChange={e => setEditing(v => ({ ...v, status: e.target.value }))}>
                            {['ideia', 'planejamento', 'desenvolvimento', 'concluido', 'pausado'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Categoria</label>
                          <input className="form-input" value={editing.categoria ?? projeto.categoria ?? ''} onChange={e => setEditing(v => ({ ...v, categoria: e.target.value }))} />
                        </div>
                      </div>

                      {/* Descrição */}
                      <div>
                        <label className="form-label">Descrição</label>
                        <textarea
                          className="form-input" rows={4}
                          value={editing.descricao ?? projeto.descricao ?? ''}
                          onChange={e => setEditing(v => ({ ...v, descricao: e.target.value }))}
                          style={{ resize: 'vertical' }}
                        />
                      </div>

                      {/* Status badge preview */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="status-pill" style={{ background: `${ST[displayEditing.status] ?? '#64748B'}18`, color: ST[displayEditing.status] ?? '#64748B' }}>
                          {displayEditing.status}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                          {displayEditing.categoria || 'Sem categoria'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tab 1: Tarefas IA */}
                  {tab === 1 && (
                    <div>
                      {loadingTf ? (
                        <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
                          <motion.div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
                        </div>
                      ) : tarefas.length === 0 ? (
                        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                          Nenhuma tarefa IA ainda.
                          <br />
                          <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setTab(2)}>
                            Criar primeira tarefa
                          </button>
                        </div>
                      ) : tarefas.map((t, i) => {
                        const agente = AGENTES.find(a => a.id === t.agente_id)
                        const open = tfAberta === t.id
                        return (
                          <motion.div key={t.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} style={{ borderBottom: '0.5px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', cursor: 'pointer' }} onClick={() => setTfAberta(open ? null : t.id)}>
                              <div style={{ width: 24, height: 24, borderRadius: 6, background: agente?.cor ?? '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                                {agente?.inicial ?? '?'}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titulo}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{agente?.nome} · {timeAgo(t.created_at)}</div>
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: statusBg[t.status], color: statusColor[t.status], flexShrink: 0 }}>{t.status}</span>
                              <motion.i className="fa-solid fa-chevron-down" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ fontSize: 9, color: 'var(--text-dim)', flexShrink: 0 }} />
                            </div>
                            <AnimatePresence>
                              {open && t.resultado && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                                  <div style={{ padding: '10px 12px', marginBottom: 10, background: 'var(--surface-2)', borderRadius: 8, border: '0.5px solid var(--border)', fontSize: 12, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                    {t.resultado}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}

                  {/* Tab 2: Criar Tarefa */}
                  {tab === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ padding: '12px 14px', background: 'var(--accent-dim)', borderRadius: 8, border: '0.5px solid var(--accent)', fontSize: 12, color: 'var(--accent)' }}>
                        <i className="fa-solid fa-brain" style={{ marginRight: 6 }} />
                        O contexto do projeto será incluído automaticamente na tarefa.
                      </div>

                      <div>
                        <label className="form-label">Agente</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          {AGENTES.map(a => (
                            <motion.button
                              key={a.id}
                              onClick={() => setAgenteSel(a.id)}
                              whileHover={{ y: -1 }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 8,
                                background: agenteSel === a.id ? `${a.cor}15` : 'var(--surface-2)',
                                border: `0.5px solid ${agenteSel === a.id ? a.cor + '60' : 'var(--border)'}`,
                                cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
                              }}
                            >
                              <div style={{ width: 22, height: 22, borderRadius: 5, background: a.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{a.inicial}</div>
                              <span style={{ fontSize: 11, fontWeight: 600, color: agenteSel === a.id ? a.cor : 'var(--text-muted)' }}>{a.nome}</span>
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Tarefa *</label>
                        <input className="form-input" placeholder="Ex: Crie um roadmap de 90 dias para este projeto" value={tfTitulo} onChange={e => setTfTitulo(e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Contexto adicional</label>
                        <textarea className="form-input" rows={2} value={tfDesc} onChange={e => setTfDesc(e.target.value)} style={{ resize: 'vertical' }} />
                      </div>

                      <motion.button
                        className="btn btn-primary"
                        onClick={() => void criarTarefa()}
                        disabled={criando || !tfTitulo.trim()}
                        whileHover={!criando && tfTitulo.trim() ? { scale: 1.02 } : {}}
                        whileTap={!criando && tfTitulo.trim() ? { scale: 0.97 } : {}}
                      >
                        {criando
                          ? <><motion.i className="fa-solid fa-circle-notch" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} style={{ fontSize: 11 }} />Executando...</>
                          : <><i className="fa-solid fa-play" style={{ fontSize: 11 }} />Executar tarefa</>
                        }
                      </motion.button>

                      <AnimatePresence>
                        {tfResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 9, border: '0.5px solid var(--border)', fontSize: 13, color: 'var(--text)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                              <i className="fa-solid fa-check-circle" style={{ color: 'var(--green)', fontSize: 12 }} />
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>Tarefa concluída</span>
                            </div>
                            {tfResult}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
