'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Evento = { id: string; titulo: string; descricao: string | null; tipo: string; data_inicio: string | null; data_fim: string | null; local: string | null; nicho: string | null; status: string; created_at: string }

const STATUS_COLORS: Record<string, string> = { planejado: '#2563EB', confirmado: '#059669', em_andamento: '#7C3AED', concluido: '#0D9488', cancelado: '#EF4444' }

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

  function abrirNovo() {
    setEditando(null)
    setForm({ titulo: '', descricao: '', tipo: 'mentoria', data_inicio: '', data_fim: '', local: '', nicho: '', status: 'planejado' })
    setShowForm(true)
  }
  function abrirEditar(ev: Evento) {
    setEditando(ev)
    setForm({ titulo: ev.titulo, descricao: ev.descricao ?? '', tipo: ev.tipo, data_inicio: ev.data_inicio ? ev.data_inicio.slice(0, 16) : '', data_fim: ev.data_fim ? ev.data_fim.slice(0, 16) : '', local: ev.local ?? '', nicho: ev.nicho ?? '', status: ev.status })
    setShowForm(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const payload = { titulo: form.titulo, descricao: form.descricao || null, tipo: form.tipo, data_inicio: form.data_inicio || null, data_fim: form.data_fim || null, local: form.local || null, nicho: form.nicho || null, status: form.status, empresa_id: empresaId }
    if (editando) { await supabase.from('hub_eventos').update(payload).eq('id', editando.id) }
    else { await supabase.from('hub_eventos').insert(payload) }
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
        <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{itens.length} evento{itens.length !== 1 ? 's' : ''}</div>
        <button className="btn-action" onClick={abrirNovo}><i className="fa-solid fa-plus" style={{ marginRight: 6 }} />Novo Evento</button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>{editando ? 'Editar Evento' : 'Novo Evento'}</div>
          <form onSubmit={(e) => { void salvar(e) }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label className="form-label">Título *</label><input className="form-input" required value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} /></div>
              <div><label className="form-label">Tipo</label>
                <select className="form-input form-select" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {['mentoria', 'workshop', 'palestra', 'imersao', 'networking', 'outro'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="form-label">Data início</label><input className="form-input" type="datetime-local" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
              <div><label className="form-label">Data fim</label><input className="form-input" type="datetime-local" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} /></div>
              <div><label className="form-label">Local</label><input className="form-input" value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} /></div>
              <div><label className="form-label">Nicho</label><input className="form-input" value={form.nicho} onChange={e => setForm(f => ({ ...f, nicho: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: 12 }}><label className="form-label">Descrição</label><textarea className="form-input" rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div style={{ marginBottom: 16 }}><label className="form-label">Status</label>
              <select className="form-input form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {['planejado', 'confirmado', 'em_andamento', 'concluido', 'cancelado'].map(s => <option key={s} value={s}>{s}</option>)}
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
        ) : itens.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 12 }}>
            <i className="fa-solid fa-calendar-star" style={{ fontSize: 28, marginBottom: 10, display: 'block', opacity: .3 }} />
            Nenhum evento ainda.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crud-table">
              <thead><tr><th>Evento</th><th>Tipo</th><th>Data</th><th>Local</th><th>Nicho</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {itens.map((ev) => (
                  <tr key={ev.id}>
                    <td><div style={{ fontWeight: 600, color: 'var(--navy)' }}>{ev.titulo}</div>{ev.descricao && <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{ev.descricao}</div>}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{ev.tipo}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 11, fontFamily: "'DM Mono',monospace" }}>{ev.data_inicio ? new Date(ev.data_inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{ev.local || '—'}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{ev.nicho || '—'}</td>
                    <td><span className="status-pill" style={{ background: `${STATUS_COLORS[ev.status] ?? '#94A3B8'}15`, color: STATUS_COLORS[ev.status] ?? '#94A3B8' }}>{ev.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => abrirEditar(ev)}>Editar</button>
                        <button className="btn-outline btn-danger" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => void excluir(ev.id)}>Excluir</button>
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
