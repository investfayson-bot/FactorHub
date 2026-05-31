'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { PixelAgent, PixelMonitor } from '@/components/ui/pixel-agent'
import { AGENTES } from '@/lib/hub-agentes'

const DEPT: Record<string, string> = {
  ceo: 'Estratégia', pm: 'Produto', cmo: 'Growth', copywriter: 'Copy',
  analista: 'Análise', dev: 'Dev / CTO', conteudo: 'Conteúdo', chief: 'Operações',
}

function Workstation({ agente, index }: { agente: (typeof AGENTES)[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 + index * 0.08, duration: 0.45, ease: 'easeOut' }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        padding: '10px 6px 8px',
        borderRadius: 6,
        background: `${agente.cor}0c`,
        border: `0.5px solid ${agente.cor}28`,
        position: 'relative',
        boxShadow: `0 0 22px ${agente.cor}10, inset 0 0 16px ${agente.cor}06`,
      }}
    >
      {/* Dept label */}
      <div style={{
        fontSize: 6.5, fontWeight: 700, color: agente.cor,
        letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3,
        opacity: 0.9,
      }}>
        {DEPT[agente.id] ?? agente.id}
      </div>

      {/* Monitor */}
      <PixelMonitor color={agente.cor} scale={2} />

      {/* Desk surface */}
      <div style={{
        width: 32, height: 3,
        background: `linear-gradient(90deg, #1a1a1a, #252520, #1a1a1a)`,
        border: '0.5px solid #2a2a20',
        borderRadius: 1,
        margin: '1px 0',
      }} />

      {/* Agent seated */}
      <PixelAgent agentColor={agente.cor} scale={2} animate={false} seated />

      {/* Initial tag */}
      <div style={{
        fontSize: 6, fontWeight: 800, color: agente.cor,
        marginTop: 2, letterSpacing: '0.04em', opacity: 0.8,
        fontFamily: "'DM Mono', monospace",
      }}>
        {agente.inicial}
      </div>
    </motion.div>
  )
}

export default function AuthPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [modo, setModo] = useState<'login' | 'cadastro'>('login')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErro(''); setMsg(''); setLoading(true)
    try {
      if (modo === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
        if (error) { setErro(error.message); return }
        router.push('/dashboard')
      } else {
        const { error } = await supabase.auth.signUp({ email, password: senha })
        if (error) { setErro(error.message); return }
        setMsg('Verifique seu e-mail para confirmar a conta.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0d0d0d' }}>

      {/* Left — pixel art office */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 40px',
          background: '#080808',
          borderRight: '0.5px solid #1f1f1f',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Scanlines */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.22) 2px, rgba(0,0,0,0.22) 3px)',
          pointerEvents: 'none', zIndex: 2,
        }} />

        {/* Orange ambient glow top */}
        <div style={{
          position: 'absolute', top: -150, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 450,
          background: 'radial-gradient(ellipse, rgba(232,98,42,0.11) 0%, transparent 62%)',
          pointerEvents: 'none',
        }} />

        {/* Bottom fade */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
          background: 'linear-gradient(transparent, #080808)',
          pointerEvents: 'none', zIndex: 1,
        }} />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          style={{ marginBottom: 28, position: 'relative', zIndex: 3 }}
        >
          <div style={{ fontSize: 21, fontWeight: 800, color: '#f0f0f0', letterSpacing: -0.5, marginBottom: 3 }}>
            Factor<span style={{ color: '#e8622a' }}>Hub</span>
          </div>
          <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Agentes de IA + Operação
          </div>
        </motion.div>

        {/* Scene label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          style={{ fontSize: 8, color: '#3a3a3a', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14, position: 'relative', zIndex: 3 }}
        >
          — Escritório ao vivo —
        </motion.div>

        {/* 2×4 Workstation grid */}
        <div style={{ position: 'relative', zIndex: 3 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {AGENTES.map((a, i) => <Workstation key={a.id} agente={a} index={i} />)}
          </div>
        </div>

        {/* Status bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          style={{
            marginTop: 24, position: 'relative', zIndex: 3,
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <motion.div
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            style={{ width: 5, height: 5, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }}
          />
          <span style={{ fontSize: 9.5, color: '#3a3a3a', letterSpacing: '0.07em' }}>
            8 agentes ativos · FactorHub OS v2 · online
          </span>
        </motion.div>
      </motion.div>

      {/* Right — form */}
      <motion.div
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: 440,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 48px',
          flexShrink: 0,
          background: '#0d0d0d',
        }}
      >
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            {modo === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {modo === 'login' ? 'Entre na sua conta para continuar' : 'Comece gratis, sem cartao de credito'}
          </div>
        </div>

        {/* Tab toggle */}
        <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 9, padding: 3, marginBottom: 28, border: '0.5px solid var(--border)' }}>
          {(['login', 'cadastro'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setModo(m); setErro(''); setMsg('') }}
              style={{
                flex: 1, padding: '8px 0', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                border: 'none', borderRadius: 7,
                background: modo === m ? '#e8622a' : 'transparent',
                color: modo === m ? '#fff' : 'var(--text-muted)',
                transition: 'all .18s', fontFamily: 'inherit',
              }}
            >
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { void submit(e) }}>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">E-mail</label>
            <input
              className="form-input" type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="voce@empresa.com" autoComplete="email"
            />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label className="form-label">Senha</label>
            <input
              className="form-input" type="password" required
              value={senha} onChange={e => setSenha(e.target.value)}
              placeholder="••••••••" minLength={6}
              autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          <AnimatePresence>
            {erro && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                style={{ background: 'rgba(239,68,68,.08)', color: '#EF4444', fontSize: 12, padding: '10px 14px', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(239,68,68,.2)' }}
              >
                {erro}
              </motion.div>
            )}
            {msg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                style={{ background: 'rgba(34,197,94,.08)', color: '#22C55E', fontSize: 12, padding: '10px 14px', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(34,197,94,.2)' }}
              >
                {msg}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            whileHover={!loading ? { opacity: 0.9 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 13 }}
          >
            {loading ? (
              <>
                <motion.i
                  className="fa-solid fa-circle-notch"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  style={{ fontSize: 12 }}
                />
                Aguarde...
              </>
            ) : (
              modo === 'login' ? 'Entrar no Hub' : 'Criar conta gratis'
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
