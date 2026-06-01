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
const LiveMonitor = dynamic(() => import('@/components/layout/LiveMonitor'), { ssr: false })

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
      { href: '/dashboard/criar', icon: 'fa-wand-magic-sparkles', label: 'Criar Ferramenta', badge: 'NOVO', badgeColor: '#3ecf8e' },
      { href: '/dashboard/missoes', icon: 'fa-rocket', label: 'Missões' },
      { href: '/dashboard/cerebro', icon: 'fa-brain', label: 'Cérebro' },
    ],
  },
  {
    label: 'Squad',
    items: [
      { href: '/dashboard/setores', icon: 'fa-sitemap', label: 'Setores' },
      { href: '/dashboard/agentes', icon: 'fa-robot', label: 'Agentes · Squad', badge: '27', badgeColor: '#2e2e2e' },
    ],
  },
  {
    label: 'Ferramentas',
    items: [
      { href: '/dashboard/atendimento', icon: 'fa-headset', label: 'Atendimento 24/7', badge: 'NOVO', badgeColor: '#3ecf8e' },
    ],
  },
  {
    label: 'Portfólio',
    items: [
      { href: '/dashboard/produtos', icon: 'fa-box-open', label: 'Produtos', badge: '3', badgeColor: '#2e2e2e' },
    ],
  },
  {
    label: 'Operação',
    items: [
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

const NAV_EXTERNAL: { href: string; icon: string; label: string; badge?: string; badgeColor?: string }[] = [
  { href: '/live-monitor.html', icon: 'fa-display', label: 'Live Monitor', badge: 'LIVE', badgeColor: '#3ecf8e' },
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
  '/dashboard/produtos': 'Portfólio',
  '/dashboard/criar': 'Criar Ferramenta',
  '/dashboard/setores': 'Setores',
  '/dashboard/atendimento': 'Atendimento 24/7',
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
  const [liveOpen, setLiveOpen] = useState(false)
  const [cerebroPct, setCerebroPct] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) { router.push('/auth'); return }
      setUser(u)

      // Use API route (admin client) to avoid RLS issues on hub_cerebro
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token
      try {
        const res = await fetch('/api/hub/cerebro', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const json = await res.json() as { cerebro?: CerebroRow }
          if (json.cerebro) setCerebroPct(calcCerebroCompletion(json.cerebro))
        }
      } catch { /* ignore */ }
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

        {/* Cérebro dot — minimal inline indicator */}
        {cerebroPct < 50 && (
          <Link
            href="/dashboard/cerebro"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              margin: '0 10px 8px', padding: '5px 8px', borderRadius: 6,
              background: 'rgba(245,158,11,.06)', border: '0.5px solid rgba(245,158,11,.2)',
              textDecoration: 'none', fontSize: 10, color: '#f59e0b', fontWeight: 600,
            }}
          >
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 9 }} />
            <span style={{ flex: 1 }}>Cérebro {cerebroPct}%</span>
            <span style={{ fontSize: 9, color: 'rgba(245,158,11,.6)' }}>Completar →</span>
          </Link>
        )}

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

        {/* External links */}
        {NAV_EXTERNAL.map(item => (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-item"
            style={{ margin: '0 10px 2px', borderRadius: 8, textDecoration: 'none' }}
          >
            <i className={`fa-solid ${item.icon}`} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && (
              <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: item.badgeColor ?? '#333', color: '#fff' }}>
                {item.badge}
              </span>
            )}
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 8, color: 'var(--text-dim)', marginLeft: 2 }} />
          </a>
        ))}

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
              background: 'var(--accent)', color: 'var(--bg)',
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

          <button
            onClick={() => setLiveOpen(v => !v)}
            className="live-badge"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          >
            <div className="live-dot" />LIVE
          </button>
          <div className="topbar-av" onClick={sair} title="Sair">{initials}</div>
        </div>

        {/* Cerebro alert — only shows on dashboard, dismissible */}
        {cerebroPct < 20 && pathname === '/dashboard' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 20px', fontSize: 11,
            background: 'rgba(245,158,11,.05)',
            borderBottom: '1px solid rgba(245,158,11,.12)',
          }}>
            <i className="fa-solid fa-circle-info" style={{ fontSize: 10, color: '#f59e0b' }} />
            <span style={{ color: 'var(--text-muted)', flex: 1 }}>
              Cérebro vazio — <Link href="/dashboard/cerebro" style={{ color: '#f59e0b', textDecoration: 'none', fontWeight: 600 }}>preencher agora</Link> para ativar contexto dos agentes.
            </span>
          </div>
        )}

        <div className="fo-content">{children}</div>
      </div>

      <TerminalModal open={terminalOpen} onClose={() => setTerminalOpen(false)} />
      <LiveMonitor open={liveOpen} onClose={() => setLiveOpen(false)} />
      <MissionFloatingBar pathname={pathname} />
    </div>
  )
}

function MissionFloatingBar({ pathname }: { pathname: string }) {
  const { state, currentAgentId, phases, selectedLevel, missions, cancelMission } = useMission()
  const router = useRouter()

  if (pathname === '/dashboard/missoes') return null

  // Detect: either React state is running, OR DB has stuck running missions
  const isReactRunning = state === 'running'
  const stuckMissions = state === 'idle' ? missions.filter(m => m.status === 'running') : []
  const hasStuck = stuckMissions.length > 0

  if (!isReactRunning && !hasStuck) return null

  const runningAgent = phases.flatMap(p => p.agents).find(a => a.agentId === currentAgentId)
  const done = phases.flatMap(p => p.agents).filter(a => a.status === 'done').length
  const total = phases.flatMap(p => p.agents).length
  const stuck = stuckMissions[0]

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 900,
      background: 'var(--surface)', border: `1px solid ${hasStuck && !isReactRunning ? 'rgba(239,68,68,.3)' : 'rgba(34,197,94,.2)'}`,
      borderRadius: 12, padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 4px 32px rgba(0,0,0,.6)',
      minWidth: 260,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: hasStuck && !isReactRunning ? '#ef4444' : '#22c55e',
        animation: 'pulse 1s infinite',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {isReactRunning ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
              Missão {selectedLevel} em andamento
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              {runningAgent ? `${runningAgent.agentName} processando…` : 'Inicializando…'} · {done}/{total}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
              Missão travada detectada
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {stuck?.level} · {stuck?.title || 'Sem título'}
            </div>
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => router.push('/dashboard/missoes')}
          style={{
            padding: '5px 10px', borderRadius: 6,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', cursor: 'pointer', fontSize: 10,
            fontFamily: 'inherit', fontWeight: 600,
          }}
        >
          Ver
        </button>
        {isReactRunning && (
          <button
            onClick={cancelMission}
            style={{
              padding: '5px 10px', borderRadius: 6,
              background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)',
              color: '#ef4444', cursor: 'pointer', fontSize: 10,
              fontFamily: 'inherit', fontWeight: 700,
            }}
          >
            <i className="fa-solid fa-stop" style={{ fontSize: 8, marginRight: 4 }} />Parar
          </button>
        )}
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MissionProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </MissionProvider>
  )
}
