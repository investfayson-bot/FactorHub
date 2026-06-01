'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

async function getToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}

function cleanHtml(s: string) {
  let t = s.trim()
  t = t.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '')
  const start = t.indexOf('<!DOCTYPE')
  if (start > 0) t = t.slice(start)
  return t
}

type Msg = { role: 'user' | 'assistant'; content: string }

export default function CriarPage() {
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [html, setHtml] = useState('')
  const [building, setBuilding] = useState(false)
  const [view, setView] = useState<'preview' | 'code'>('preview')
  const codeRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const pf = sessionStorage.getItem('factohub-tool-prefill')
    if (pf) { setInput(pf); sessionStorage.removeItem('factohub-tool-prefill') }
  }, [])

  useEffect(() => {
    if (building && view === 'code' && codeRef.current) codeRef.current.scrollTop = codeRef.current.scrollHeight
  }, [html, building, view])

  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs, building])

  async function send() {
    const text = input.trim()
    if (!text || building) return
    setInput('')
    const newMsgs: Msg[] = [...msgs, { role: 'user', content: text }]
    setMsgs(newMsgs)
    setBuilding(true)
    setHtml('')
    setView('code')

    // contexto: histórico + HTML atual (pra refinar em cima do que já existe)
    const apiMessages: Msg[] = []
    for (const m of msgs) apiMessages.push(m)
    if (html) apiMessages.push({ role: 'assistant', content: cleanHtml(html) })
    apiMessages.push({ role: 'user', content: text })

    try {
      const token = await getToken()
      const res = await fetch('/api/hub/build-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ messages: apiMessages }),
      })
      if (!res.ok || !res.body) throw new Error(`Erro ${res.status}`)
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') continue
          try { const tok = JSON.parse(raw).token as string; if (tok) { full += tok; setHtml(full) } } catch { /* skip */ }
        }
      }
      const finalHtml = cleanHtml(full)
      setHtml(finalHtml)
      setMsgs(m => [...m, { role: 'assistant', content: 'Ferramenta pronta — veja no preview ao lado.' }])
      setView('preview')
    } catch (e) {
      setMsgs(m => [...m, { role: 'assistant', content: `Erro: ${e instanceof Error ? e.message : 'falha'}` }])
    }
    setBuilding(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function download() {
    const blob = new Blob([cleanHtml(html)], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `ferramenta-${Date.now()}.html`; a.click()
    URL.revokeObjectURL(url)
  }
  function openNewTab() {
    const w = window.open('', '_blank'); if (w) { w.document.write(cleanHtml(html)); w.document.close() }
  }
  function novo() { setMsgs([]); setHtml(''); setInput(''); setView('preview') }

  const SUG = [
    'Calculadora de comissão imobiliária com 3 planos para VN Prime',
    'Dashboard de leads com funil de conversão',
    'Gerador de proposta comercial para imprimir em PDF',
    'Landing page para captar leads de imóveis premium',
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 12, height: 'calc(100vh - 86px)' }}>

      {/* LEFT — chat */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 13, color: 'var(--accent)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>FactorHub — Criar</span>
          {msgs.length > 0 && <button onClick={novo} style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontFamily: 'inherit' }}>Novo</button>}
        </div>

        {/* messages */}
        <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {msgs.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, marginBottom: 2 }}>O que você quer criar?</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>Descreva e eu construo. Depois é só pedir ajustes que eu refino — igual conversar com o Claude.</div>
              {SUG.map(s => (
                <button key={s} onClick={() => setInput(s)} style={{ textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px', cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.4 }}>{s}</button>
              ))}
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', gap: 8 }}>
              <div style={{ maxWidth: '88%', padding: '9px 12px', borderRadius: 10, fontSize: 12, lineHeight: 1.55, background: m.role === 'user' ? 'var(--accent)' : 'var(--surface-2)', color: m.role === 'user' ? '#0a0a0a' : 'var(--text)', border: m.role === 'user' ? 'none' : '1px solid var(--border)' }}>
                {m.content}
              </div>
            </div>
          ))}
          {building && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--accent)', fontSize: 11 }}>
              <motion.div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />
              construindo...
            </div>
          )}
        </div>

        {/* input */}
        <div style={{ padding: 12, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
              disabled={building}
              placeholder={msgs.length ? 'Peça um ajuste… (ex: deixa o botão verde)' : 'Descreva a ferramenta…'}
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12.5, fontFamily: 'inherit', resize: 'none', lineHeight: 1.5, maxHeight: 100 }}
            />
            <button onClick={() => void send()} disabled={building || !input.trim()}
              style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: building || !input.trim() ? 'var(--surface-3)' : 'var(--accent)', border: 'none', cursor: building || !input.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-arrow-up" style={{ fontSize: 12, color: building || !input.trim() ? 'var(--text-dim)' : '#0a0a0a' }} />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT — preview */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setView('preview')} style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: `1px solid ${view === 'preview' ? 'var(--accent)' : 'var(--border)'}`, background: view === 'preview' ? 'var(--accent-dim)' : 'transparent', color: view === 'preview' ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>Preview</button>
            <button onClick={() => setView('code')} style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: `1px solid ${view === 'code' ? 'var(--accent)' : 'var(--border)'}`, background: view === 'code' ? 'var(--accent-dim)' : 'transparent', color: view === 'code' ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>Código</button>
          </div>
          {building && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 8 }}>gerando...</span>}
          {html && !building && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button onClick={openNewTab} style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}><i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 9, marginRight: 4 }} />Abrir</button>
              <button onClick={download} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#0a0a0a', cursor: 'pointer', fontFamily: 'inherit' }}><i className="fa-solid fa-download" style={{ fontSize: 9, marginRight: 4 }} />Baixar</button>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minHeight: 0, background: '#0a0a0a' }}>
          {!html && !building ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', gap: 10 }}>
              <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 32, opacity: 0.25 }} />
              <div style={{ fontSize: 13 }}>O resultado aparece aqui</div>
            </div>
          ) : view === 'preview' ? (
            <iframe title="preview" srcDoc={cleanHtml(html)} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups" />
          ) : (
            <div ref={codeRef} style={{ height: '100%', overflowY: 'auto', padding: 14, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6, color: '#9fe7c4', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {html}
              {building && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} style={{ display: 'inline-block', width: 2, height: 12, background: 'var(--accent)', marginLeft: 2 }} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
