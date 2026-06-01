'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/layout/PageHeader'

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
  ideia: '#f59e0b', planejamento: '#eab308', desenvolvimento: '#3ecf8e',
  concluido: '#22c55e', pausado: '#888888',
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

  // "Virar Projeto" vindo das Tarefas — cria o projeto automaticamente
  useEffect(() => {
    if (!empresaId) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('from') === 'missao') {
      const nome = params.get('nome')
      if (nome) {
        void (async () => {
          await supabase.from('hub_projetos').insert({
            nome: decodeURIComponent(nome), descricao: 'Criado a partir de uma missão aprovada',
            status: 'planejamento', progresso: 0, categoria: 'Missão', empresa_id: empresaId,
          })
          // limpa a URL e recarrega
          window.history.replaceState({}, '', '/dashboard/projetos')
          void carregar()
        })()
      }
    }
  }, [empresaId, carregar])

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

      <PageHeader
        title="Projetos"
        subtitle={`Acompanhe o andamento de cada projeto — ${itens.length} projeto${itens.length !== 1 ? 's' : ''}`}
        action={
          <button className="btn btn-primary" onClick={abrirNovo}>
            <i className="fa-solid fa-plus" style={{ fontSize: 11 }} />Novo Projeto
          </button>
        }
      />

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

      {/* Kanban board */}
      {loading ? (
        <div style={{ padding: 50, display: 'flex', justifyContent: 'center' }}>
          <motion.div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
        </div>
      ) : itens.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-diagram-project" style={{ fontSize: 28, marginBottom: 12, display: 'block', opacity: 0.3 }} />
          <div style={{ fontSize: 13, marginBottom: 14 }}>Nenhum projeto ainda.</div>
          <button className="btn btn-primary" onClick={abrirNovo}>Criar primeiro projeto</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, alignItems: 'start' }}>
          {(['ideia', 'planejamento', 'desenvolvimento', 'concluido', 'pausado'] as const).map(col => {
            const colColor = STATUS_COLORS[col]
            const colItems = filtrados.filter(p => p.status === col)
            return (
              <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Column header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 2px' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: colColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{col}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)', marginLeft: 'auto' }}>{colItems.length}</span>
                </div>
                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {colItems.map(p => {
                    const isSel = selectedId === p.id
                    const dcColor = p.decisao ? DECISAO_COLORS[p.decisao] : '#f59e0b'
                    return (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setSelectedId(isSel ? null : p.id)}
                        whileHover={{ y: -1 }}
                        style={{ background: 'var(--surface)', border: `1px solid ${isSel ? colColor + '60' : 'var(--border)'}`, borderRadius: 8, padding: '10px 11px', cursor: 'pointer', transition: 'border-color .15s' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 7 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, flex: 1 }}>{p.nome}</span>
                          {p.decisao && <i className={`fa-solid ${DECISAO_ICONS[p.decisao]}`} style={{ fontSize: 10, color: dcColor, flexShrink: 0, marginTop: 2 }} />}
                        </div>
                        <div style={{ height: 3, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ height: '100%', width: `${p.progresso}%`, background: colColor, borderRadius: 2 }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {p.categoria && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'var(--surface-2)', color: 'var(--text-dim)' }}>{p.categoria}</span>}
                          <span style={{ fontSize: 9, color: 'var(--text-dim)', marginLeft: 'auto', fontFamily: "'DM Mono',monospace" }}>{p.progresso}%</span>
                        </div>

                        {/* Expanded actions */}
                        <AnimatePresence>
                          {isSel && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                              {p.descricao && <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 8 }}>{p.descricao}</div>}
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {!p.decisao && (
                                  <>
                                    <button onClick={() => { setDecisionModal({ projeto: p, tipo: 'aprovado' }); setObservacao('') }} style={{ fontSize: 9, fontWeight: 700, padding: '4px 8px', borderRadius: 5, background: '#22c55e15', color: '#22c55e', border: '1px solid #22c55e30', cursor: 'pointer', fontFamily: 'inherit' }}><i className="fa-solid fa-check" style={{ fontSize: 8, marginRight: 3 }} />Aprovar</button>
                                    <button onClick={() => { setDecisionModal({ projeto: p, tipo: 'rejeitado' }); setObservacao('') }} style={{ fontSize: 9, fontWeight: 700, padding: '4px 8px', borderRadius: 5, background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', cursor: 'pointer', fontFamily: 'inherit' }}><i className="fa-solid fa-xmark" style={{ fontSize: 8, marginRight: 3 }} />Rejeitar</button>
                                  </>
                                )}
                                <button onClick={() => abrirEditar(p)} style={{ fontSize: 9, padding: '4px 8px', borderRadius: 5, background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}><i className="fa-solid fa-pen" style={{ fontSize: 8 }} /></button>
                                <button onClick={() => void excluir(p.id)} style={{ fontSize: 9, padding: '4px 8px', borderRadius: 5, background: 'rgba(244,68,68,.08)', color: '#f44', border: '1px solid rgba(244,68,68,.2)', cursor: 'pointer', fontFamily: 'inherit' }}><i className="fa-solid fa-trash" style={{ fontSize: 8 }} /></button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

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
