'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
    <div className="auth-wrap">
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: -.3 }}>
            Factor<span style={{ color: 'var(--teal)' }}>Hub</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6 }}>Agentes de IA + Operacao</div>
        </div>

        <div className="auth-card">
          <div style={{ display: 'flex', borderRadius: 7, overflow: 'hidden', border: '1px solid var(--border-light)', marginBottom: 22 }}>
            {(['login', 'cadastro'] as const).map(m => (
              <button key={m} onClick={() => { setModo(m); setErro(''); setMsg('') }} style={{ flex: 1, padding: '8px 0', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: 'none', background: modo === m ? 'var(--teal)' : 'transparent', color: modo === m ? '#fff' : 'var(--text-muted)', transition: 'all .15s', fontFamily: 'inherit' }}>
                {m === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => { void submit(e) }}>
            <div style={{ marginBottom: 12 }}>
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com.br" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="form-label">Senha</label>
              <input className="form-input" type="password" required value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" minLength={6} />
            </div>
            {erro && <div style={{ background: 'rgba(239,68,68,.1)', color: 'var(--red)', fontSize: 12, padding: '9px 12px', borderRadius: 7, marginBottom: 14, border: '1px solid rgba(239,68,68,.2)' }}>{erro}</div>}
            {msg && <div style={{ background: 'rgba(34,197,94,.1)', color: 'var(--green)', fontSize: 12, padding: '9px 12px', borderRadius: 7, marginBottom: 14, border: '1px solid rgba(34,197,94,.2)' }}>{msg}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
