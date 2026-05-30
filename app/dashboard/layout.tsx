'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type NavItem = { href: string; icon: string; label: string; badge?: string; badgeColor?: string; match?: (p: string) => boolean }

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Central',
    items: [
      { href: '/dashboard', icon: 'fa-grid-2', label: 'Dashboard', match: (p) => p === '/dashboard' || p === '/dashboard/' },
      { href: '/dashboard/agentes', icon: 'fa-robot', label: 'Agentes', badge: 'IA', badgeColor: '#8B5CF6' },
      { href: '/dashboard/tarefas', icon: 'fa-list-check', label: 'Tarefas' },
      { href: '/dashboard/uso', icon: 'fa-chart-bar', label: 'Consumo' },
    ],
  },
  {
    label: 'Operação',
    items: [
      { href: '/dashboard/projetos', icon: 'fa-diagram-project', label: 'Projetos' },
      { href: '/dashboard/ideias', icon: 'fa-lightbulb', label: 'Ideias' },
      { href: '/dashboard/clientes', icon: 'fa-users', label: 'Clientes' },
      { href: '/dashboard/eventos', icon: 'fa-calendar', label: 'Eventos' },
      { href: '/dashboard/conteudo', icon: 'fa-pen-nib', label: 'Conteudo' },
    ],
  },
]

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/agentes': 'Agentes IA',
  '/dashboard/tarefas': 'Tarefas',
  '/dashboard/uso': 'Consumo',
  '/dashboard/projetos': 'Projetos',
  '/dashboard/ideias': 'Ideias',
  '/dashboard/clientes': 'Clientes',
  '/dashboard/eventos': 'Eventos',
  '/dashboard/conteudo': 'Conteudo',
}

function isActive(pathname: string, item: NavItem) {
  if (item.match) return item.match(pathname)
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push('/auth'); return }
      setUser(u)
    })
  }, [router])

  async function sair() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const pageTitle = TITLES[pathname] ?? 'FactorHub'
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'FH'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(2px)' }} onClick={() => setSidebarOpen(false)} />
      )}

      <aside className="sidebar" style={{ transform: sidebarOpen ? 'translateX(0)' : undefined } as React.CSSProperties}>
        <div className="sb-logo">
          <div className="sb-logo-txt">Factor<span>Hub</span></div>
          <div className="sb-logo-sub">Agentes de IA + Operacao</div>
        </div>

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
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: item.badgeColor, color: '#fff' }}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sb-footer">
          <div className="sb-co" onClick={sair} title="Sair">
            <div className="sb-co-av">{initials}</div>
            <div>
              <div className="sb-co-name">{user?.email?.split('@')[0] || 'Conta'}</div>
              <div className="sb-co-plan">FactorHub</div>
            </div>
            <i className="fa-solid fa-arrow-right-from-bracket" style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }} />
          </div>
        </div>
      </aside>

      <div className="fo-main">
        <div className="topbar">
          <button className="sb-hamburger" onClick={() => setSidebarOpen((v) => !v)}>
            <i className="fa-solid fa-bars" style={{ fontSize: 15 }} />
          </button>
          <div className="topbar-title">{pageTitle}</div>
          <div className="live-badge"><div className="live-dot" />LIVE</div>
          <div className="topbar-av" onClick={sair} title="Sair">{initials}</div>
        </div>
        <div className="fo-content">{children}</div>
      </div>
    </div>
  )
}
