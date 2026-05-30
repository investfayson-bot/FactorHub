'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Cliente = { id: string; nome: string; email: string | null; telefone: string | null; segmento: string | null; status: string; created_at: string }

const STATUS_COLORS: Record<string, string> = { lead: '#F59E0B', ativo: '#059669', socio: '#7C3AED', inativo: '#94A3B8' }

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
    if (editando) { await supabase.from('hub_clientes').update(payload).eq('id', editando.id) }
    else { await supabase.from('hub_clientes').insert(payload) }
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
        <input className="form-input" placeholder="Buscar cliente…" value={busca} onChange={e => setBusca(e.target.value)} style={{ maxWidth: 280 }} />
        <button className="btn-action" onClick={abrirNovo}><i className="fa-solid fa-plus" style={{ marginRight: 6 }} />Novo Cliente</button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>{editando ? 'Editar Cliente' : 'Novo Cliente'}</div>
          <form onSubmit={(e) => { void salvar(e) }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label className="form-label">Nome *</label><input className="form-input" required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
              <div><label className="form-label">E-mail</label><input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label className="form-label">Telefone</label><input className="form-input" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
              <div><label className="form-label">Segmento</label><input className="form-input" value={form.segmento} onChange={e => setForm(f => ({ ...f, segmento: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: 16 }}><label className="form-label">Status</label>
              <select className="form-input form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {['lead', 'ativo', 'socio', 'inativo'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
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
            <i className="fa-solid fa-users" style={{ fontSize: 28, marginBottom: 10, display: 'block', opacity: .3 }} />
            {busca ? 'Nenhum resultado.' : 'Nenhum cliente ainda.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crud-table">
              <thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Segmento</th><th>Status</th><th>Criado</th><th></th></tr></thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{c.nome}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{c.email || '—'}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{c.telefone || '—'}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{c.segmento || '—'}</td>
                    <td><span className="status-pill" style={{ background: `${STATUS_COLORS[c.status] ?? '#94A3B8'}15`, color: STATUS_COLORS[c.status] ?? '#94A3B8' }}>{c.status}</span></td>
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
