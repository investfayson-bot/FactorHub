'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * PageHeader — cabeçalho padrão (modelo aba Ideias) usado em TODAS as páginas.
 * Clean, minimalista: título + subtítulo à esquerda, ação à direita.
 */
export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.2px' }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </motion.div>
  )
}
