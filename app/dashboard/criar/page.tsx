'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/layout/PageHeader'

async function getToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}

// remove cercas de markdown se o modelo escorregar
function cleanHtml(s: string) {
  let t = s.trim()
  t = t.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '')
  const start = t.indexOf('<!DOCTYPE')
  if (start > 0) t = t.slice(start)
  return t
}

type Build = { prompt: string; html: string }

export default function CriarPage() {
  const [prompt, setPrompt] = useState('')
  const [building, setBuilding] = useState(false)
  const [html, setHtml] = useState('')
  const [history, setHistory] = useState<Build[]>([])
  const [view, setView] = useState<'preview' | 'code'>('preview')
  const codeRef = useRef<HTMLDivElement>(null)

  // autoscroll do código enquanto gera
  useEffect(() => {
    if (building && view === 'code' && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight
    }
  }, [html, building, view])

  async function build() {
    const p = prompt.trim()
    if (!p || building) return
    setBuilding(true)
    setHtml('')
    setView('code') // mostra o código sendo escrito ao vivo
    try {
      const token = await getToken()
      const res = await fetch('/api/hub/build-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ prompt: p }),
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
          try {
            const tok = JSON.parse(raw).token as string
            if (tok) { full += tok; setHtml(full) }
          } catch { /* skip */ }
        }
      }
      const finalHtml = cleanHtml(full)
      setHtml(finalHtml)
      setHistory(h => [{ prompt: p, html: finalHtml }, ...h].slice(0, 10))
      setView('preview') // ao terminar, mostra renderizado
    } catch (e) {
      setHtml(`<html><body style="background:#0a0a0a;color:#f44;font-family:monospace;padding:20px">Erro: ${e instanceof Error ? e.message : 'falha'}</body></html>`)
      setView('preview')
    }
    setBuilding(false)
  }

  function download() {
    const blob = new Blob([cleanHtml(html)], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ferramenta-${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  function openNewTab() {
    const w = window.open('', '_blank')
    if (w) { w.document.write(cleanHtml(html)); w.document.close() }
  }

  const SUGESTOES = [
    'Calculadora de comissão imobiliária com 3 planos (VN Prime)',
    'Dashboard de leads com gráfico de funil de conversão',
    'Gerador de proposta comercial em PDF',
    'Simulador de financiamento SAC vs PRICE',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: 'calc(100vh - 90px)' }}>
      <PageHeader
        title="Criar Ferramenta"
        subtitle="Descreva a ferramenta e o agente constrói — preview ao lado, igual Claude Code"
        action={
          html ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={openNewTab} className="btn btn-ghost" style={{ fontSize: 11 }}><i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 10 }} />Abrir</button>
              <button onClick={download} className="btn btn-primary" style={{ fontSize: 11 }}><i className="fa-solid fa-download" style={{ fontSize: 10 }} />Baixar HTML</button>
            </div>
          ) : undefined
        }
      />

      {/* Split: input à esquerda, preview à direita */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 12, flex: 1, minHeight: 0 }}>

        {/* LEFT — input + sugestões + histórico */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void build() } }}
              placeholder="Ex: uma calculadora de ITBI para imóveis de BH com simulação de financiamento e botão de exportar PDF"
              style={{ width: '100%', minHeight: 120, resize: 'vertical', background: 'transparent', border: 'none', padding: '14px', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
            />
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => void build()} disabled={!prompt.trim() || building}
                style={{ width: '100%', padding: '11px', borderRadius: 8, background: prompt.trim() && !building ? 'var(--accent)' : 'var(--surface-3)', color: prompt.trim() && !building ? '#0a0a0a' : 'var(--text-dim)', border: 'none', cursor: prompt.trim() && !building ? 'pointer' : 'default', fontSize: 13, fontWeight: 800, fontFamily: 'inherit' }}>
                {building
                  ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 11, marginRight: 6 }} />Construindo...</>
                  : <><i className="fa-solid fa-bolt" style={{ fontSize: 11, marginRight: 6 }} />Executar</>}
              </button>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 6, textAlign: 'center' }}>Ctrl/⌘+Enter para executar</div>
            </div>
          </div>

          {/* Sugestões */}
          {!html && !building && (
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Exemplos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {SUGESTOES.map(s => (
                  <button key={s} onClick={() => setPrompt(s)} style={{ textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Histórico */}
          {history.length > 0 && (
            <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Ferramentas criadas</div>
              <div style={{ overflowY: 'auto' }}>
                {history.map((b, i) => (
                  <button key={i} onClick={() => { setHtml(b.html); setView('preview') }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — preview / code */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setView('preview')} style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: `1px solid ${view === 'preview' ? 'var(--accent)' : 'var(--border)'}`, background: view === 'preview' ? 'var(--accent-dim)' : 'transparent', color: view === 'preview' ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>Preview</button>
              <button onClick={() => setView('code')} style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: `1px solid ${view === 'code' ? 'var(--accent)' : 'var(--border)'}`, background: view === 'code' ? 'var(--accent-dim)' : 'transparent', color: view === 'code' ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>Código</button>
            </div>
            {building && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}><motion.div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />gerando...</span>}
          </div>

          <div style={{ flex: 1, minHeight: 0, background: '#0a0a0a' }}>
            {!html && !building ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', gap: 10 }}>
                <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 32, opacity: 0.3 }} />
                <div style={{ fontSize: 13 }}>A ferramenta vai aparecer aqui</div>
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
    </div>
  )
}
