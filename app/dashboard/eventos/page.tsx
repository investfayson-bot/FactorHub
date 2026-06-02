'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/layout/PageHeader'

type Evento = { id: string; nome: string; descricao: string | null; data_evento: string | null; local: string | null; capacidade: number; status: string; created_at: string }
type Inscricao = { id: string; evento_id: string; nome: string; email: string | null; telefone: string | null; presente: boolean; created_at: string }

const APP_URL = 'https://factor-hub.vercel.app'
async function getToken() { const { data } = await supabase.auth.getSession(); return data.session?.access_token ?? '' }

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([])
  const [empresaId, setEmpresaId] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', descricao: '', data_evento: '', local: '', capacidade: '' })
  const [copied, setCopied] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
      setEmpresaId(u?.empresa_id ?? user.id)
    })
    void carregar()
  }, [])

  async function carregar() {
    setLoading(true)
    const token = await getToken()
    const res = await fetch('/api/hub/eventos', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (res.ok) { const d = await res.json(); setEventos(d.eventos ?? []); setInscricoes(d.inscricoes ?? []) }
    setLoading(false)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    const token = await getToken()
    await fetch('/api/hub/eventos', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ nome: form.nome, descricao: form.descricao, data_evento: form.data_evento || null, local: form.local, capacidade: form.capacidade }) })
    setForm({ nome: '', descricao: '', data_evento: '', local: '', capacidade: '' }); setShowForm(false); void carregar()
  }

  async function togglePresenca(inscricaoId: string, presente: boolean) {
    const token = await getToken()
    setInscricoes(is => is.map(i => i.id === inscricaoId ? { ...i, presente } : i))
    await fetch('/api/hub/eventos', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ inscricaoId, presente }) })
  }

  async function excluir(id: string) {
    const token = await getToken()
    setEventos(es => es.filter(e => e.id !== id)); setSel(null)
    await fetch('/api/hub/eventos', { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ id }) })
  }

  function linkInscricao(ev: Evento) { return `${APP_URL}/inscrever?e=${ev.id}&c=${empresaId}` }
  function copiar(ev: Evento) { navigator.clipboard.writeText(linkInscricao(ev)); setCopied(ev.id); setTimeout(() => setCopied(''), 2000) }

  const inscDe = (eventoId: string) => inscricoes.filter(i => i.evento_id === eventoId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Eventos & Palestras"
        subtitle={`${eventos.length} eventos · ${inscricoes.length} inscritos`}
        action={<button className="btn btn-primary" onClick={() => setShowForm(v => !v)}><i className="fa-solid fa-plus" style={{ fontSize: 11 }} />Novo Evento</button>}
      />

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <form onSubmit={salvar} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 12 }}>
                <input required placeholder="Nome do evento *" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inp} />
                <input type="datetime-local" value={form.data_evento} onChange={e => setForm(f => ({ ...f, data_evento: e.target.value }))} style={inp} />
                <input placeholder="Local" value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} style={inp} />
                <input placeholder="Capacidade" value={form.capacidade} onChange={e => setForm(f => ({ ...f, capacidade: e.target.value }))} style={inp} />
                <textarea placeholder="Descrição" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} style={{ ...inp, gridColumn: '1 / -1', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary">Criar Evento</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>
      ) : eventos.length === 0 && !showForm ? (
        <div className="card" style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-calendar-day" style={{ fontSize: 26, opacity: 0.3, display: 'block', marginBottom: 12 }} />
          <div style={{ fontSize: 13, marginBottom: 14 }}>Nenhum evento ainda.</div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>Criar primeiro evento</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {eventos.map(ev => {
            const ins = inscDe(ev.id)
            const presentes = ins.filter(i => i.presente).length
            const open = sel === ev.id
            return (
              <div key={ev.id} className="card" style={{ overflow: 'hidden' }}>
                <button onClick={() => setSel(open ? null : ev.id)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'inherit' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fa-solid fa-calendar-day" style={{ fontSize: 16, color: 'var(--accent)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{ev.nome}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      {ev.data_evento ? new Date(ev.data_evento).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sem data'}{ev.local ? ` · ${ev.local}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>{ins.length}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)' }}>inscritos{ev.capacidade ? ` / ${ev.capacidade}` : ''}</div>
                  </div>
                  <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 9, color: 'var(--text-dim)' }} />
                </button>

                <AnimatePresence>
                  {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '14px 16px 16px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Link de inscrição:</span>
                          <code style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--surface-2)', padding: '4px 8px', borderRadius: 5, flex: 1, minWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{linkInscricao(ev)}</code>
                          <button onClick={() => copiar(ev)} style={{ fontSize: 10, fontWeight: 700, padding: '5px 11px', borderRadius: 6, background: copied === ev.id ? '#3ecf8e' : 'var(--accent-dim)', color: copied === ev.id ? '#0a0a0a' : 'var(--accent)', border: '1px solid var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}>{copied === ev.id ? 'Copiado!' : 'Copiar'}</button>
                          <button onClick={() => void excluir(ev.id)} style={{ fontSize: 10, padding: '5px 9px', borderRadius: 6, background: 'rgba(244,68,68,.08)', color: '#f44', border: '1px solid rgba(244,68,68,.2)', cursor: 'pointer', fontFamily: 'inherit' }}><i className="fa-solid fa-trash" style={{ fontSize: 9 }} /></button>
                        </div>

                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Lista de presença — {presentes}/{ins.length} presentes</div>
                        {ins.length === 0 ? (
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '12px 0' }}>Nenhum inscrito ainda. Compartilhe o link acima.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {ins.map(i => (
                              <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 7, background: 'var(--surface-2)' }}>
                                <button onClick={() => togglePresenca(i.id, !i.presente)} style={{ width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${i.presente ? '#3ecf8e' : 'var(--border-light)'}`, background: i.presente ? '#3ecf8e' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {i.presente && <i className="fa-solid fa-check" style={{ fontSize: 9, color: '#0a0a0a' }} />}
                                </button>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>{i.nome}</div>
                                  <div style={{ fontSize: 9.5, color: 'var(--text-dim)' }}>{[i.telefone, i.email].filter(Boolean).join(' · ') || '—'}</div>
                                </div>
                                <span style={{ fontSize: 9, color: i.presente ? '#3ecf8e' : 'var(--text-dim)' }}>{i.presente ? 'Presente' : 'Inscrito'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const inp: React.CSSProperties = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }
