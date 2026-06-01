'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Ideia = {
  id: string; titulo: string; descricao: string | null
  origem: string; tipo: string; status: string; created_at: string
}

const COLS: { id: string; label: string; color: string }[] = [
  { id: 'nova',        label: 'Nova',        color: '#3ecf8e' },
  { id: 'aprovada',    label: 'Aprovada',    color: '#3b82f6' },
  { id: 'desenvolvendo', label: 'Em Dev',   color: '#8b5cf6' },
  { id: 'concluida',   label: 'Concluída',  color: '#22c55e' },
  { id: 'rejeitada',   label: 'Rejeitada',  color: '#f44' },
]

const ORIGEM_LABELS: Record<string, string> = {
  manual: 'Manual', cliente: 'Cliente', evento: 'Evento', agente_ia: 'Agente IA',
}
const TIPO_LABELS: Record<string, string> = {
  feature: 'Feature', melhoria: 'Melhoria', bug: 'Bug', pesquisa: 'Pesquisa', outro: 'Outro',
}

export default function IdeiasPage() {
  const router = useRouter()
  const [itens, setItens] = useState<Ideia[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Ideia | null>(null)
  const [empresaId, setEmpresaId] = useState('')
  const [form, setForm] = useState({ titulo: '', descricao: '', origem: 'manual', tipo: 'feature', status: 'nova' })
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Ideia | null>(null)

  useEffect(() => { void carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const eid = u?.empresa_id ?? user.id
    setEmpresaId(eid)
    const { data } = await supabase.from('hub_ideias').select('*').eq('empresa_id', eid).order('created_at', { ascending: false })
    setItens((data ?? []) as Ideia[])
    setLoading(false)
  }

  function abrirNovo() {
    setEditando(null)
    setForm({ titulo: '', descricao: '', origem: 'manual', tipo: 'feature', status: 'nova' })
    setShowForm(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const payload = { titulo: form.titulo, descricao: form.descricao || null, origem: form.origem, tipo: form.tipo, status: form.status, empresa_id: empresaId }
    if (editando) await supabase.from('hub_ideias').update(payload).eq('id', editando.id)
    else await supabase.from('hub_ideias').insert(payload)
    setSaving(false); setShowForm(false); void carregar()
  }

  async function moverStatus(id: string, novoStatus: string) {
    await supabase.from('hub_ideias').update({ status: novoStatus }).eq('id', id)
    setItens(prev => prev.map(i => i.id === id ? { ...i, status: novoStatus } : i))
  }

  async function excluir(id: string) {
    await supabase.from('hub_ideias').delete().eq('id', id)
    setItens(prev => prev.filter(i => i.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  function criarMissao(ideia: Ideia) {
    const texto = `Analisar e executar a ideia: "${ideia.titulo}".\n\n${ideia.descricao || ''}\n\nTipo: ${TIPO_LABELS[ideia.tipo] || ideia.tipo}\nOrigem: ${ORIGEM_LABELS[ideia.origem] || ideia.origem}`
    sessionStorage.setItem('factohub-mission-prefill', texto)
    router.push('/dashboard/missoes?from=ideia')
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <motion.div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Ideias</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Capture, priorize e converta ideias em missões — {itens.length} ideia{itens.length !== 1 ? 's' : ''}
          </div>
        </div>
        <motion.button
          className="btn btn-primary"
          onClick={abrirNovo}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        >
          <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />Nova Ideia
        </motion.button>
      </div>

      {/* New idea form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
                {editando ? 'Editar Ideia' : 'Nova Ideia'}
              </div>
              <form onSubmit={e => { void salvar(e) }}>
                <div style={{ marginBottom: 10 }}>
                  <label className="form-label">Título *</label>
                  <input className="form-input" required value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Integração WhatsApp para leads" />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label className="form-label">Descrição</label>
                  <textarea className="form-input" rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhe a ideia, problema que resolve, impacto esperado..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'Origem', key: 'origem', opts: ['manual', 'cliente', 'evento', 'agente_ia'] },
                    { label: 'Tipo', key: 'tipo', opts: ['feature', 'melhoria', 'bug', 'pesquisa', 'outro'] },
                    { label: 'Status', key: 'status', opts: COLS.map(c => c.id) },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="form-label">{f.label}</label>
                      <select className="form-input form-select" value={form[f.key as keyof typeof form]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}>
                        {f.opts.map(o => <option key={o} value={o}>{ORIGEM_LABELS[o] || TIPO_LABELS[o] || COLS.find(c => c.id === o)?.label || o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
                  <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban board */}
      {itens.length === 0 && !showForm ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-lightbulb" style={{ fontSize: 28, marginBottom: 12, display: 'block', opacity: 0.3 }} />
          <div style={{ fontSize: 13, marginBottom: 14 }}>Nenhuma ideia ainda.</div>
          <button className="btn btn-primary" onClick={abrirNovo}>Capturar primeira ideia</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, flex: 1, overflow: 'hidden' }}>
          {COLS.map(col => {
            const colItems = itens.filter(i => i.status === col.id)
            return (
              <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
                {/* Column header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 2px' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{col.label}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)', marginLeft: 'auto' }}>{colItems.length}</span>
                </div>

                {/* Cards */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {colItems.map(item => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        background: 'var(--surface)',
                        border: `1px solid ${selected?.id === item.id ? col.color + '60' : 'var(--border)'}`,
                        borderRadius: 8, padding: '10px 11px',
                        cursor: 'pointer', transition: 'border-color .15s',
                      }}
                      onClick={() => setSelected(selected?.id === item.id ? null : item)}
                      whileHover={{ y: -1 }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 4, lineHeight: 1.4 }}>{item.titulo}</div>
                      {item.descricao && (
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 6, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {item.descricao}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'var(--surface-2)', color: 'var(--text-dim)' }}>{TIPO_LABELS[item.tipo] || item.tipo}</span>
                        <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'var(--surface-2)', color: 'var(--text-dim)' }}>{ORIGEM_LABELS[item.origem] || item.origem}</span>
                      </div>

                      {/* Expanded actions */}
                      <AnimatePresence>
                        {selected?.id === item.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {/* Move status */}
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {COLS.filter(c => c.id !== item.status).map(c => (
                                  <button
                                    key={c.id}
                                    onClick={e => { e.stopPropagation(); void moverStatus(item.id, c.id) }}
                                    style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, background: `${c.color}15`, color: c.color, border: `1px solid ${c.color}30`, cursor: 'pointer', fontFamily: 'inherit' }}
                                  >
                                    → {c.label}
                                  </button>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
                                <button
                                  onClick={e => { e.stopPropagation(); criarMissao(item) }}
                                  style={{ flex: 1, fontSize: 10, fontWeight: 700, padding: '5px 8px', borderRadius: 6, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}
                                >
                                  <i className="fa-solid fa-rocket" style={{ fontSize: 8, marginRight: 4 }} />Criar Missão
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); setEditando(item); setForm({ titulo: item.titulo, descricao: item.descricao ?? '', origem: item.origem, tipo: item.tipo, status: item.status }); setShowForm(true) }}
                                  style={{ fontSize: 10, padding: '5px 8px', borderRadius: 6, background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}
                                >
                                  <i className="fa-solid fa-pen" style={{ fontSize: 8 }} />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); void excluir(item.id) }}
                                  style={{ fontSize: 10, padding: '5px 8px', borderRadius: 6, background: 'rgba(244,68,68,.08)', color: '#f44', border: '1px solid rgba(244,68,68,.2)', cursor: 'pointer', fontFamily: 'inherit' }}
                                >
                                  <i className="fa-solid fa-trash" style={{ fontSize: 8 }} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
