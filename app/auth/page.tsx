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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -.5 }}>
            Factor<span style={{ color: 'var(--teal)' }}>Hub</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 6 }}>Hub de Operações & Agentes IA</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 28 }}>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--gray-100)', marginBottom: 22 }}>
            {(['login', 'cadastro'] as const).map((m) => (
              <button key={m} onClick={() => { setModo(m); setErro(''); setMsg('') }} style={{ flex: 1, padding: '8px 0', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: 'none', background: modo === m ? 'var(--teal)' : '#fff', color: modo === m ? '#fff' : 'var(--gray-400)', transition: 'all .15s' }}>
                {m === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          <form onSubmit={void submit as unknown as React.FormEventHandler} onSubmitCapture={(e) => { e.preventDefault(); void submit(e) }}>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com.br" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="form-label">Senha</label>
              <input className="form-input" type="password" required value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" minLength={6} />
            </div>
            {erro && <div style={{ background: '#FEF2F2', color: '#EF4444', fontSize: 12, padding: '8px 12px', borderRadius: 8, marginBottom: 14, border: '1px solid #FECACA' }}>{erro}</div>}
            {msg && <div style={{ background: '#F0FDF4', color: '#16A34A', fontSize: 12, padding: '8px 12px', borderRadius: 8, marginBottom: 14, border: '1px solid #BBF7D0' }}>{msg}</div>}
            <button className="btn-action" type="submit" disabled={loading} style={{ width: '100%', opacity: loading ? .7 : 1 }}>
              {loading ? 'Aguarde…' : modo === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
