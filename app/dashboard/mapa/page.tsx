'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AGENTES, type Agente } from '@/lib/hub-agentes'

// ─── Static data ──────────────────────────────────────────────────

const ICONS: Record<string, string> = {
  ceo: 'fa-chess-king', pm: 'fa-diagram-project', cmo: 'fa-rocket',
  copywriter: 'fa-pen-fancy', analista: 'fa-chart-mixed',
  dev: 'fa-code', conteudo: 'fa-clapperboard', chief: 'fa-sitemap',
}

const DEPT: Record<string, string> = {
  ceo: 'Estratégia', pm: 'Produto', cmo: 'Growth',
  copywriter: 'Copy & Funis', analista: 'Inteligência',
  dev: 'Tecnologia', conteudo: 'Conteúdo', chief: 'Operações',
}

const ACTIVITIES: Record<string, string[]> = {
  ceo:        ['Analisando portfólio', 'Validando oportunidade', 'Decisão tomada ✓', 'Avaliando risco'],
  pm:         ['Atualizando roadmap', 'Priorizando backlog', 'Sprint planejado ✓', 'Review de OKRs'],
  cmo:        ['Criando funil de vendas', 'Analisando CAC', 'Campanha no ar', 'Segmentando público'],
  copywriter: ['Escrevendo headline', 'Testando copy A/B', 'Email finalizado ✓', 'Hook criado ✓'],
  analista:   ['Calculando TAM/SAM', 'Análise de mercado', 'Relatório pronto ✓', 'SWOT em andamento'],
  dev:        ['Revisando pull request', 'Deploy em andamento', 'Bug corrigido ✓', 'Arquitetura ok ✓'],
  conteudo:   ['Roteiro de Reels', 'Carrossel criado ✓', 'Post programado', 'Script gravado ✓'],
  chief:      ['Coordenando equipe', 'Briefing enviado ✓', 'Prioridades definidas', 'Status sincronizado ✓'],
}

// ─── Task chip ────────────────────────────────────────────────────

function TaskChip({ text, cor, meeting }: { text: string; cor: string; meeting?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.22 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 20,
        background: meeting ? `${cor}18` : `${cor}0e`,
        border: `0.5px solid ${cor}${meeting ? '50' : '28'}`,
        maxWidth: '100%',
      }}
    >
      <motion.div
        animate={{ opacity: [1, 0.25, 1] }}
        transition={{ repeat: Infinity, duration: meeting ? 0.9 : 1.6, ease: 'easeInOut' }}
        style={{ width: 5, height: 5, borderRadius: '50%', background: cor, flexShrink: 0 }}
      />
      <span style={{
        fontSize: 9.5, fontWeight: 600, color: meeting ? cor : 'rgba(255,255,255,0.65)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {text}
      </span>
    </motion.div>
  )
}

// ─── Workstation card ─────────────────────────────────────────────

interface CardProps {
  agente: Agente
  index: number
  onMeetingChange: (id: string, inMeeting: boolean) => void
}

