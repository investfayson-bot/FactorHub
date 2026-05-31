'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

type Projeto = {
  id: string
  nome: string
  descricao: string | null
  status: string
  progresso: number
  categoria: string | null
  decisao: string | null
  observacao: string | null
  decidido_at: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  ideia: '#F59E0B', planejamento: '#2563EB', desenvolvimento: '#7C3AED',
  concluido: '#22C55E', pausado: '#64748B',
}
const DECISAO_COLORS: Record<string, string> = { aprovado: '#22c55e', rejeitado: '#ef4444' }
const DECISAO_ICONS: Record<string, string> = { aprovado: 'fa-circle-check', rejeitado: 'fa-circle-xmark' }

export default function ProjetosPage() {
  const [itens, setItens] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(true)
  const [empresaId, setEmpresaId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Projeto | null>(null)
  const [form, setForm] = useState({ nome: '', descricao: '', status: 'ideia', progresso: 0, categoria: '' })
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Decision modal state
  const [decisionModal, setDecisionModal] = useState<{ projeto: Projeto; tipo: 'aprovado' | 'rejeitado' } | null>(null)
  const [observacao, setObservacao] = useState('')
  const [decidindo, setDecidindo] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDecisao, setFilterDecisao] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const eid = u?.empresa_id ?? user.id
    setEmpresaId(eid)
    const { data } = await supabase.from('hub_projetos').select('*').eq('empresa_id', eid).order('created_at', { ascending: false })
    setItens((data ?? []) as Projeto[])
    setLoading(false)
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', descricao: '', status: 'ideia', progresso: 0, categoria: '' })
    setShowForm(true)
  }

  function abrirEditar(p: Projeto) {
    setEditando(p)
    setForm({ nome: p.nome, descricao: p.descricao ?? '', status: p.status, progresso: p.progresso, categoria: p.categoria ?? '' })
    setShowForm(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      nome: form.nome, descricao: form.descricao || null, status: form.status,
      progresso: Number(form.progresso), categoria: form.categoria || null, empresa_id: empresaId,
    }
    if (editando) await supabase.from('hub_projetos').update(payload).eq('id', editando.id)
    else await supabase.from('hub_projetos').insert(payload)
    setSaving(false); setShowForm(false); void carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir projeto?')) return
    await supabase.from('hub_projetos').delete().eq('id', id)
    void carregar()
  }

  async function decidir() {
    if (!decisionModal) return
    setDecidindo(true)
    await supabase.from('hub_projetos').update({
      decisao: decisionModal.tipo,
      observacao: observacao.trim() || null,
      decidido_at: new Date().toISOString(),
    }).eq('id', decisionModal.projeto.id)
    setDecidindo(false)
    setDecisionModal(null)
    setObservacao('')
    void carregar()
  }

  const filtrados = itens.filter(p =>
    (!filterStatus || p.status === filterStatus) &&
    (!filterDecisao || p.decisao === filterDecisao || (filterDecisao === 'pendente' && !p.decisao))
  )

  const totais = {
    total: itens.length,
    aprovados: itens.filter(p => p.decisao === 'aprovado').length,
    rejeitados: itens.filter(p => p.decisao === 'rejeitado').length,
    pendentes: itens.filter(p => !p.decisao).length,
  }

  const selected = selectedId ? itens.find(p => p.id === selectedId) ?? null : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Total', value: totais.total, color: '#e8622a', icon: 'fa-diagram-project' },
          { label: 'Aprovados', value: totais.aprovados, color: '#22c55e', icon: 'fa-circle-check' },
          { label: 'Rejeitados', value: totais.rejeitados, color: '#ef4444', icon: 'fa-circle-xmark' },
          { label: 'Pendentes', value: totais.pendentes, color: '#f59e0b', icon: 'fa-clock' },
        ].map(k => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: `${k.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`fa-solid ${k.icon}`} style={{ fontSize: 11, color: k.color }} />
                </div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: k.color, lineHeight: 1.1 }}>{k.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{k.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select className="form-input form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto', minWidth: 150, fontSize: 12 }}>
          <option value="">Todos os status</option>
          {['ideia', 'planejamento', 'desenvolvimento', 'concluido', 'pausado'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-input form-select" value={filterDecisao} onChange={e => setFilterDecisao(e.target.value)} style={{ width: 'auto', minWidth: 150, fontSize: 12 }}>
          <option value="">Todas as decisões</option>
          <option value="aprovado">Aprovado</option>
          <option value="rejeitado">Rejeitado</option>
          <option value="pendente">Pendente de decisão</option>
        </select>
        <div style={{ flex: 1 }} />
        <motion.button className="btn btn-primary" onClick={abrirNovo} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <i className="fa-solid fa-plus" style={{ fontSize: 11 }} />Novo Projeto
        </motion.button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 18 }}>{editando ? 'Editar Projeto' : 'Novo Projeto'}</div>
              <form onSubmit={e => { void salvar(e) }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div><label className="form-label">Nome *</label><input className="form-input" required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
                  <div><label className="form-label">Categoria</label><input className="form-input" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} /></div>
                </div>
                <div style={{ marginBottom: 12 }}><label className="form-label">Descrição</label><textarea className="form-input" rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div><label className="form-label">Status</label>
                    <select className="form-input form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {['ideia', 'planejamento', 'desenvolvimento', 'concluido', 'pausado'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Progresso (%)</label><input className="form-input" type="number" min={0} max={100} value={form.progresso} onChange={e => setForm(f => ({ ...f, progresso: Number(e.target.value) }))} /></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button className="btn btn-primary" type="submit" disabled={saving} whileHover={!saving ? { scale: 1.02 } : {}}>{saving ? 'Salvando...' : 'Salvar'}</motion.button>
                  <motion.button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)} whileHover={{ scale: 1.02 }}>Cancelar</motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 50, display: 'flex', justifyContent: 'center' }}>
            <motion.div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-diagram-project" style={{ fontSize: 28, marginBottom: 12, display: 'block', opacity: 0.3 }} />
            <div style={{ fontSize: 13 }}>Nenhum projeto encontrado</div>
            {!showForm && <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={abrirNovo}>Criar primeiro projeto</button>}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtrados.map((p, i) => {
              const stColor = STATUS_COLORS[p.status] ?? '#64748B'
              const dcColor = p.decisao ? DECISAO_COLORS[p.decisao] : '#f59e0b'
              const isSelected = selectedId === p.id
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}
                >
                  {/* Row */}
                  <motion.div
                    onClick={() => setSelectedId(isSelected ? null : p.id)}
                    whileHover={{ backgroundColor: 'var(--surface-2)' }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer' }}
                  >
                    {/* Decision indicator */}
                    <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: dcColor, flexShrink: 0 }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.nome}</span>
                        {p.decisao && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: DECISAO_COLORS[p.decisao], background: `${DECISAO_COLORS[p.decisao]}15`, padding: '2px 7px', borderRadius: 20, flexShrink: 0 }}>
                            <i className={`fa-solid ${DECISAO_ICONS[p.decisao]}`} style={{ fontSize: 9 }} />
                            {p.decisao}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="status-pill" style={{ background: `${stColor}15`, color: stColor, fontSize: 10 }}>{p.status}</span>
                        {p.categoria && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.categoria}</span>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 60, height: 3, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${p.progresso}%`, background: stColor, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>{p.progresso}%</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      {!p.decisao && (
                        <>
                          <motion.button
                            className="btn btn-sm"
                            onClick={() => { setDecisionModal({ projeto: p, tipo: 'aprovado' }); setObservacao('') }}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            style={{ background: '#22c55e15', color: '#22c55e', border: '1px solid #22c55e30', fontSize: 10, padding: '5px 10px', fontWeight: 700 }}
                          >
                            <i className="fa-solid fa-check" style={{ fontSize: 9 }} />Aprovar
                          </motion.button>
                          <motion.button
                            className="btn btn-sm"
                            onClick={() => { setDecisionModal({ projeto: p, tipo: 'rejeitado' }); setObservacao('') }}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            style={{ background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', fontSize: 10, padding: '5px 10px', fontWeight: 700 }}
                          >
                            <i className="fa-solid fa-xmark" style={{ fontSize: 9 }} />Rejeitar
                          </motion.button>
                        </>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(p)} style={{ fontSize: 10 }}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => void excluir(p.id)} style={{ fontSize: 10 }}>Del</button>
                    </div>
                  </motion.div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0 16px 16px 36px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {p.descricao && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                              {p.descricao}
                            </div>
                          )}
                          {p.observacao && (
                            <div style={{ display: 'flex', gap: 8, background: `${dcColor}10`, border: `1px solid ${dcColor}30`, borderRadius: 8, padding: '10px 14px' }}>
                              <i className={`fa-solid ${DECISAO_ICONS[p.decisao!]}`} style={{ fontSize: 12, color: dcColor, marginTop: 2, flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: dcColor, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Observação</div>
                                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{p.observacao}</div>
                                {p.decidido_at && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(p.decidido_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>}
                              </div>
                            </div>
                          )}
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            Criado em {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
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

      {/* Decision Modal */}
      <AnimatePresence>
        {decisionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={e => { if (e.target === e.currentTarget) setDecisionModal(null) }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              style={{ background: 'var(--surface)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 500, border: `1.5px solid ${DECISAO_COLORS[decisionModal.tipo]}40`, boxShadow: `0 20px 60px rgba(0,0,0,.4), 0 0 0 1px ${DECISAO_COLORS[decisionModal.tipo]}20` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${DECISAO_COLORS[decisionModal.tipo]}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`fa-solid ${DECISAO_ICONS[decisionModal.tipo]}`} style={{ fontSize: 20, color: DECISAO_COLORS[decisionModal.tipo] }} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {decisionModal.tipo === 'aprovado' ? 'Aprovar Projeto' : 'Rejeitar Projeto'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{decisionModal.projeto.nome}</div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>
                  Observação {decisionModal.tipo === 'rejeitado' ? '(motivo da rejeição)' : '(próximos passos, notas)'}
                </label>
                <textarea
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  placeholder={decisionModal.tipo === 'aprovado'
                    ? 'Ex: Aprovado para Q3. Prioridade alta. Alocar R$50k de budget inicial.'
                    : 'Ex: Mercado muito competitivo sem diferencial claro. Revisar proposta de valor antes de retomar.'}
                  rows={4}
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--foreground)', resize: 'vertical', outline: 'none', lineHeight: 1.6, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setDecisionModal(null)}>Cancelar</button>
                <motion.button
                  onClick={() => void decidir()}
                  disabled={decidindo}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: DECISAO_COLORS[decisionModal.tipo], color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {decidindo
                    ? <><motion.i className="fa-solid fa-spinner" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ fontSize: 12 }} />Salvando...</>
                    : <><i className={`fa-solid ${DECISAO_ICONS[decisionModal.tipo]}`} style={{ fontSize: 12 }} />{decisionModal.tipo === 'aprovado' ? 'Confirmar aprovação' : 'Confirmar rejeição'}</>}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
