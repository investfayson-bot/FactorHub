'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function Form() {
  const params = useSearchParams()
  const eventoId = params.get('e') ?? ''
  const empresaId = params.get('c') ?? ''
  const [form, setForm] = useState({ nome: '', email: '', telefone: '' })
  const [done, setDone] = useState(false)
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setSending(true); setErr('')
    try {
      const res = await fetch('/api/eventos-inscricao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventoId, empresaId, ...form }),
      })
      if (res.ok) setDone(true)
      else setErr('Não foi possível inscrever. Tente novamente.')
    } catch { setErr('Erro de conexão.') }
    setSending(false)
  }

  if (!eventoId || !empresaId) return <div style={{ color: '#888' }}>Link inválido.</div>

  if (done) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(62,207,142,.15)', border: '2px solid #3ecf8e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <span style={{ fontSize: 24, color: '#3ecf8e' }}>✓</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#ededed', marginBottom: 6 }}>Inscrição confirmada!</div>
      <div style={{ fontSize: 13, color: '#888' }}>Você receberá os detalhes do evento. Até lá!</div>
    </div>
  )

  return (
    <form onSubmit={enviar} style={{ width: '100%' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#ededed', marginBottom: 4 }}>Inscreva-se no evento</div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Preencha seus dados para garantir sua vaga.</div>
      <input required placeholder="Seu nome *" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inp} />
      <input placeholder="WhatsApp" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} style={inp} />
      <input type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} />
      {err && <div style={{ fontSize: 12, color: '#f44', marginBottom: 10 }}>{err}</div>}
      <button type="submit" disabled={sending || !form.nome} style={{ width: '100%', padding: 13, borderRadius: 10, background: sending || !form.nome ? '#2e2e2e' : '#3ecf8e', color: sending || !form.nome ? '#666' : '#0a0a0a', border: 'none', cursor: sending || !form.nome ? 'default' : 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'inherit' }}>
        {sending ? 'Enviando...' : 'Confirmar inscrição'}
      </button>
    </form>
  )
}

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', marginBottom: 10, background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#ededed', fontFamily: 'inherit', outline: 'none' }

export default function InscreverPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#181818', border: '1px solid #2e2e2e', borderRadius: 16, padding: 28 }}>
        <Suspense fallback={<div style={{ color: '#888' }}>Carregando...</div>}>
          <Form />
        </Suspense>
      </div>
    </div>
  )
}
