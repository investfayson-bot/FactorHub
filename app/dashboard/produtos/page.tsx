'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'

const PRODUCTS = [
  {
    id: 'factorone',
    name: 'FactorOne',
    tagline: 'Finance OS para PMEs',
    description: 'Sistema financeiro completo para empresas: caixa, DRE, notas fiscais, equipe, fornecedores, CRM, logística e IA CFO.',
    url: 'https://factorone-mvp2.vercel.app',
    repo: 'investfayson-bot/factorone-mvp2',
    color: '#3ecf8e',
    icon: 'fa-chart-line',
    status: 'live' as const,
    stack: ['Next.js 16', 'Supabase', 'Claude API', 'Stripe', 'Resend'],
    sprints: 12,
    features: [
      'AI CFO com análise em tempo real',
      'DRE, caixa, contas a pagar/receber',
      'Notas fiscais NF-e/NFS-e',
      'CRM, equipe, logística',
      'Portal contador, portal fornecedor',
      'Módulo PF (finanças pessoais)',
    ],
    pending: ['Pluggy Open Finance', 'IR 2024', 'App mobile'],
  },
  {
    id: 'lifeos',
    name: 'LifeOS',
    tagline: 'Assessor pessoal de bolso',
    description: 'App de organização pessoal com IA conversacional: finanças, agenda, metas, saúde, relacionamentos e produtividade.',
    url: '#',
    repo: '',
    color: '#10b981',
    icon: 'fa-leaf',
    status: 'dev' as const,
    stack: ['Next.js', 'Supabase', 'Claude API', 'WhatsApp API'],
    sprints: 0,
    features: [
      'OCR de recibos com IA',
      'Agenda e lembretes',
      'Metas e hábitos',
      'Chat IA pessoal',
      'Integração WhatsApp',
      'Credit score e open finance',
    ],
    pending: ['Tudo — em planejamento'],
  },
  {
    id: 'vnprime',
    name: 'VN Prime',
    tagline: 'Plataforma imobiliária completa',
    description: 'Sistema de gestão para imobiliária: CRM de clientes, agendamento, marketing, curadoria de imóveis, análise de métricas e redes sociais.',
    url: '#',
    repo: '',
    color: '#f59e0b',
    icon: 'fa-building',
    status: 'next' as const,
    stack: ['Next.js', 'Supabase', 'FactorHub Agents'],
    sprints: 0,
    features: [
      'CRM de clientes e leads',
      'Agendamento de visitas',
      'Curadoria e catálogo de imóveis',
      'Marketing e redes sociais',
      'Análise de métricas e funil',
      'Contratos e documentos',
    ],
    pending: ['Tudo — próximo a ser construído pelo FactorHub'],
  },
]

const STATUS_CONFIG = {
  live: { label: 'Live', color: '#22c55e', bg: 'rgba(34,197,94,.1)', border: 'rgba(34,197,94,.25)' },
  dev: { label: 'Em Dev', color: '#f59e0b', bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.25)' },
  next: { label: 'Próximo', color: '#f59e0b', bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.25)' },
}

export default function ProdutosPage() {
  const [expanded, setExpanded] = useState<string | null>('vnprime')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <PageHeader
        title="Portfólio FALC INC"
        subtitle="3 produtos — o FactorHub cria e gerencia as ferramentas de cada um"
      />

      {PRODUCTS.map((p, i) => {
        const st = STATUS_CONFIG[p.status]
        const isOpen = expanded === p.id
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            style={{ background: '#181818', border: `1px solid ${isOpen ? p.color + '40' : '#2e2e2e'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color .2s' }}
          >
            {/* Header row */}
            <button
              onClick={() => setExpanded(isOpen ? null : p.id)}
              style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: `${p.color}15`, border: `1.5px solid ${p.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`fa-solid ${p.icon}`} style={{ fontSize: 18, color: p.color }} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#ededed' }}>{p.name}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: st.bg, color: st.color, border: `1px solid ${st.border}`, letterSpacing: '.05em' }}>
                    {st.label}
                  </span>
                  {p.sprints > 0 && (
                    <span style={{ fontSize: 9, color: '#888888' }}>{p.sprints} sprints</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#888888' }}>{p.tagline}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                {p.url !== '#' && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: `${p.color}15`, color: p.color, border: `1px solid ${p.color}30`, textDecoration: 'none' }}
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 9, marginRight: 4 }} />
                    Abrir
                  </a>
                )}
                {p.status === 'next' && (
                  <Link
                    href="/dashboard/missoes"
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'var(--accent)', color: '#101010', textDecoration: 'none' }}
                  >
                    <i className="fa-solid fa-rocket" style={{ fontSize: 9, marginRight: 4 }} />
                    Iniciar missão
                  </Link>
                )}
                <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: 10, color: '#555555' }} />
              </div>
            </button>

            {/* Expanded content */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid #2e2e2e' }}>
                    <p style={{ fontSize: 12, color: '#c4b8e0', lineHeight: 1.7, marginTop: 14, marginBottom: 16 }}>{p.description}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {/* Features */}
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#888888', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Funcionalidades</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {p.features.map(f => (
                            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                              <i className="fa-solid fa-check" style={{ fontSize: 9, color: p.color, marginTop: 3, flexShrink: 0 }} />
                              <span style={{ fontSize: 11, color: '#c4b8e0' }}>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Stack + Pending */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#888888', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Stack</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {p.stack.map(s => (
                              <span key={s} style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: '#1e1e1e', border: '1px solid #2e2e2e', color: '#9ca3af' }}>{s}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#888888', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Pendente</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {p.pending.map(item => (
                              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                                <i className="fa-solid fa-circle" style={{ fontSize: 5, color: '#f59e0b', marginTop: 5, flexShrink: 0 }} />
                                <span style={{ fontSize: 11, color: '#888888' }}>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}
