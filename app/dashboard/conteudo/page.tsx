'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

type Conteudo = { id: string; titulo: string; formato: string; plataforma: string; status: string; data_publicacao: string | null; created_at: string }

const ST: Record<string, string> = { ideia: '#F59E0B', producao: '#2563EB', revisao: '#7C3AED', agendado: '#0D9488', publicado: '#22C55E' }
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

export default function ConteudoPage() {
  const [itens, setItens] = useState<Conteudo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Conteudo | null>(null)
  const [empresaId, setEmpresaId] = useState('')
  const [form, setForm] = useState({ titulo: '', formato: 'post', plataforma: 'instagram', status: 'ideia', data_publicacao: '' })
  const [saving, setSaving] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')

  useEffect(() => { void carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const eid = u?.empresa_id ?? user.id
    setEmpresaId(eid)
    const { data } = await supabase.from('hub_conteudo').select('*').eq('empresa_id', eid).order('created_at', { ascending: false })
    setItens((data ?? []) as Conteudo[])
    setLoading(false)
  }

  function abrirNovo() { setEditando(null); setForm({ titulo: '', formato: 'post', plataforma: 'instagram', status: 'ideia', data_publicacao: '' }); setShowForm(true) }
  function abrirEditar(c: Conteudo) { setEditando(c); setForm({ titulo: c.titulo, formato: c.formato, plataforma: c.plataforma, status: c.status, data_publicacao: c.data_publicacao ? c.data_publicacao.slice(0, 16) : '' }); setShowForm(true) }

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const payload = { titulo: form.titulo, formato: form.formato, plataforma: form.plataforma, status: form.status, data_publicacao: form.data_publicacao || null, empresa_id: empresaId }
    if (editando) await supabase.from('hub_conteudo').update(payload).eq('id', editando.id)
    else await supabase.from('hub_conteudo').insert(payload)
    setSaving(false); setShowForm(false); void carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir conteudo?')) return
    await supabase.from('hub_conteudo').delete().eq('id', id)
    void carregar()
  }

  const filtrados = itens.filter(c => !filtroStatus || c.status === filtroStatus)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['', 'ideia', 'producao', 'revisao', 'agendado', 'publicado'] as const).map(s => (
            <motion.button
              key={s}
              onClick={() => setFiltroStatus(s)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                background: filtroStatus === s ? 'var(--accent)' : 'var(--surface-2)',
                color: filtroStatus === s ? '#fff' : 'var(--text-muted)',
                transition: 'all .15s',
              }}
            >
              {s || 'Todos'}
            </motion.button>
          ))}
        </div>
        <motion.button className="btn btn-primary" onClick={abrirNovo} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <i className="fa-solid fa-plus" style={{ fontSize: 11 }} />Novo Conteudo
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28, ease: 'easeOut' }} style={{ overflow: 'hidden' }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>{editando ? 'Editar Conteudo' : 'Novo Conteudo'}</div>
              <form onSubmit={(e) => { void salvar(e) }}>
                <div style={{ marginBottom: 12 }}><label className="form-label">Titulo *</label><input className="form-input" required value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div><label className="form-label">Formato</label>
                    <select className="form-input form-select" value={form.formato} onChange={e => setForm(f => ({ ...f, formato: e.target.value }))}>
                      {['post', 'carrossel', 'reels', 'story', 'video', 'podcast', 'artigo', 'email', 'outro'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Plataforma</label>
                    <select className="form-input form-select" value={form.plataforma} onChange={e => setForm(f => ({ ...f, plataforma: e.target.value }))}>
                      {['instagram', 'linkedin', 'tiktok', 'youtube', 'twitter', 'email', 'blog', 'outro'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Status</label>
                    <select className="form-input form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {['ideia', 'producao', 'revisao', 'agendado', 'publicado'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Data publicacao</label><input className="form-input" type="datetime-local" value={form.data_publicacao} onChange={e => setForm(f => ({ ...f, data_publicacao: e.target.value }))} /></div>
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
            <i className="fa-solid fa-pen-nib" style={{ fontSize: 28, marginBottom: 12, display: 'block', opacity: 0.3 }} />
            <div style={{ fontSize: 13 }}>{filtroStatus ? `Nenhum conteudo "${filtroStatus}".` : 'Nenhum conteudo ainda.'}</div>
            {!filtroStatus && <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={abrirNovo}>Criar primeiro conteudo</button>}
          </motion.div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crud-table">
              <thead><tr><th>Titulo</th><th>Formato</th><th>Plataforma</th><th>Status</th><th>Publicacao</th><th>Criado</th><th style={{ width: 100 }}></th></tr></thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtrados.map((c, i) => (
                    <motion.tr key={c.id} variants={fadeUp} initial="hidden" animate="show" transition={{ delay: i * 0.03 }}>
                      <td style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{c.titulo}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.formato}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.plataforma}</td>
                      <td><span className="status-pill" style={{ background: `${ST[c.status] ?? '#64748B'}18`, color: ST[c.status] ?? '#64748B' }}>{c.status}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: "'DM Mono',monospace" }}>{c.data_publicacao ? new Date(c.data_publicacao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
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
