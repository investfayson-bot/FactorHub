'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

type Cliente = { id: string; nome: string; email: string | null; telefone: string | null; segmento: string | null; status: string; created_at: string }

const ST: Record<string, string> = { lead: '#F59E0B', ativo: '#22C55E', socio: '#7C3AED', inativo: '#64748B' }
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

export default function ClientesPage() {
  const [itens, setItens] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [empresaId, setEmpresaId] = useState('')
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', segmento: '', status: 'lead' })
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')

  useEffect(() => { void carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const eid = u?.empresa_id ?? user.id
    setEmpresaId(eid)
    const { data } = await supabase.from('hub_clientes').select('*').eq('empresa_id', eid).order('created_at', { ascending: false })
    setItens((data ?? []) as Cliente[])
    setLoading(false)
  }

  function abrirNovo() { setEditando(null); setForm({ nome: '', email: '', telefone: '', segmento: '', status: 'lead' }); setShowForm(true) }
  function abrirEditar(c: Cliente) { setEditando(c); setForm({ nome: c.nome, email: c.email ?? '', telefone: c.telefone ?? '', segmento: c.segmento ?? '', status: c.status }); setShowForm(true) }

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const payload = { nome: form.nome, email: form.email || null, telefone: form.telefone || null, segmento: form.segmento || null, status: form.status, empresa_id: empresaId }
    if (editando) await supabase.from('hub_clientes').update(payload).eq('id', editando.id)
    else await supabase.from('hub_clientes').insert(payload)
    setSaving(false); setShowForm(false); void carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir cliente?')) return
    await supabase.from('hub_clientes').delete().eq('id', id)
    void carregar()
  }

  const filtrados = itens.filter(c => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) || (c.email ?? '').toLowerCase().includes(busca.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <input className="form-input" placeholder="Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)} style={{ paddingLeft: 34 }} />
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-dim)' }} />
        </div>
        <motion.button className="btn btn-primary" onClick={abrirNovo} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <i className="fa-solid fa-plus" style={{ fontSize: 11 }} />Novo Cliente
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28, ease: 'easeOut' }} style={{ overflow: 'hidden' }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>{editando ? 'Editar Cliente' : 'Novo Cliente'}</div>
              <form onSubmit={(e) => { void salvar(e) }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div><label className="form-label">Nome *</label><input className="form-input" required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
                  <div><label className="form-label">E-mail</label><input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div><label className="form-label">Telefone</label><input className="form-input" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
                  <div><label className="form-label">Segmento</label><input className="form-input" value={form.segmento} onChange={e => setForm(f => ({ ...f, segmento: e.target.value }))} /></div>
                </div>
                <div style={{ marginBottom: 20 }}><label className="form-label">Status</label>
                  <select className="form-input form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {['lead', 'ativo', 'socio', 'inativo'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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
        ) : filtrados.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-users" style={{ fontSize: 28, marginBottom: 12, display: 'block', opacity: 0.3 }} />
            <div style={{ fontSize: 13 }}>{busca ? 'Nenhum resultado.' : 'Nenhum cliente ainda.'}</div>
            {!busca && <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={abrirNovo}>Adicionar primeiro cliente</button>}
          </motion.div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crud-table">
              <thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Segmento</th><th>Status</th><th>Criado</th><th style={{ width: 100 }}></th></tr></thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtrados.map((c, i) => (
                    <motion.tr key={c.id} variants={fadeUp} initial="hidden" animate="show" transition={{ delay: i * 0.03 }}>
                      <td style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{c.nome}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.email || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.telefone || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.segmento || '—'}</td>
                      <td><span className="status-pill" style={{ background: `${ST[c.status] ?? '#64748B'}18`, color: ST[c.status] ?? '#64748B' }}>{c.status}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: "'DM Mono',monospace" }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(c)}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => void excluir(c.id)}>Del</button>
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
