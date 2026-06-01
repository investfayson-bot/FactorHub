'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { AGENTS_V2 } from '@/lib/agents-v2'
import PageHeader from '@/components/layout/PageHeader'

type Ideia = { id: string; titulo: string; descricao: string | null; status: string; created_at: string }

async function getToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}

export default function IdeiasPage() {
  const [texto, setTexto] = useState('')
  const [itens, setItens] = useState<Ideia[]>([])
  const [empresaId, setEmpresaId] = useState('')
  const [analisando, setAnalisando] = useState(false)
  const [agenteAtivo, setAgenteAtivo] = useState<string | null>(null)
  const [output, setOutput] = useState('')
  const [resumo, setResumo] = useState('')
  const outRef = useRef<HTMLDivElement>(null)
  const autoScroll = useRef(true)

  useEffect(() => { void carregar() }, [])

  // Auto-scroll enquanto chega texto (para se rolar pra cima)
  useEffect(() => {
    if (autoScroll.current && outRef.current) {
      outRef.current.scrollTop = outRef.current.scrollHeight
    }
  }, [output, resumo])

  function onScroll() {
    const el = outRef.current
    if (!el) return
    autoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50
  }

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const eid = u?.empresa_id ?? user.id
    setEmpresaId(eid)
    const { data } = await supabase.from('hub_ideias').select('*').eq('empresa_id', eid).order('created_at', { ascending: false })
    setItens((data ?? []) as Ideia[])
  }

  async function analisar() {
    const t = texto.trim()
    if (!t || analisando) return
    setAnalisando(true)
    setOutput('')
    setResumo('')
    setAgenteAtivo(null)
    autoScroll.current = true

    // salva a ideia
    if (empresaId) {
      await supabase.from('hub_ideias').insert({
        titulo: t.slice(0, 80), descricao: t, origem: 'manual', tipo: 'feature', status: 'nova', empresa_id: empresaId,
      })
      void carregar()
    }

    try {
      const token = await getToken()
      const res = await fetch('/api/hub/mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ mission: t, level: 'N2' }),
      })
      if (!res.ok || !res.body) throw new Error(`Erro ${res.status}`)

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let cur = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            const evt = JSON.parse(raw) as Record<string, unknown>
            if (evt.event === 'agent_start') {
              const a = AGENTS_V2[evt.agentId as string]
              setAgenteAtivo(a?.name ?? (evt.agentId as string))
              cur = ''
              setOutput(o => o + `\n\n=== ${a?.name ?? evt.agentId} ===\n`)
            }
            if (evt.event === 'token') { cur += evt.token as string; setOutput(o => o + (evt.token as string)) }
            if (evt.event === 'mission_done') { setResumo(evt.summary as string); setAgenteAtivo(null) }
            if (evt.event === 'error') throw new Error(evt.message as string)
          } catch { /* skip */ }
        }
      }
    } catch (e) {
      setOutput(o => o + `\n\n[Erro: ${e instanceof Error ? e.message : 'falha'}]`)
    }
    setAnalisando(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 820 }}>
      <PageHeader
        title="Ideias"
        subtitle="Escreva uma ideia e deixe os agentes analisarem automaticamente"
      />

      {/* Campo livre */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Descreva sua ideia livremente… Ex: criar uma ferramenta de CRM para a VN Prime que qualifica leads automaticamente."
          style={{ width: '100%', minHeight: 130, resize: 'vertical', background: 'transparent', border: 'none', padding: '16px 18px', fontSize: 14, color: 'var(--text)', fontFamily: 'inherit', outline: 'none', lineHeight: 1.7, boxSizing: 'border-box' }}
        />
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => void analisar()} disabled={!texto.trim() || analisando}
            style={{ padding: '10px 20px', borderRadius: 8, background: texto.trim() && !analisando ? 'var(--accent)' : 'var(--surface-3)', color: texto.trim() && !analisando ? '#0a0a0a' : 'var(--text-dim)', border: 'none', cursor: texto.trim() && !analisando ? 'pointer' : 'default', fontSize: 13, fontWeight: 800, fontFamily: 'inherit' }}>
            {analisando
              ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 11, marginRight: 6 }} />Analisando...</>
              : <><i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 11, marginRight: 6 }} />Analisar Ideia</>}
          </button>
        </div>
      </div>

      {/* Output em tempo real */}
      <AnimatePresence>
        {(analisando || output || resumo) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
              {analisando && <motion.div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />}
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Análise dos Agentes</span>
              {agenteAtivo && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>· {agenteAtivo} escrevendo...</span>}
            </div>
            {/* streaming */}
            {output && (
              <div ref={outRef} onScroll={onScroll} style={{ maxHeight: 280, overflowY: 'auto', padding: '14px 16px', fontFamily: 'monospace', fontSize: 11.5, lineHeight: 1.7, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {output}
                {analisando && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} style={{ display: 'inline-block', width: 2, height: 12, background: 'var(--accent)', marginLeft: 2, verticalAlign: 'text-bottom' }} />}
              </div>
            )}
            {/* resumo final do Chief of Staff */}
            {resumo && (
              <div style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--accent-dim)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Síntese Executiva</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{resumo}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ideias anteriores */}
      {itens.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Ideias anteriores · {itens.length}</div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {itens.map(i => (
              <div key={i.id} style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setTexto(i.descricao ?? i.titulo)}>
                <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.titulo}</div>
                <div style={{ fontSize: 9.5, color: 'var(--text-dim)', marginTop: 2 }}>{new Date(i.created_at).toLocaleDateString('pt-BR')} · clique para reusar</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
