'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Ideia = { id: string; titulo: string; descricao: string | null; origem: string; tipo: string; status: string; created_at: string }

const STATUS_COLORS: Record<string, string> = { nova: '#2563EB', aprovada: '#059669', rejeitada: '#EF4444', desenvolvendo: '#7C3AED', concluida: '#0D9488' }

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
    if (editando) { await supabase.from('hub_ideias').update(payload).eq('id', editando.id) }
    else { await supabase.from('hub_ideias').insert(payload) }
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
        <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{itens.length} ideia{itens.length !== 1 ? 's' : ''}</div>
        <button className="btn-action" onClick={abrirNovo}><i className="fa-solid fa-plus" style={{ marginRight: 6 }} />Nova Ideia</button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>{editando ? 'Editar Ideia' : 'Nova Ideia'}</div>
          <form onSubmit={(e) => { void salvar(e) }}>
            <div style={{ marginBottom: 12 }}><label className="form-label">Título *</label><input className="form-input" required value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} /></div>
            <div style={{ marginBottom: 12 }}><label className="form-label">Descrição</label><textarea className="form-input" rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
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
              <button className="btn-action" type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
              <button className="btn-outline" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 12 }}>Carregando…</div>
        ) : itens.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 12 }}>
            <i className="fa-solid fa-lightbulb" style={{ fontSize: 28, marginBottom: 10, display: 'block', opacity: .3 }} />
            Nenhuma ideia ainda. Capture a primeira!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crud-table">
              <thead><tr><th>Ideia</th><th>Tipo</th><th>Origem</th><th>Status</th><th>Criado</th><th></th></tr></thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id}>
                    <td><div style={{ fontWeight: 600, color: 'var(--navy)' }}>{item.titulo}</div>{item.descricao && <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{item.descricao}</div>}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{item.tipo}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{item.origem}</td>
                    <td><span className="status-pill" style={{ background: `${STATUS_COLORS[item.status] ?? '#94A3B8'}15`, color: STATUS_COLORS[item.status] ?? '#94A3B8' }}>{item.status}</span></td>
                    <td style={{ color: 'var(--gray-400)', fontSize: 11, fontFamily: "'DM Mono',monospace" }}>{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => abrirEditar(item)}>Editar</button>
                        <button className="btn-outline btn-danger" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => void excluir(item.id)}>Excluir</button>
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
