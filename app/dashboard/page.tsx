'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { AGENTES } from '@/lib/hub-agentes'
import Link from 'next/link'

type Tarefa = { id: string; titulo: string; agente_id: string; status: string; resultado: string | null; custo_usd: number; created_at: string; completed_at: string | null }
type Counts = { projetos: number; ideias: number; clientes: number; tarefas: number }

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [totalCusto, setTotalCusto] = useState(0)
  const [empresaId, setEmpresaId] = useState('')

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
    const eid = u?.empresa_id ?? user.id
    setEmpresaId(eid)

    const [p, id, cl, tf, uso] = await Promise.all([
      supabase.from('hub_projetos').select('id', { count: 'exact', head: true }).eq('empresa_id', eid),
      supabase.from('hub_ideias').select('id', { count: 'exact', head: true }).eq('empresa_id', eid),
      supabase.from('hub_clientes').select('id', { count: 'exact', head: true }).eq('empresa_id', eid),
      supabase.from('hub_tarefas').select('id', { count: 'exact', head: true }).eq('empresa_id', eid),
      supabase.from('hub_uso_agentes').select('custo_usd').eq('empresa_id', eid),
    ])

    setCounts({ projetos: p.count ?? 0, ideias: id.count ?? 0, clientes: cl.count ?? 0, tarefas: tf.count ?? 0 })
    setTotalCusto((uso.data ?? []).reduce((s, r) => s + Number(r.custo_usd ?? 0), 0))

    const { data: tfList } = await supabase.from('hub_tarefas').select('id,titulo,agente_id,status,resultado,custo_usd,created_at,completed_at').eq('empresa_id', eid).order('created_at', { ascending: false }).limit(20)
    setTarefas((tfList ?? []) as Tarefa[])
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  useEffect(() => {
    if (!empresaId) return
    const ch = supabase.channel('dashboard').on('postgres_changes', { event: '*', schema: 'public', table: 'hub_tarefas', filter: `empresa_id=eq.${empresaId}` }, () => { void carregar() }).subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [empresaId, carregar])

  const agentStats = AGENTES.map(a => {
    const agTarefas = tarefas.filter(t => t.agente_id === a.id)
    const last = agTarefas[0]
    const isWorking = last?.status === 'executando'
    return { ...a, total: agTarefas.length, last, isWorking }
  })

  const hoje = tarefas.filter(t => {
    const d = new Date(t.created_at)
    const now = new Date()
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth()
  })

  const statusColor: Record<string, string> = { concluida: 'var(--green)', executando: 'var(--gold)', erro: 'var(--red)' }
  const statusBg: Record<string, string> = { concluida: 'rgba(34,197,94,.12)', executando: 'rgba(245,158,11,.12)', erro: 'rgba(239,68,68,.12)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Tarefas hoje', value: hoje.length },
          { label: 'Total tarefas', value: counts?.tarefas ?? '—' },
          { label: 'Clientes', value: counts?.clientes ?? '—' },
          { label: 'Custo IA (USD)', value: `$${totalCusto.toFixed(4)}`, mono: true },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: '16px 18px' }}>
            <div className="kpi-val" style={{ fontFamily: k.mono ? "'DM Mono',monospace" : undefined }}>{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, minHeight: 0 }}>

        {/* Agent grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '.02em' }}>AGENTES</span>
            <Link href="/dashboard/agentes" style={{ fontSize: 11.5, color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Criar tarefa</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {agentStats.map(a => (
              <Link key={a.id} href="/dashboard/agentes" style={{ textDecoration: 'none' }}>
                <div className={`agent-card${a.isWorking ? ' working' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div className="agent-av" style={{ background: a.cor }}>{a.inicial}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nome}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                        <div className={`status-dot ${a.isWorking ? 'working' : a.total > 0 ? 'online' : 'idle'}`} />
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{a.isWorking ? 'executando' : a.total > 0 ? 'disponivel' : 'inativo'}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>{a.total} tarefa{a.total !== 1 ? 's' : ''}</span>
                    {a.last && <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{timeAgo(a.last.created_at)}</span>}
                  </div>
                  {a.last && (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                      {a.last.titulo}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Task feed */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-header">
            <span className="card-title">Atividade recente</span>
            <Link href="/dashboard/tarefas" style={{ fontSize: 11.5, color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Ver tudo</Link>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {tarefas.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                Nenhuma tarefa ainda.<br />
                <Link href="/dashboard/agentes" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Crie a primeira</Link>
              </div>
            ) : tarefas.map(t => {
              const agente = AGENTES.find(a => a.id === t.agente_id)
              return (
                <div key={t.id} className="task-row">
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: agente?.cor ?? '#334155', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 800, flexShrink: 0 }}>
                    {agente?.inicial ?? '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titulo}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span className="task-status-pill" style={{ background: statusBg[t.status] ?? 'var(--surface-2)', color: statusColor[t.status] ?? 'var(--text-muted)' }}>
                        {t.status}
                      </span>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{timeAgo(t.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