function WorkstationCard({ agente, index, onMeetingChange }: CardProps) {
  const acts = ACTIVITIES[agente.id] ?? ['Trabalhando...']
  const [actIdx, setActIdx] = useState(() => Math.floor(Math.random() * acts.length))
  const [inMeeting, setInMeeting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const aliveRef = useRef(true)

  // Stats generated once on mount
  const [stats] = useState(() => ({
    tasks: Math.floor(Math.random() * 14) + 4,
    tokens: (Math.random() * 7 + 1.2).toFixed(1),
  }))

  // Cycle task activities
  useEffect(() => {
    const ms = 3600 + index * 250
    intervalRef.current = setInterval(() => {
      setActIdx(prev => (prev + 1) % acts.length)
    }, ms)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [acts.length, index])

  // Random meeting visits
  useEffect(() => {
    aliveRef.current = true

    function scheduleMeeting() {
      const delay = 10000 + Math.random() * 14000 + index * 800
      timerRef.current = setTimeout(() => {
        if (!aliveRef.current) return
        setInMeeting(true)
        onMeetingChange(agente.id, true)

        const duration = 5000 + Math.random() * 8000
        timerRef.current = setTimeout(() => {
          if (!aliveRef.current) return
          setInMeeting(false)
          onMeetingChange(agente.id, false)
          scheduleMeeting()
        }, duration)
      }, delay)
    }

    scheduleMeeting()
    return () => {
      aliveRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [agente.id, index, onMeetingChange])

  const cor = agente.cor

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -3, boxShadow: `0 12px 40px ${cor}18` }}
      style={{
        borderRadius: 14,
        background: 'var(--surface)',
        border: `0.5px solid ${inMeeting ? cor + '55' : cor + '22'}`,
        overflow: 'hidden',
        position: 'relative',
        transition: 'border-color 0.4s ease',
        cursor: 'default',
      }}
    >
      {/* Corner glow */}
      <motion.div
        animate={{ opacity: inMeeting ? [0.5, 1, 0.5] : [0.2, 0.5, 0.2] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: -30, right: -30, width: 120, height: 120,
          background: `radial-gradient(circle, ${cor}22 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Dept header */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: `0.5px solid ${cor}14`,
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: `${cor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`fa-solid ${ICONS[agente.id] ?? 'fa-circle'}`} style={{ fontSize: 10, color: cor }} />
        </div>
        <span style={{
          fontSize: 9, fontWeight: 700, color: `${cor}cc`,
          textTransform: 'uppercase', letterSpacing: '0.1em', flex: 1,
        }}>
          {DEPT[agente.id]}
        </span>
        <motion.div
          animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: inMeeting ? 1 : 2.5, ease: 'easeInOut' }}
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: inMeeting ? cor : '#22C55E',
            boxShadow: `0 0 6px ${inMeeting ? cor : '#22C55E'}88`,
          }}
        />
      </div>

      {/* Agent body */}
      <div style={{ padding: '14px 14px 12px' }}>

        {/* Avatar + identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `linear-gradient(135deg, ${cor}, ${cor}99)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff',
              boxShadow: `0 4px 20px ${cor}30, inset 0 1px 0 rgba(255,255,255,0.1)`,
            }}>
              {agente.inicial}
            </div>
            {/* Status dot */}
            <div style={{
              position: 'absolute', bottom: -1, right: -1,
              width: 11, height: 11, borderRadius: '50%',
              background: inMeeting ? cor : '#22C55E',
              border: '2px solid var(--surface)',
              transition: 'background 0.3s ease',
            }} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 12.5, fontWeight: 700, color: 'var(--text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2,
            }}>
              {agente.nome}
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {agente.especialidade.split(',')[0]}
            </div>
          </div>
        </div>

        {/* Task section */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 7.5, fontWeight: 700, color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
          }}>
            Tarefa atual
          </div>
          <AnimatePresence mode="wait">
            {inMeeting ? (
              <TaskChip key="meeting" text="Em reunião estratégica" cor={cor} meeting />
            ) : (
              <TaskChip key={actIdx} text={acts[actIdx]} cor={cor} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Stats footer */}
      <div style={{
        padding: '8px 14px 12px',
        borderTop: `0.5px solid ${cor}10`,
        display: 'flex', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontFamily: "'DM Mono', monospace" }}>
            {stats.tasks}
          </div>
          <div style={{ fontSize: 8.5, color: 'var(--text-dim)', marginTop: 1 }}>tarefas hoje</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontFamily: "'DM Mono', monospace" }}>
            {stats.tokens}k
          </div>
          <div style={{ fontSize: 8.5, color: 'var(--text-dim)', marginTop: 1 }}>tokens</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{
          fontSize: 8, fontWeight: 600, color: inMeeting ? cor : '#22C55E',
          display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.3s',
        }}>
          {inMeeting ? 'Em reunião' : 'Online'}
        </div>
      </div>

      {/* Meeting overlay shimmer */}
      <AnimatePresence>
        {inMeeting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(135deg, ${cor}06 0%, transparent 60%)`,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Meeting room bar ─────────────────────────────────────────────

function MeetingBar({ agentIds }: { agentIds: string[] }) {
  const agents = agentIds.map(id => AGENTES.find(a => a.id === id)).filter(Boolean) as Agente[]

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ overflow: 'hidden' }}
    >
      <div style={{
        padding: '12px 16px',
        borderRadius: 12,
        background: 'rgba(232,98,42,0.06)',
        border: '0.5px solid rgba(232,98,42,0.25)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {/* Icon + label */}
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(232,98,42,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <i className="fa-solid fa-users" style={{ fontSize: 12, color: '#e8622a' }} />
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>Sala de Reunião</div>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 1 }}>
            {agents.length} agente{agents.length !== 1 ? 's' : ''} em sessão estratégica
          </div>
        </div>

        {/* Agent avatars */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center' }}>
          <AnimatePresence>
            {agents.map(a => (
              <motion.div
                key={a.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                title={a.nome}
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `linear-gradient(135deg, ${a.cor}, ${a.cor}99)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: '#fff',
                  boxShadow: `0 2px 8px ${a.cor}40`,
                  border: '1.5px solid var(--bg)',
                  marginLeft: -4,
                }}
              >
                {a.inicial}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Live pulse */}
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20,
            background: 'rgba(232,98,42,0.12)',
            border: '0.5px solid rgba(232,98,42,0.3)',
            flexShrink: 0,
          }}
        >
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#e8622a' }} />
          <span style={{ fontSize: 8.5, fontWeight: 700, color: '#e8622a', letterSpacing: '0.08em' }}>AO VIVO</span>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────

