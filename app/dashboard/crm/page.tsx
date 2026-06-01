'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/layout/PageHeader'

type Lead = {
  id: string; nome: string; email: string | null; telefone: string | null
  origem: string; status: string; valor: number; interesse: string | null; notas: string | null; created_at: string
}

const COLS = [
  { id: 'novo', label: 'Novo', color: '#3ecf8e' },
  { id: 'contato', label: 'Em Contato', color: '#84cc16' },
  { id: 'qualificado', label: 'Qualificado', color: '#eab308' },
  { id: 'proposta', label: 'Proposta', color: '#f59e0b' },
  { id: 'fechado', label: 'Fechado', color: '#22c55e' },
  { id: 'perdido', label: 'Perdido', color: '#888888' },
]

async function getToken() { const { data } = await supabase.auth.getSession(); return data.session?.access_token ?? '' }

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', interesse: '', valor: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { void carregar() }, [])

  async function carregar() {
    setLoading(true)
    const token = await getToken()
    const res = await fetch('/api/hub/leads', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (res.ok) { const { leads } = await res.json(); setLeads(leads ?? []) }
    setLoading(false)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const token = await getToken()
    await fetch('/api/hub/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ nome: form.nome, email: form.email || null, telefone: form.telefone || null, interesse: form.interesse || null, valor: Number(form.valor) || 0, origem: 'manual' }),
    })
    setForm({ nome: '', email: '', telefone: '', interesse: '', valor: '' }); setShowForm(false); setSaving(false); void carregar()
  }

  async function mover(id: string, status: string) {
    const token = await getToken()
    setLeads(ls => ls.map(l => l.id === id ? { ...l, status } : l))
    await fetch('/api/hub/leads', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ id, status }) })
  }
  async function excluir(id: string) {
    const token = await getToken()
    setLeads(ls => ls.filter(l => l.id !== id)); setSel(null)
    await fetch('/api/hub/leads', { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ id }) })
  }

  const total = leads.length
  const fechados = leads.filter(l => l.status === 'fechado').length
  const valorPipe = leads.filter(l => !['fechado', 'perdido'].includes(l.status)).reduce((s, l) => s + Number(l.valor || 0), 0)
  const valorFechado = leads.filter(l => l.status === 'fechado').reduce((s, l) => s + Number(l.valor || 0), 0)
  const fmt = (v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v.toFixed(0)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <PageHeader
        title="CRM de Leads"
        subtitle={`Funil de vendas — ${total} leads · ${fechados} fechados`}
        action={<button className="btn btn-primary" onClick={() => setShowForm(v => !v)}><i className="fa-solid fa-plus" style={{ fontSize: 11 }} />Novo Lead</button>}
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[
          { l: 'Total de leads', v: total, c: '#3ecf8e' },
          { l: 'Em negociação', v: fmt(valorPipe), c: '#f59e0b' },
          { l: 'Fechados', v: fechados, c: '#22c55e' },
          { l: 'Receita fechada', v: fmt(valorFechado), c: '#3ecf8e' },
        ].map(k => (
          <div key={k.l} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.c, fontVariantNumeric: 'tabular-nums' }}>{k.v}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <form onSubmit={salvar} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 12 }}>
                <input required placeholder="Nome *" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inp} />
                <input placeholder="Telefone / WhatsApp" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} style={inp} />
                <input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} />
                <input placeholder="Valor estimado (R$)" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} style={inp} />
                <input placeholder="Interesse (ex: apê na Savassi)" value={form.interesse} onChange={e => setForm(f => ({ ...f, interesse: e.target.value }))} style={{ ...inp, gridColumn: '1 / -1' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Adicionar Lead'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>
      ) : total === 0 && !showForm ? (
        <div className="card" style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-user-plus" style={{ fontSize: 26, opacity: 0.3, display: 'block', marginBottom: 12 }} />
          <div style={{ fontSize: 13, marginBottom: 14 }}>Nenhum lead ainda. Adicione manualmente ou conecte o Atendimento 24/7.</div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>Adicionar primeiro lead</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, alignItems: 'start', flex: 1, overflow: 'hidden' }}>
          {COLS.map(col => {
            const items = leads.filter(l => l.status === col.id)
            return (
              <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: 7, minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 2px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{col.label}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)', marginLeft: 'auto' }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
                  {items.map(l => {
                    const open = sel === l.id
                    return (
                      <motion.div key={l.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setSel(open ? null : l.id)}
                        style={{ background: 'var(--surface)', border: `1px solid ${open ? col.color + '60' : 'var(--border)'}`, borderRadius: 8, padding: '9px 10px', cursor: 'pointer' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{l.nome}</div>
                        {l.interesse && <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.interesse}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {Number(l.valor) > 0 && <span style={{ fontSize: 9, color: col.color, fontWeight: 700 }}>{fmt(Number(l.valor))}</span>}
                          <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'var(--surface-2)', color: 'var(--text-dim)', marginLeft: 'auto' }}>{l.origem}</span>
                        </div>
                        <AnimatePresence>
                          {open && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                              {l.telefone && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}><i className="fa-solid fa-phone" style={{ fontSize: 8, marginRight: 5 }} />{l.telefone}</div>}
                              {l.email && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}><i className="fa-solid fa-envelope" style={{ fontSize: 8, marginRight: 5 }} />{l.email}</div>}
                              <div style={{ fontSize: 8, color: 'var(--text-dim)', marginBottom: 5 }}>Mover para:</div>
                              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6 }}>
                                {COLS.filter(c => c.id !== l.status).map(c => (
                                  <button key={c.id} onClick={() => void mover(l.id, c.id)} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, background: `${c.color}15`, color: c.color, border: `1px solid ${c.color}30`, cursor: 'pointer', fontFamily: 'inherit' }}>{c.label}</button>
                                ))}
                              </div>
                              <button onClick={() => void excluir(l.id)} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, background: 'rgba(244,68,68,.08)', color: '#f44', border: '1px solid rgba(244,68,68,.2)', cursor: 'pointer', fontFamily: 'inherit' }}><i className="fa-solid fa-trash" style={{ fontSize: 8 }} /></button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                  {items.length === 0 && <div style={{ fontSize: 9, color: 'var(--text-dim)', textAlign: 'center', padding: '10px 0', border: '1px dashed var(--border)', borderRadius: 7 }}>—</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const inp: React.CSSProperties = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }
