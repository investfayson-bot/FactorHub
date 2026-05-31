'use client'
import { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { calcCerebroCompletion } from '@/lib/cerebro'
import type { CerebroRow } from '@/lib/cerebro'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { MissionProvider, useMission } from './mission-context'

const TerminalModal = dynamic(() => import('@/components/layout/TerminalModal'), { ssr: false })

type NavItem = {
  href: string
  icon: string
  label: string
  badge?: string
  badgeColor?: string
  match?: (p: string) => boolean
}

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', icon: 'fa-grid-2', label: 'Dashboard', match: (p) => p === '/dashboard' || p === '/dashboard/' },
      { href: '/dashboard/missoes', icon: 'fa-rocket', label: 'Missões', badge: 'NOVO', badgeColor: '#e8622a' },
      { href: '/dashboard/cerebro', icon: 'fa-brain', label: 'Cérebro' },
    ],
  },
  {
    label: 'Squad',
    items: [
      { href: '/dashboard/agentes', icon: 'fa-robot', label: 'Agentes · Squad', badge: '26', badgeColor: '#e8622a' },
      { href: '/dashboard/chat', icon: 'fa-comment-dots', label: 'Chat' },
    ],
  },
  {
    label: 'Operação',
    items: [
      { href: '/dashboard/tarefas', icon: 'fa-list-check', label: 'Tarefas' },
      { href: '/dashboard/projetos', icon: 'fa-diagram-project', label: 'Projetos' },
      { href: '/dashboard/ideias', icon: 'fa-lightbulb', label: 'Ideias' },
      { href: '/dashboard/uso', icon: 'fa-chart-bar', label: 'Consumo' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/dashboard/configuracoes', icon: 'fa-gear', label: 'Configurações' },
    ],
  },
]

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/missoes': 'Missões',
  '/dashboard/agentes': 'Conselho · C1',
  '/dashboard/tarefas': 'Tarefas',
  '/dashboard/cerebro': 'Cérebro',
  '/dashboard/chat': 'Chat',
  '/dashboard/mapa': 'Mapa da Equipe',
  '/dashboard/uso': 'Consumo de IA',
  '/dashboard/projetos': 'Projetos',
  '/dashboard/ideias': 'Ideias',
  '/dashboard/configuracoes': 'Configurações',
}

function isActive(pathname: string, item: NavItem) {
  if (item.match) return item.match(pathname)
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [cerebroPct, setCerebroPct] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) { router.push('/auth'); return }
      setUser(u)

      const { data: usrRow } = await supabase.from('usuarios').select('empresa_id').eq('id', u.id).maybeSingle()
      const empresaId = usrRow?.empresa_id ?? u.id
      const { data: cerebro } = await supabase.from('hub_cerebro').select('*').eq('empresa_id', empresaId).maybeSingle()
      if (cerebro) setCerebroPct(calcCerebroCompletion(cerebro as CerebroRow))
    })
  }, [router])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      setTerminalOpen(v => !v)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  async function sair() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const pageTitle = TITLES[pathname] ?? 'FactorHub OS'
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'FH'
  const username = user?.email?.split('@')[0] ?? 'Conta'

  const pctColor = cerebroPct < 30 ? '#ef4444' : cerebroPct < 60 ? '#f59e0b' : '#10b981'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(2px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className="sidebar" style={{ transform: sidebarOpen ? 'translateX(0)' : undefined } as React.CSSProperties}>
        {/* Logo */}
        <div className="sb-logo">
          <div className="sb-logo-txt">Factor<span>Hub</span></div>
          <div className="sb-logo-sub">OS · v2.0</div>
        </div>

        {/* Cérebro health indicator */}
        <Link
          href="/dashboard/cerebro"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            margin: '0 10px 12px',
            padding: '8px 10px',
            borderRadius: 8,
            background: cerebroPct < 50 ? 'rgba(239,68,68,.08)' : 'var(--surface-2)',
            border: `0.5px solid ${cerebroPct < 50 ? 'rgba(239,68,68,.3)' : 'var(--border)'}`,
            textDecoration: 'none',
            transition: 'all .15s',
          }}
        >
          <i className="fa-solid fa-brain" style={{ fontSize: 11, color: pctColor }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.05em', textTransform: 'uppercase' }}>Cérebro</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: pctColor }}>{cerebroPct}%</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${cerebroPct}%`, background: pctColor, borderRadius: 2, transition: 'width .5s' }} />
            </div>
          </div>
        </Link>

        <nav className="sb-nav">
          {NAV.map((group) => (
            <div key={group.label}>
              <div className="nav-section">{group.label}</div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item${isActive(pathname, item) ? ' active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <i className={`fa-solid ${item.icon}`} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{
                      fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
                      background: item.badgeColor ?? '#333', color: '#fff',
                    }}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Terminal shortcut */}
        <button
          onClick={() => setTerminalOpen(v => !v)}
          style={{
            margin: '0 10px 8px',
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 8,
            background: terminalOpen ? 'var(--accent-dim)' : 'var(--surface-2)',
            border: `0.5px solid ${terminalOpen ? 'var(--accent)' : 'var(--border)'}`,
            cursor: 'pointer', fontFamily: 'inherit', width: 'calc(100% - 20px)',
            transition: 'all .15s',
          }}
        >
          <i className="fa-solid fa-terminal" style={{ fontSize: 11, color: terminalOpen ? 'var(--accent)' : 'var(--text-muted)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: terminalOpen ? 'var(--accent)' : 'var(--text-muted)', flex: 1, textAlign: 'left' }}>Terminal</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: 'var(--surface-3)', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>⌘K</span>
        </button>

        {/* Footer */}
        <div className="sb-footer">
          <div className="sb-co" onClick={sair} title="Sair">
            <div className="sb-co-av">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sb-co-name">{username}</div>
              <div className="sb-co-plan">FactorHub OS</div>
            </div>
            <i className="fa-solid fa-arrow-right-from-bracket" style={{ fontSize: 11, color: 'var(--text-muted)' }} />
          </div>
        </div>
      </aside>

      <div className="fo-main">
        <div className="topbar">
          <button className="sb-hamburger" onClick={() => setSidebarOpen((v) => !v)}>
            <i className="fa-solid fa-bars" style={{ fontSize: 15 }} />
          </button>
          <div className="topbar-title">{pageTitle}</div>
          <div style={{ flex: 1 }} />

          {/* Nova Missão button */}
          <Link
            href="/dashboard/missoes"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 6,
              background: 'var(--accent)', color: '#fff',
              textDecoration: 'none', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.03em',
            }}
          >
            <i className="fa-solid fa-rocket" style={{ fontSize: 9 }} />
            Nova Missão
          </Link>

          <button
            onClick={() => setTerminalOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 6,
              background: 'var(--surface-2)', border: '0.5px solid var(--border)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <i className="fa-solid fa-terminal" style={{ fontSize: 10, color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>Terminal</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: 'var(--surface-3)', color: 'var(--text-dim)' }}>⌘K</span>
          </button>

          <div className="live-badge"><div className="live-dot" />LIVE</div>
          <div className="topbar-av" onClick={sair} title="Sair">{initials}</div>
        </div>

        {/* Cerebro alert banner */}
        {cerebroPct < 50 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 20px',
            background: 'rgba(245,158,11,.08)',
            borderBottom: '1px solid rgba(245,158,11,.2)',
          }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 11, color: '#f59e0b' }} />
            <span style={{ fontSize: 12, color: '#f59e0b', flex: 1 }}>
              Cérebro {cerebroPct}% preenchido — agentes operam sem contexto completo.
            </span>
            <Link href="/dashboard/cerebro" style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textDecoration: 'none' }}>
              Preencher agora →
            </Link>
          </div>
        )}

        <div className="fo-content">{children}</div>
      </div>

      <TerminalModal open={terminalOpen} onClose={() => setTerminalOpen(false)} />
      <MissionFloatingBar pathname={pathname} />
    </div>
  )
}

function MissionFloatingBar({ pathname }: { pathname: string }) {
  const { state, currentAgentId, phases, selectedLevel } = useMission()
  if (state !== 'running' || pathname === '/dashboard/missoes') return null

  const runningAgent = phases.flatMap(p => p.agents).find(a => a.agentId === currentAgentId)
  const done = phases.flatMap(p => p.agents).filter(a => a.status === 'done').length
  const total = phases.flatMap(p => p.agents).length

  return (
    <Link href="/dashboard/missoes" style={{ textDecoration: 'none' }}>
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 999,
        background: 'var(--surface)', border: '1px solid var(--accent)',
        borderRadius: 12, padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 4px 24px rgba(232,98,42,.25)',
        cursor: 'pointer', minWidth: 240,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1s infinite' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
            Missão {selectedLevel} em andamento
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
            {runningAgent ? `${runningAgent.agentName} pensando…` : 'Inicializando…'} · {done}/{total} agentes
          </div>
        </div>
        <i className="fa-solid fa-arrow-right" style={{ fontSize: 10, color: 'var(--muted)' }} />
      </div>
    </Link>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MissionProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </MissionProvider>
  )
}