export default function MapaPage() {
  const [meetingSet, setMeetingSet] = useState<Set<string>>(new Set())

  const handleMeetingChange = useCallback((id: string, inMeeting: boolean) => {
    setMeetingSet(prev => {
      const next = new Set(prev)
      if (inMeeting) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const meetingIds = Array.from(meetingSet)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>
            FactorHub <span style={{ color: '#e8622a' }}>HQ</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
            8 departamentos ·{' '}
            {meetingIds.length > 0
              ? <span style={{ color: '#e8622a' }}>{meetingIds.length} em reunião</span>
              : <span>todos operacionais</span>
            }
          </div>
        </div>

        <motion.div
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 20,
            background: 'rgba(34,197,94,0.08)',
            border: '0.5px solid rgba(34,197,94,0.2)',
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
          <span style={{ fontSize: 9.5, fontWeight: 700, color: '#22C55E', letterSpacing: '0.1em' }}>LIVE</span>
        </motion.div>
      </div>

      {/* Meeting bar */}
      <AnimatePresence>
        {meetingIds.length > 0 && (
          <MeetingBar key="meeting-bar" agentIds={meetingIds} />
        )}
      </AnimatePresence>

      {/* 4×2 workstation grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
      }}>
        {AGENTES.map((a, i) => (
          <WorkstationCard
            key={a.id}
            agente={a}
            index={i}
            onMeetingChange={handleMeetingChange}
          />
        ))}
      </div>

      {/* Status footer */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '11px 16px',
        background: 'var(--surface)',
        borderRadius: 12,
        border: '0.5px solid var(--border)',
      }}>
        {AGENTES.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 18, height: 18, borderRadius: 5,
              background: `linear-gradient(135deg, ${a.cor}, ${a.cor}88)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 7, fontWeight: 800, color: '#fff',
            }}>
              {a.inicial}
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 500 }}>
              {a.nome.split(' ')[0]}
            </span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9.5, color: 'var(--text-dim)' }}>
          FactorHub OS · v2 · Todos os agentes operacionais
        </span>
      </div>
    </div>
  )
}
