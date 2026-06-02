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
  const [fu, setFu] = useState<Lead | null>(null)
  const [fuAssunto, setFuAssunto] = useState('')
  const [fuMsg, setFuMsg] = useState('')
  const [fuBusy, setFuBusy] = useState('')

  useEffect(() => { void carregar() }, [])

  function abrirFollowup(l: Lead) { setFu(l); setFuAssunto(''); setFuMsg(''); setFuBusy('') }

  async function gerarFU() {
    if (!fu) return
    setFuBusy('Gerando...')
    const token = await getToken()
    const res = await fetch('/api/hub/followup', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ acao: 'draft', lead: { nome: fu.nome, interesse: fu.interesse } }) })
    if (res.ok) { const j = await res.json(); setFuAssunto(j.assunto ?? ''); setFuMsg(j.mensagem ?? '') }
    setFuBusy('')
  }
  async function enviarFU() {
    if (!fu?.email || !fuAssunto || !fuMsg) return
    setFuBusy('Enviando...')
    const token = await getToken()
    const res = await fetch('/api/hub/followup', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ to: fu.email, assunto: fuAssunto, mensagem: fuMsg }) })
    const j = await res.json().catch(() => ({}))
    if (res.ok) { setFuBusy('Enviado ✓'); setTimeout(() => setFu(null), 1500) }
    else setFuBusy('Erro: ' + (j.error || 'falha'))
  }

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
                              <div style={{ display: 'flex', gap: 5 }}>
                                {l.email && <button onClick={() => abrirFollowup(l)} style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}><i className="fa-solid fa-paper-plane" style={{ fontSize: 8, marginRight: 4 }} />Follow-up</button>}
                                <button onClick={() => void excluir(l.id)} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, background: 'rgba(244,68,68,.08)', color: '#f44', border: '1px solid rgba(244,68,68,.2)', cursor: 'pointer', fontFamily: 'inherit' }}><i className="fa-solid fa-trash" style={{ fontSize: 8 }} /></button>
                              </div>
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

      {/* Follow-up modal */}
      <AnimatePresence>
        {fu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setFu(null) }}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, width: '100%', maxWidth: 520 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Follow-up — {fu.nome}</div>
                <button onClick={() => setFu(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Para: {fu.email}</div>
              <button onClick={() => void gerarFU()} disabled={!!fuBusy} style={{ fontSize: 11, fontWeight: 700, padding: '7px 12px', borderRadius: 7, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12 }}>
                <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 10, marginRight: 5 }} />Gerar com IA
              </button>
              <input value={fuAssunto} onChange={e => setFuAssunto(e.target.value)} placeholder="Assunto" style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 10 }} />
              <textarea value={fuMsg} onChange={e => setFuMsg(e.target.value)} placeholder="Mensagem do email" rows={6} style={{ ...inp, width: '100%', boxSizing: 'border-box', resize: 'vertical', marginBottom: 14, lineHeight: 1.6 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => void enviarFU()} disabled={!fuAssunto || !fuMsg || fuBusy === 'Enviando...'} style={{ padding: '9px 18px', borderRadius: 8, background: fuAssunto && fuMsg ? 'var(--accent)' : 'var(--surface-3)', color: fuAssunto && fuMsg ? '#0a0a0a' : 'var(--text-dim)', border: 'none', cursor: fuAssunto && fuMsg ? 'pointer' : 'default', fontSize: 12, fontWeight: 800, fontFamily: 'inherit' }}>
                  <i className="fa-solid fa-paper-plane" style={{ fontSize: 10, marginRight: 6 }} />Enviar email
                </button>
                {fuBusy && <span style={{ fontSize: 11, color: fuBusy.includes('Erro') ? '#f44' : fuBusy.includes('✓') ? '#3ecf8e' : 'var(--text-muted)', fontWeight: 600 }}>{fuBusy}</span>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const inp: React.CSSProperties = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }
