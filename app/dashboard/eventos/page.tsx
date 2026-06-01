'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

type Evento = { id: string; titulo: string; descricao: string | null; tipo: string; data_inicio: string | null; data_fim: string | null; local: string | null; nicho: string | null; status: string; created_at: string }

const ST: Record<string, string> = { planejado: '#3ecf8e', confirmado: '#22C55E', em_andamento: '#7C3AED', concluido: '#0D9488', cancelado: '#EF4444' }
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

export default function EventosPage() {
  const [itens, setItens] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Evento | null>(null)
  const [empresaId, setEmpresaId] = useState('')
  const [form, setForm] = useState({ titulo: '', descricao: '', tipo: 'mentoria', data_inicio: '', data_fim: '', local: '', nicho: '', status: 'planejado' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { void carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const eid = u?.empresa_id ?? user.id
    setEmpresaId(eid)
    const { data } = await supabase.from('hub_eventos').select('*').eq('empresa_id', eid).order('data_inicio', { ascending: true, nullsFirst: false })
    setItens((data ?? []) as Evento[])
    setLoading(false)
  }

  function abrirNovo() { setEditando(null); setForm({ titulo: '', descricao: '', tipo: 'mentoria', data_inicio: '', data_fim: '', local: '', nicho: '', status: 'planejado' }); setShowForm(true) }
  function abrirEditar(ev: Evento) { setEditando(ev); setForm({ titulo: ev.titulo, descricao: ev.descricao ?? '', tipo: ev.tipo, data_inicio: ev.data_inicio ? ev.data_inicio.slice(0, 16) : '', data_fim: ev.data_fim ? ev.data_fim.slice(0, 16) : '', local: ev.local ?? '', nicho: ev.nicho ?? '', status: ev.status }); setShowForm(true) }

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const payload = { titulo: form.titulo, descricao: form.descricao || null, tipo: form.tipo, data_inicio: form.data_inicio || null, data_fim: form.data_fim || null, local: form.local || null, nicho: form.nicho || null, status: form.status, empresa_id: empresaId }
    if (editando) await supabase.from('hub_eventos').update(payload).eq('id', editando.id)
    else await supabase.from('hub_eventos').insert(payload)
    setSaving(false); setShowForm(false); void carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir evento?')) return
    await supabase.from('hub_eventos').delete().eq('id', id)
    void carregar()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{itens.length} evento{itens.length !== 1 ? 's' : ''}</div>
        <motion.button className="btn btn-primary" onClick={abrirNovo} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <i className="fa-solid fa-plus" style={{ fontSize: 11 }} />Novo Evento
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28, ease: 'easeOut' }} style={{ overflow: 'hidden' }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>{editando ? 'Editar Evento' : 'Novo Evento'}</div>
              <form onSubmit={(e) => { void salvar(e) }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div><label className="form-label">Titulo *</label><input className="form-input" required value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} /></div>
                  <div><label className="form-label">Tipo</label>
                    <select className="form-input form-select" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                      {['mentoria', 'workshop', 'palestra', 'imersao', 'networking', 'outro'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Data inicio</label><input className="form-input" type="datetime-local" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
                  <div><label className="form-label">Data fim</label><input className="form-input" type="datetime-local" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} /></div>
                  <div><label className="form-label">Local</label><input className="form-input" value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} /></div>
                  <div><label className="form-label">Nicho</label><input className="form-input" value={form.nicho} onChange={e => setForm(f => ({ ...f, nicho: e.target.value }))} /></div>
                </div>
                <div style={{ marginBottom: 12 }}><label className="form-label">Descricao</label><textarea className="form-input" rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
                <div style={{ marginBottom: 20 }}><label className="form-label">Status</label>
                  <select className="form-input form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {['planejado', 'confirmado', 'em_andamento', 'concluido', 'cancelado'].map(s => <option key={s} value={s}>{s}</option>)}
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
        ) : itens.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-calendar" style={{ fontSize: 28, marginBottom: 12, display: 'block', opacity: 0.3 }} />
            <div style={{ fontSize: 13 }}>Nenhum evento ainda.</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={abrirNovo}>Criar primeiro evento</button>
          </motion.div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crud-table">
              <thead><tr><th>Evento</th><th>Tipo</th><th>Data</th><th>Local</th><th>Nicho</th><th>Status</th><th style={{ width: 100 }}></th></tr></thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {itens.map((ev, i) => (
                    <motion.tr key={ev.id} variants={fadeUp} initial="hidden" animate="show" transition={{ delay: i * 0.03 }}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{ev.titulo}</div>
                        {ev.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{ev.descricao}</div>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ev.tipo}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: "'DM Mono',monospace" }}>{ev.data_inicio ? new Date(ev.data_inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ev.local || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ev.nicho || '—'}</td>
                      <td><span className="status-pill" style={{ background: `${ST[ev.status] ?? '#64748B'}18`, color: ST[ev.status] ?? '#64748B' }}>{ev.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(ev)}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => void excluir(ev.id)}>Del</button>
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
