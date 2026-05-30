'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Left — branding */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 72px',
          background: 'var(--navy)',
          borderRight: '1px solid var(--border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow */}
        <div style={{ position: 'absolute', top: -100, left: -100, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5, marginBottom: 8 }}>
            Factor<span style={{ color: 'var(--teal)' }}>Hub</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Agentes de IA + Operacao</div>
        </div>

        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25, marginBottom: 16 }}>
            Sua operacao<br />com inteligencia artificial
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 360 }}>
            7 agentes especializados trabalhando para voce. Projetos, clientes, conteudo e tarefas — tudo em um lugar.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { icon: 'fa-robot', label: 'CEO, PM, CMO, Dev e mais 3 agentes de IA' },
            { icon: 'fa-diagram-project', label: 'Gestao completa de projetos e clientes' },
            { icon: 'fa-chart-bar', label: 'Rastreamento de custos e uso em tempo real' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(20,184,166,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`fa-solid ${item.icon}`} style={{ fontSize: 13, color: 'var(--teal)' }} />
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Right — form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: 480,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 56px',
          flexShrink: 0,
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
        <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 9, padding: 3, marginBottom: 28, border: '1px solid var(--border)' }}>
          {(['login', 'cadastro'] as const).map(m => (
            <motion.button
              key={m}
              onClick={() => { setModo(m); setErro(''); setMsg('') }}
              whileHover={{ opacity: 0.9 }}
              style={{
                flex: 1, padding: '8px 0', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                border: 'none', borderRadius: 7,
                background: modo === m ? 'var(--teal)' : 'transparent',
                color: modo === m ? '#fff' : 'var(--text-muted)',
                transition: 'all .18s', fontFamily: 'inherit',
              }}
            >
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </motion.button>
          ))}
        </div>

        <form onSubmit={(e) => { void submit(e) }}>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">E-mail</label>
            <input className="form-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com" autoComplete="email" />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label className="form-label">Senha</label>
            <input className="form-input" type="password" required value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" minLength={6} autoComplete={modo === 'login' ? 'current-password' : 'new-password'} />
          </div>

          <AnimatePresence>
            {erro && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                style={{ background: 'rgba(239,68,68,.08)', color: 'var(--red)', fontSize: 12, padding: '10px 14px', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(239,68,68,.2)' }}
              >
                {erro}
              </motion.div>
            )}
            {msg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                style={{ background: 'rgba(34,197,94,.08)', color: 'var(--green)', fontSize: 12, padding: '10px 14px', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(34,197,94,.2)' }}
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
                <motion.i className="fa-solid fa-circle-notch" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} style={{ fontSize: 12 }} />
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
