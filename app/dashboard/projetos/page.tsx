'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

type Projeto = { id: string; nome: string; descricao: string | null; status: string; progresso: number; categoria: string | null; created_at: string }

const ST: Record<string, string> = { ideia: '#F59E0B', planejamento: '#2563EB', desenvolvimento: '#7C3AED', concluido: '#22C55E', pausado: '#64748B' }

const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

export default function ProjetosPage() {
  const [itens, setItens] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Projeto | null>(null)
  const [empresaId, setEmpresaId] = useState('')
  const [form, setForm] = useState({ nome: '', descricao: '', status: 'ideia', progresso: 0, categoria: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { void carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const eid = u?.empresa_id ?? user.id
    setEmpresaId(eid)
    const { data } = await supabase.from('hub_projetos').select('*').eq('empresa_id', eid).order('created_at', { ascending: false })
    setItens((data ?? []) as Projeto[])
    setLoading(false)
  }

  function abrirNovo() { setEditando(null); setForm({ nome: '', descricao: '', status: 'ideia', progresso: 0, categoria: '' }); setShowForm(true) }
  function abrirEditar(p: Projeto) { setEditando(p); setForm({ nome: p.nome, descricao: p.descricao ?? '', status: p.status, progresso: p.progresso, categoria: p.categoria ?? '' }); setShowForm(true) }

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const payload = { nome: form.nome, descricao: form.descricao || null, status: form.status, progresso: Number(form.progresso), categoria: form.categoria || null, empresa_id: empresaId }
    if (editando) await supabase.from('hub_projetos').update(payload).eq('id', editando.id)
    else await supabase.from('hub_projetos').insert(payload)
    setSaving(false); setShowForm(false); void carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir projeto?')) return
    await supabase.from('hub_projetos').delete().eq('id', id)
    void carregar()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{itens.length} projeto{itens.length !== 1 ? 's' : ''}</div>
        <motion.button className="btn btn-primary" onClick={abrirNovo} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <i className="fa-solid fa-plus" style={{ fontSize: 11 }} />Novo Projeto
        </motion.button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>
                {editando ? 'Editar Projeto' : 'Novo Projeto'}
              </div>
              <form onSubmit={(e) => { void salvar(e) }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div><label className="form-label">Nome *</label><input className="form-input" required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
                  <div><label className="form-label">Categoria</label><input className="form-input" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} /></div>
                </div>
                <div style={{ marginBottom: 12 }}><label className="form-label">Descricao</label><textarea className="form-input" rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div><label className="form-label">Status</label>
                    <select className="form-input form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {['ideia', 'planejamento', 'desenvolvimento', 'concluido', 'pausado'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Progresso (%)</label><input className="form-input" type="number" min={0} max={100} value={form.progresso} onChange={e => setForm(f => ({ ...f, progresso: Number(e.target.value) }))} /></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button className="btn btn-primary" type="submit" disabled={saving} whileHover={!saving ? { scale: 1.02 } : {}} whileTap={!saving ? { scale: 0.97 } : {}}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </motion.button>
                  <motion.button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>Cancelar</motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '50px', display: 'flex', justifyContent: 'center' }}>
            <motion.div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border-light)', borderTopColor: 'var(--accent)' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
          </div>
        ) : itens.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-diagram-project" style={{ fontSize: 28, marginBottom: 12, display: 'block', opacity: 0.3 }} />
            <div style={{ fontSize: 13 }}>Nenhum projeto ainda.</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={abrirNovo}>Criar primeiro projeto</button>
          </motion.div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crud-table">
              <thead><tr><th>Projeto</th><th>Status</th><th>Progresso</th><th>Categoria</th><th>Criado</th><th style={{ width: 100 }}></th></tr></thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {itens.map((p, i) => (
                    <motion.tr key={p.id} variants={fadeUp} initial="hidden" animate="show" transition={{ delay: i * 0.03 }}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{p.nome}</div>
                        {p.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.descricao}</div>}
                      </td>
                      <td>
                        <span className="status-pill" style={{ background: `${ST[p.status] ?? '#64748B'}18`, color: ST[p.status] ?? '#64748B' }}>{p.status}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                          <div style={{ flex: 1, height: 5, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${p.progresso}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} style={{ height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)', minWidth: 30 }}>{p.progresso}%</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.categoria || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: "'DM Mono',monospace" }}>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(p)}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => void excluir(p.id)}>Del</button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
