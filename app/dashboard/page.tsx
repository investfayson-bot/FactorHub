'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AGENTES } from '@/lib/hub-agentes'
import Link from 'next/link'

type Counts = { projetos: number; ideias: number; clientes: number; eventos: number; conteudo: number }
type UsoRow = { agente_id: string; total_tokens: number; custo_usd: number }

export default function DashboardPage() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [uso, setUso] = useState<UsoRow[]>([])

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
      const eid = u?.empresa_id ?? user.id

      const [p, id, cl, ev, co, usoData] = await Promise.all([
        supabase.from('hub_projetos').select('id', { count: 'exact', head: true }).eq('empresa_id', eid),
        supabase.from('hub_ideias').select('id', { count: 'exact', head: true }).eq('empresa_id', eid),
        supabase.from('hub_clientes').select('id', { count: 'exact', head: true }).eq('empresa_id', eid),
        supabase.from('hub_eventos').select('id', { count: 'exact', head: true }).eq('empresa_id', eid),
        supabase.from('hub_conteudo').select('id', { count: 'exact', head: true }).eq('empresa_id', eid),
        supabase.from('hub_uso_agentes').select('agente_id, total_tokens, custo_usd').eq('empresa_id', eid),
      ])
      setCounts({ projetos: p.count ?? 0, ideias: id.count ?? 0, clientes: cl.count ?? 0, eventos: ev.count ?? 0, conteudo: co.count ?? 0 })

      const map: Record<string, UsoRow> = {}
      for (const r of (usoData.data ?? []) as UsoRow[]) {
        const cur = map[r.agente_id] ?? { agente_id: r.agente_id, total_tokens: 0, custo_usd: 0 }
        cur.total_tokens += Number(r.total_tokens ?? 0)
        cur.custo_usd += Number(r.custo_usd ?? 0)
        map[r.agente_id] = cur
      }
      setUso(Object.values(map).sort((a, b) => b.total_tokens - a.total_tokens))
    })()
  }, [])

  const kpis = [
    { label: 'Projetos', value: counts?.projetos ?? '—', icon: 'fa-diagram-project', href: '/dashboard/projetos', cor: '#7C3AED' },
    { label: 'Ideias', value: counts?.ideias ?? '—', icon: 'fa-lightbulb', href: '/dashboard/ideias', cor: '#F59E0B' },
    { label: 'Clientes & Leads', value: counts?.clientes ?? '—', icon: 'fa-users', href: '/dashboard/clientes', cor: '#2563EB' },
    { label: 'Eventos', value: counts?.eventos ?? '—', icon: 'fa-calendar-star', href: '/dashboard/eventos', cor: '#DB2777' },
    { label: 'Conteúdo', value: counts?.conteudo ?? '—', icon: 'fa-pen-nib', href: '/dashboard/conteudo', cor: '#E11D48' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${k.cor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fa-solid ${k.icon}`} style={{ fontSize: 14, color: k.cor }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', fontFamily: "'DM Mono',monospace" }}>{k.value}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600 }}>{k.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>
            Squad FactorHub AI
            <Link href="/dashboard/agentes" style={{ float: 'right', fontSize: 11, color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Abrir chat</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {AGENTES.map((a) => (
              <Link key={a.id} href="/dashboard/agentes" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: a.cor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{a.inicial}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>{a.nome}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--gray-400)' }}>{a.especialidade}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>
            Consumo por Agente
            <Link href="/dashboard/uso" style={{ float: 'right', fontSize: 11, color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Ver detalhes</Link>
          </div>
          {uso.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--gray-400)', padding: '20px 0', textAlign: 'center' }}>Nenhuma conversa ainda. Converse com um agente para ver o consumo.</div>
          ) : uso.map((row) => {
            const agente = AGENTES.find((a) => a.id === row.agente_id)
            if (!agente) return null
            return (
              <div key={row.agente_id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: agente.cor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>{agente.inicial}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>{agente.nome}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--gray-400)', fontFamily: "'DM Mono',monospace" }}>
                    {row.total_tokens.toLocaleString('pt-BR')} tokens · ${Number(row.custo_usd).toFixed(4)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
