'use client'

import { motion, AnimatePresence } from 'framer-motion'

export type PlanStep = {
  id: string
  titulo: string
  descricao: string
  ferramentas: string[]
  status?: 'pendente' | 'executando' | 'concluida'
}

type Props = {
  etapas: PlanStep[]
  agenteCor: string
  agenteNome: string
}

const toolColor: Record<string, string> = {
  'Analise de Mercado': '#7C3AED',
  'Planejamento Estrategico': '#7C3AED',
  'SWOT': '#7C3AED',
  'Benchmarking': '#7C3AED',
  'Kanban': '#2563EB',
  'Roadmap': '#2563EB',
  'Sprint Planning': '#2563EB',
  'SEO': '#DB2777',
  'Growth Hacking': '#DB2777',
  'Analytics': '#DB2777',
  'NLP': '#D97706',
  'Storytelling': '#D97706',
  'Data Mining': '#0D9488',
  'Estatistica': '#0D9488',
  'Python': '#059669',
  'Code Review': '#059669',
  'Arquitetura': '#059669',
  'Pesquisa': '#E11D48',
  'Roteiro': '#E11D48',
  'SEO Content': '#E11D48',
}

function toolBadgeColor(tool: string): string {
  return toolColor[tool] ?? '#475569'
}

function StepIcon({ status }: { status?: string }) {
  if (status === 'concluida') {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <i className="fa-solid fa-check" style={{ fontSize: 9, color: '#fff' }} />
      </motion.div>
    )
  }
  if (status === 'executando') {
    return (
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 1.2 }}
        style={{
          width: 22, height: 22, borderRadius: '50%',
          border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'var(--gold)' }}
        />
      </motion.div>
    )
  }
  return (
    <div
      style={{
        width: 22, height: 22, borderRadius: '50%',
        border: '1.5px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    />
  )
}

export function AgentPlan({ etapas, agenteCor, agenteNome }: Props) {
  const done = etapas.filter(e => e.status === 'concluida').length
  const pct = etapas.length > 0 ? Math.round((done / etapas.length) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border-light)' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <i className="fa-solid fa-diagram-project" style={{ fontSize: 12, color: agenteCor }} />
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', flex: 1 }}>
          Plano de execucao — {agenteNome}
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>
          {done}/{etapas.length} etapas
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', marginBottom: 16, overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', borderRadius: 2, background: agenteCor, transformOrigin: 'left' }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Steps */}
      <div style={{ position: 'relative' }}>
        {/* Connector line */}
        <div
          style={{
            position: 'absolute',
            left: 10,
            top: 22,
            bottom: 22,
            width: 1,
            background: 'var(--border)',
          }}
        />

        <AnimatePresence>
          {etapas.map((etapa, i) => (
            <motion.div
              key={etapa.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.25 }}
              style={{ display: 'flex', gap: 12, marginBottom: i < etapas.length - 1 ? 16 : 0, position: 'relative', zIndex: 1 }}
            >
              <StepIcon status={etapa.status} />

              <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: etapa.status === 'pendente' || !etapa.status ? 'var(--text-muted)' : 'var(--text)',
                    }}
                  >
                    {etapa.titulo}
                  </span>
                  {etapa.status === 'executando' && (
                    <motion.span
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      style={{ fontSize: 9.5, color: 'var(--gold)', fontWeight: 700, letterSpacing: '.05em' }}
                    >
                      EXECUTANDO
                    </motion.span>
                  )}
                </div>

                <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 6 }}>
                  {etapa.descricao}
                </div>

                {etapa.ferramentas.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {etapa.ferramentas.map((f, fi) => (
                      <motion.span
                        key={fi}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.08 + fi * 0.04, duration: 0.2 }}
                        style={{
                          fontSize: 9.5,
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: `${toolBadgeColor(f)}18`,
                          color: toolBadgeColor(f),
                          border: `1px solid ${toolBadgeColor(f)}30`,
                          letterSpacing: '.02em',
                        }}
                      >
                        {f}
                      </motion.span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
