'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { AGENTES, type Agente } from '@/lib/hub-agentes'

const ICONS: Record<string, string> = {
  ceo: 'fa-chess-king',
  pm: 'fa-diagram-project',
  cmo: 'fa-rocket',
  copywriter: 'fa-pen-fancy',
  analista: 'fa-chart-mixed',
  dev: 'fa-code',
  conteudo: 'fa-clapperboard',
  chief: 'fa-sitemap',
}

const DEPT: Record<string, string> = {
  ceo: 'Estratégia',
  pm: 'Produto',
  cmo: 'Growth',
  copywriter: 'Copy & Funis',
  analista: 'Inteligência',
  dev: 'Tecnologia',
  conteudo: 'Conteúdo',
  chief: 'Operações',
}

const ACTIVITIES: Record<string, string[]> = {
  ceo: ['Analisando portfólio', 'Validando oportunidade', 'Decisão tomada ✓', 'Avaliando risco'],
  pm: ['Atualizando roadmap', 'Priorizando backlog', 'Sprint planejado ✓', 'Review de OKRs'],
  cmo: ['Criando funil de vendas', 'Analisando CAC', 'Campanha no ar', 'Segmentando público'],
  copywriter: ['Escrevendo headline', 'Testando copy', 'Email finalizado ✓', 'Hook criado ✓'],
  analista: ['Calculando TAM/SAM', 'Análise de mercado', 'Relatório pronto ✓', 'SWOT em andamento'],
  dev: ['Revisando pull request', 'Deploy em andamento', 'Bug corrigido ✓', 'Arquitetura ok ✓'],
  conteudo: ['Roteiro de Reels', 'Carrossel criado ✓', 'Post programado', 'Script gravado ✓'],
  chief: ['Coordenando equipe', 'Briefing enviado ✓', 'Prioridades definidas', 'Status sincronizado ✓'],
}

function AgentCard({ agente, index }: { agente: Agente; index: number }) {
  const acts = ACTIVITIES[agente.id] ?? ['Trabalhando...']
  const [actIdx, setActIdx] = useState(() => Math.floor(Math.random() * acts.length))

  useEffect(() => {
    const interval = 3500 + index * 200
    const id = setInterval(() => {
      setActIdx(prev => (prev + 1) % acts.length)
    }, interval)
    return () => clearInterval(id)
  }, [acts.length, index])

  const cor = agente.cor

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.07, duration: 0.4, ease: 'easeOut' }}
      style={{
        padding: 14,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        border: `0.5px solid ${cor}28`,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Corner glow */}
      <div style={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 70,
        height: 70,
        background: `radial-gradient(circle, ${cor}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <i
          className={`fa-solid ${ICONS[agente.id] ?? 'fa-circle'}`}
          style={{ fontSize: 9, color: cor, opacity: 0.85 }}
        />
        <span style={{
          fontSize: 8.5,
          fontWeight: 700,
          color: cor,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          opacity: 0.9,
          flex: 1,
        }}>
          {DEPT[agente.id] ?? agente.id}
        </span>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#22C55E',
            boxShadow: '0 0 4px #22C55E88',
            flexShrink: 0,
          }}
        />
      </div>

      {/* Avatar + name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${cor}, ${cor}88)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 800,
          color: '#fff',
          flexShrink: 0,
          boxShadow: `0 4px 12px ${cor}30`,
        }}>
          {agente.inicial}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.88)', lineHeight: 1.2 }}>
            {agente.nome}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            IA Ativa
          </div>
        </div>
      </div>

      {/* Task chip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={actIdx}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 8px',
            borderRadius: 20,
            background: `${cor}12`,
            border: `0.5px solid ${cor}30`,
            maxWidth: '100%',
          }}
        >
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: cor,
              flexShrink: 0,
            }}
          />
          <span style={{
            fontSize: 9,
            color: cor,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {acts[actIdx]}
          </span>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

const STATS = [
  { label: '847 tarefas', sub: 'concluídas' },
  { label: '$12.40', sub: 'USD / run' },
  { label: '32 projetos', sub: 'ativos' },
]

export default function AuthPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [modo, setModo] = useState<'login' | 'cadastro'>('login')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')

  const submit = useCallback(async (e: React.FormEvent) => {
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
  }, [modo, email, senha, router])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0d0d0d' }}>

      {/* Left panel */}
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
          background: '#080810',
          borderRight: '0.5px solid #1a1a28',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: [
            'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
          ].join(','),
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }} />

        {/* Orb orange top-left */}
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: -120,
            left: -80,
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(232,98,42,0.14) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        {/* Orb purple bottom-right */}
        <motion.div
          animate={{ x: [0, -18, 0], y: [0, 12, 0] }}
          transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut', delay: 2 }}
          style={{
            position: 'absolute',
            bottom: -100,
            right: -100,
            width: 380,
            height: 380,
            background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        {/* Scanline overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
          pointerEvents: 'none',
          zIndex: 2,
        }} />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          style={{ marginBottom: 8, position: 'relative', zIndex: 3 }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f0f0f0', letterSpacing: -0.5, marginBottom: 4 }}>
            Factor<span style={{ color: '#e8622a' }}>Hub</span>
          </div>
          <div style={{ fontSize: 10.5, color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Agentes de IA + Operação
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          style={{ marginBottom: 20, position: 'relative', zIndex: 3 }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.02em' }}>
            8 Agentes de IA operando em tempo real
          </div>
        </motion.div>

        {/* Agent cards grid */}
        <div style={{ position: 'relative', zIndex: 3 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {AGENTES.map((a, i) => (
              <AgentCard key={a.id} agente={a} index={i} />
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          style={{
            marginTop: 22,
            position: 'relative',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            background: 'rgba(255,255,255,0.025)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {STATS.map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRight: i < STATS.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', fontFamily: "'DM Mono', monospace" }}>
                {s.label}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>
                {s.sub}
              </div>
            </div>
          ))}
          <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 5px #22C55E88' }}
            />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' }}>LIVE</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Right panel — form */}
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
            {modo === 'login' ? 'Entre na sua conta para continuar' : 'Comece gratis, sem cartão de crédito'}
          </div>
        </div>

        {/* Tab toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--surface)',
          borderRadius: 9,
          padding: 3,
          marginBottom: 28,
          border: '0.5px solid var(--border)',
        }}>
          {(['login', 'cadastro'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setModo(m); setErro(''); setMsg('') }}
              style={{
                flex: 1,
                padding: '8px 0',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                borderRadius: 7,
                background: modo === m ? '#e8622a' : 'transparent',
                color: modo === m ? '#fff' : 'var(--text-muted)',
                transition: 'all .18s',
                fontFamily: 'inherit',
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
              className="form-input"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              autoComplete="email"
            />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label className="form-label">Senha</label>
            <input
              className="form-input"
              type="password"
              required
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          <AnimatePresence>
            {erro && (
              <motion.div
                key="erro"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                style={{
                  background: 'rgba(239,68,68,.08)',
                  color: '#EF4444',
                  fontSize: 12,
                  padding: '10px 14px',
                  borderRadius: 8,
                  marginBottom: 16,
                  border: '1px solid rgba(239,68,68,.2)',
                }}
              >
                {erro}
              </motion.div>
            )}
            {msg && (
              <motion.div
                key="msg"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                style={{
                  background: 'rgba(34,197,94,.08)',
                  color: '#22C55E',
                  fontSize: 12,
                  padding: '10px 14px',
                  borderRadius: 8,
                  marginBottom: 16,
                  border: '1px solid rgba(34,197,94,.2)',
                }}
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
