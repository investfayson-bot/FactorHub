'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

type Ideia = { id: string; titulo: string; descricao: string | null; origem: string; tipo: string; status: string; created_at: string }

const ST: Record<string, string> = { nova: '#2563EB', aprovada: '#22C55E', rejeitada: '#EF4444', desenvolvendo: '#7C3AED', concluida: '#0D9488' }
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

export default function IdeiasPage() {
  const [itens, setItens] = useState<Ideia[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Ideia | null>(null)
  const [empresaId, setEmpresaId] = useState('')
  const [form, setForm] = useState({ titulo: '', descricao: '', origem: 'manual', tipo: 'feature', status: 'nova' })
  const [saving, setSaving] = useState(false)

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

  function abrirNovo() { setEditando(null); setForm({ titulo: '', descricao: '', origem: 'manual', tipo: 'feature', status: 'nova' }); setShowForm(true) }
  function abrirEditar(i: Ideia) { setEditando(i); setForm({ titulo: i.titulo, descricao: i.descricao ?? '', origem: i.origem, tipo: i.tipo, status: i.status }); setShowForm(true) }

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const payload = { titulo: form.titulo, descricao: form.descricao || null, origem: form.origem, tipo: form.tipo, status: form.status, empresa_id: empresaId }
    if (editando) await supabase.from('hub_ideias').update(payload).eq('id', editando.id)
    else await supabase.from('hub_ideias').insert(payload)
    setSaving(false); setShowForm(false); void carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir ideia?')) return
    await supabase.from('hub_ideias').delete().eq('id', id)
    void carregar()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{itens.length} ideia{itens.length !== 1 ? 's' : ''}</div>
        <motion.button className="btn btn-primary" onClick={abrirNovo} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <i className="fa-solid fa-plus" style={{ fontSize: 11 }} />Nova Ideia
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28, ease: 'easeOut' }} style={{ overflow: 'hidden' }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>{editando ? 'Editar Ideia' : 'Nova Ideia'}</div>
              <form onSubmit={(e) => { void salvar(e) }}>
                <div style={{ marginBottom: 12 }}><label className="form-label">Titulo *</label><input className="form-input" required value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} /></div>
                <div style={{ marginBottom: 12 }}><label className="form-label">Descricao</label><textarea className="form-input" rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div><label className="form-label">Origem</label>
                    <select className="form-input form-select" value={form.origem} onChange={e => setForm(f => ({ ...f, origem: e.target.value }))}>
                      {['manual', 'cliente', 'evento', 'agente_ia'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Tipo</label>
                    <select className="form-input form-select" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                      {['feature', 'melhoria', 'bug', 'pesquisa', 'outro'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Status</label>
                    <select className="form-input form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {['nova', 'aprovada', 'rejeitada', 'desenvolvendo', 'concluida'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button className="btn btn-primary" type="submit" disabled={saving} whileHover={!saving ? { scale: 1.02 } : {}} whileTap={!saving ? { scale: 0.97 } : {}}>{saving ? 'Salvando...' : 'Salvar'}</motion.button>
                  <motion.button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)} whileHover={{ scale: 1.02 }}>Cancelar</motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '50px', display: 'flex', justifyContent: 'center' }}>
            <motion.div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border-light)', borderTopColor: 'var(--accent)' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
          </div>
        ) : itens.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-lightbulb" style={{ fontSize: 28, marginBottom: 12, display: 'block', opacity: 0.3 }} />
            <div style={{ fontSize: 13 }}>Nenhuma ideia ainda.</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={abrirNovo}>Capturar primeira ideia</button>
          </motion.div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crud-table">
              <thead><tr><th>Ideia</th><th>Tipo</th><th>Origem</th><th>Status</th><th>Criado</th><th style={{ width: 100 }}></th></tr></thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {itens.map((item, i) => (
                    <motion.tr key={item.id} variants={fadeUp} initial="hidden" animate="show" transition={{ delay: i * 0.03 }}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{item.titulo}</div>
                        {item.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.descricao}</div>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.tipo}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.origem}</td>
                      <td><span className="status-pill" style={{ background: `${ST[item.status] ?? '#64748B'}18`, color: ST[item.status] ?? '#64748B' }}>{item.status}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: "'DM Mono',monospace" }}>{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(item)}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => void excluir(item.id)}>Del</button>
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
