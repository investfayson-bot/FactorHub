'use client'

import * as React from "react"
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'

const menuItems = [
  { name: 'Agentes', href: '/dashboard/agentes' },
  { name: 'Projetos', href: '/dashboard/projetos' },
  { name: 'Tarefas', href: '/dashboard/tarefas' },
  { name: 'Cerebro', href: '/dashboard/cerebro' },
]

export const HeroSection = () => {
  const [menuState, setMenuState] = React.useState(false)

  return (
    <div className="min-h-screen" style={{ background: '#0A0F1E', color: '#F1F5F9' }}>
      <header>
        <nav
          data-state={menuState && 'active'}
          className="group fixed z-20 w-full border-b border-white/10 backdrop-blur-md"
          style={{ background: 'rgba(10,15,30,0.85)' }}
        >
          <div className="m-auto max-w-5xl px-6">
            <div className="flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
              <div className="flex w-full justify-between lg:w-auto">
                <Link href="/" aria-label="home" className="flex items-center space-x-2">
                  <FactorHubLogo />
                </Link>

                <button
                  onClick={() => setMenuState(!menuState)}
                  aria-label={menuState ? 'Fechar Menu' : 'Abrir Menu'}
                  className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
                  style={{ color: '#94A3B8' }}
                >
                  <Menu className="group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                  <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                </button>
              </div>

              <div
                className="group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-2xl border border-white/10 p-6 shadow-2xl md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none"
                style={{ background: 'rgba(17,24,39,0.98)' }}
              >
                <div className="lg:pr-4">
                  <ul className="space-y-6 text-base lg:flex lg:gap-8 lg:space-y-0 lg:text-sm">
                    {menuItems.map((item, index) => (
                      <li key={index}>
                        <Link
                          href={item.href}
                          className="block duration-150"
                          style={{ color: '#64748B' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#F1F5F9')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit lg:border-l lg:border-white/10 lg:pl-6">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/auth">Entrar</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/auth">Comecar</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main>
        {/* Background glow effects */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
          <div
            className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(ellipse, #14B8A6 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-1/3 left-0 h-[400px] w-[400px] -rotate-45 rounded-full opacity-10"
            style={{ background: 'radial-gradient(ellipse, #7C3AED 0%, transparent 70%)' }}
          />
        </div>

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="relative mx-auto max-w-5xl px-6 py-36 lg:py-40 z-[2]">
            <div className="relative z-10 mx-auto max-w-2xl text-center">
              <div
                className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium mb-8"
                style={{ borderColor: 'rgba(20,184,166,0.3)', color: '#14B8A6', background: 'rgba(20,184,166,0.08)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                7 agentes de IA em operacao
              </div>

              <h1
                className="text-balance text-4xl font-semibold md:text-5xl lg:text-6xl leading-tight"
                style={{ color: '#F1F5F9' }}
              >
                Operacao inteligente com agentes de IA
              </h1>

              <p
                className="mx-auto my-8 max-w-xl text-lg leading-relaxed"
                style={{ color: '#64748B' }}
              >
                Gerencie projetos, ideias, clientes e tarefas com agentes de IA especializados trabalhando para voce.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg">
                  <Link href="/auth">
                    <span>Acessar o Hub</span>
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg">
                  <Link href="/dashboard/cerebro">
                    <span style={{ color: '#64748B' }}>Ver Cerebro</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Perspective screenshot */}
          <div
            className="mx-auto -mt-12 max-w-7xl px-6 z-[2] relative"
            style={{ maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }}
          >
            <div style={{ perspective: '1200px' }}>
              <div
                className="relative overflow-hidden rounded-xl border"
                style={{
                  transform: 'rotateX(18deg)',
                  borderColor: 'rgba(30,45,64,0.8)',
                  background: '#111827',
                }}
              >
                {/* Fake dashboard screenshot */}
                <DashboardPreview />
              </div>
            </div>
          </div>
        </section>

        {/* Tech stack partners */}
        <section className="relative z-10 py-20" style={{ background: 'rgba(10,15,30,0.95)' }}>
          <div className="m-auto max-w-5xl px-6">
            <p
              className="text-center text-sm font-medium mb-12 tracking-widest uppercase"
              style={{ color: '#334155', letterSpacing: '0.15em' }}
            >
              Powered by
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
              {[
                { label: 'OpenRouter', icon: 'fa-robot' },
                { label: 'Supabase', icon: 'fa-database' },
                { label: 'Next.js', icon: 'fa-n' },
                { label: 'Vercel', icon: 'fa-cloud' },
                { label: 'OpenAI', icon: 'fa-brain' },
              ].map(p => (
                <div
                  key={p.label}
                  className="flex items-center gap-2"
                  style={{ color: '#334155' }}
                >
                  <i className={`fa-solid ${p.icon}`} style={{ fontSize: 14 }} />
                  <span className="text-sm font-medium">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function DashboardPreview() {
  const agents = [
    { name: 'CEO Estrategista', cor: '#7C3AED', inicial: 'CE', status: 'online' },
    { name: 'PM Agil', cor: '#2563EB', inicial: 'PM', status: 'working' },
    { name: 'CMO Growth', cor: '#DB2777', inicial: 'CM', status: 'online' },
    { name: 'Copywriter', cor: '#D97706', inicial: 'CW', status: 'idle' },
    { name: 'Analista', cor: '#0D9488', inicial: 'AN', status: 'online' },
    { name: 'Dev Senior', cor: '#059669', inicial: 'DV', status: 'working' },
  ]

  return (
    <div style={{ background: '#0A0F1E', minHeight: 320, padding: '0', fontFamily: 'system-ui' }}>
      {/* Topbar */}
      <div
        style={{
          borderBottom: '1px solid #1E2D40',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: '#111827',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9' }}>
          Factor<span style={{ color: '#14B8A6' }}>Hub</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#14B8A6' }} className="animate-pulse" />
          <span style={{ fontSize: 10, color: '#14B8A6', fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* KPI cards */}
        {[
          { label: 'Tarefas hoje', value: '23', color: '#14B8A6' },
          { label: 'Custo (USD)', value: '$0.0041', color: '#F1F5F9', mono: true },
        ].map(k => (
          <div key={k.label} style={{ background: '#111827', border: '1px solid #1E2D40', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.color, fontFamily: k.mono ? 'monospace' : undefined }}>{k.value}</div>
            <div style={{ fontSize: 10, color: '#64748B', marginTop: 3 }}>{k.label}</div>
          </div>
        ))}

        {/* Agent grid */}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {agents.map(a => (
            <div key={a.name} style={{ background: '#111827', border: '1px solid #1E2D40', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: a.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{a.inicial}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                <div style={{ fontSize: 9, color: a.status === 'working' ? '#14B8A6' : a.status === 'online' ? '#22C55E' : '#64748B', marginTop: 2 }}>{a.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const FactorHubLogo = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: 'linear-gradient(135deg, #14B8A6, #7C3AED)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <i className="fa-solid fa-brain" style={{ fontSize: 13, color: '#fff' }} />
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>
        Factor<span style={{ color: '#14B8A6' }}>Hub</span>
      </span>
    </div>
  )
}
