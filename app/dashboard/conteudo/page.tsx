'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Conteudo = { id: string; titulo: string; formato: string; plataforma: string; status: string; data_publicacao: string | null; created_at: string }

const STATUS_COLORS: Record<string, string> = { ideia: '#F59E0B', producao: '#2563EB', revisao: '#7C3AED', agendado: '#0D9488', publicado: '#059669' }

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
    if (editando) { await supabase.from('hub_conteudo').update(payload).eq('id', editando.id) }
    else { await supabase.from('hub_conteudo').insert(payload) }
    setSaving(false); setShowForm(false); void carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir conteúdo?')) return
    await supabase.from('hub_conteudo').delete().eq('id', id)
    void carregar()
  }

  const filtrados = itens.filter(c => !filtroStatus || c.status === filtroStatus)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['', 'ideia', 'producao', 'revisao', 'agendado', 'publicado'].map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)} className={filtroStatus === s ? 'btn-action' : 'btn-outline'} style={{ padding: '5px 12px', fontSize: 11 }}>
              {s || 'Todos'}
            </button>
          ))}
        </div>
        <button className="btn-action" onClick={abrirNovo}><i className="fa-solid fa-plus" style={{ marginRight: 6 }} />Novo Conteúdo</button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>{editando ? 'Editar Conteúdo' : 'Novo Conteúdo'}</div>
          <form onSubmit={(e) => { void salvar(e) }}>
            <div style={{ marginBottom: 12 }}><label className="form-label">Título *</label><input className="form-input" required value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
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
              <div><label className="form-label">Data publicação</label><input className="form-input" type="datetime-local" value={form.data_publicacao} onChange={e => setForm(f => ({ ...f, data_publicacao: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-action" type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
              <button className="btn-outline" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 12 }}>Carregando…</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 12 }}>
            <i className="fa-solid fa-pen-nib" style={{ fontSize: 28, marginBottom: 10, display: 'block', opacity: .3 }} />
            Nenhum conteúdo {filtroStatus ? `com status "${filtroStatus}"` : 'ainda'}.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crud-table">
              <thead><tr><th>Título</th><th>Formato</th><th>Plataforma</th><th>Status</th><th>Publicação</th><th>Criado</th><th></th></tr></thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{c.titulo}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{c.formato}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{c.plataforma}</td>
                    <td><span className="status-pill" style={{ background: `${STATUS_COLORS[c.status] ?? '#94A3B8'}15`, color: STATUS_COLORS[c.status] ?? '#94A3B8' }}>{c.status}</span></td>
                    <td style={{ color: 'var(--gray-400)', fontSize: 11, fontFamily: "'DM Mono',monospace" }}>{c.data_publicacao ? new Date(c.data_publicacao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td style={{ color: 'var(--gray-400)', fontSize: 11, fontFamily: "'DM Mono',monospace" }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => abrirEditar(c)}>Editar</button>
                        <button className="btn-outline btn-danger" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => void excluir(c.id)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
