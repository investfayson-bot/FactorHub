'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Projeto = { id: string; nome: string; descricao: string | null; status: string; progresso: number; categoria: string | null; created_at: string }

const STATUS_COLORS: Record<string, string> = {
  ideia: '#F59E0B', planejamento: '#2563EB', desenvolvimento: '#7C3AED', concluido: '#059669', pausado: '#94A3B8',
}

export default function ProjetosPage() {
  const [itens, setItens] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Projeto | null>(null)
  const [empresaId, setEmpresaId] = useState<string>('')
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
    if (editando) {
      await supabase.from('hub_projetos').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('hub_projetos').insert(payload)
    }
    setSaving(false); setShowForm(false); void carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir projeto?')) return
    await supabase.from('hub_projetos').delete().eq('id', id)
    void carregar()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{itens.length} projeto{itens.length !== 1 ? 's' : ''}</div>
        <button className="btn-action" onClick={abrirNovo}><i className="fa-solid fa-plus" style={{ marginRight: 6 }} />Novo Projeto</button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>{editando ? 'Editar Projeto' : 'Novo Projeto'}</div>
          <form onSubmit={(e) => { void salvar(e) }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label className="form-label">Nome *</label><input className="form-input" required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
              <div><label className="form-label">Categoria</label><input className="form-input" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: 12 }}><label className="form-label">Descrição</label><textarea className="form-input" rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><label className="form-label">Status</label>
                <select className="form-input form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {['ideia', 'planejamento', 'desenvolvimento', 'concluido', 'pausado'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="form-label">Progresso (%)</label><input className="form-input" type="number" min={0} max={100} value={form.progresso} onChange={e => setForm(f => ({ ...f, progresso: Number(e.target.value) }))} /></div>
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
            <i className="fa-solid fa-diagram-project" style={{ fontSize: 28, marginBottom: 10, display: 'block', opacity: .3 }} />
            Nenhum projeto ainda. Crie o primeiro!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crud-table">
              <thead><tr><th>Projeto</th><th>Status</th><th>Progresso</th><th>Categoria</th><th>Criado</th><th></th></tr></thead>
              <tbody>
                {itens.map((p) => (
                  <tr key={p.id}>
                    <td><div style={{ fontWeight: 600, color: 'var(--navy)' }}>{p.nome}</div>{p.descricao && <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{p.descricao}</div>}</td>
                    <td><span className="status-pill" style={{ background: `${STATUS_COLORS[p.status]}15`, color: STATUS_COLORS[p.status] }}>{p.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--gray-100)', borderRadius: 3, overflow: 'hidden' }}><div style={{ height: '100%', width: `${p.progresso}%`, background: 'var(--teal)', borderRadius: 3 }} /></div>
                        <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: 'var(--gray-500)' }}>{p.progresso}%</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{p.categoria || '—'}</td>
                    <td style={{ color: 'var(--gray-400)', fontSize: 11, fontFamily: "'DM Mono',monospace" }}>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => abrirEditar(p)}>Editar</button>
                        <button className="btn-outline btn-danger" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => void excluir(p.id)}>Excluir</button>
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
