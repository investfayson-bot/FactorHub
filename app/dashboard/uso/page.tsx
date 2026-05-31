'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { AGENTES } from '@/lib/hub-agentes'

type UsageRow = { agente_id: string; modelo: string; total_tokens: number; prompt_tokens: number; completion_tokens: number; custo_usd: number; created_at: string }
type AgentStats = { agente_id: string; total_tokens: number; prompt_tokens: number; completion_tokens: number; custo_usd: number; chamadas: number }

export default function UsoPage() {
  const [rows, setRows] = useState<UsageRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
      const eid = u?.empresa_id ?? user.id
      const { data } = await supabase
        .from('hub_uso_agentes')
        .select('agente_id,modelo,total_tokens,prompt_tokens,completion_tokens,custo_usd,created_at')
        .eq('empresa_id', eid)
        .order('created_at', { ascending: false })
        .limit(500)
      setRows((data ?? []) as UsageRow[])
      setLoading(false)
    })()
  }, [])

  const stats: AgentStats[] = AGENTES.map((a) => {
    const aRows = rows.filter((r) => r.agente_id === a.id)
    return {
      agente_id: a.id,
      total_tokens: aRows.reduce((s, r) => s + Number(r.total_tokens ?? 0), 0),
      prompt_tokens: aRows.reduce((s, r) => s + Number(r.prompt_tokens ?? 0), 0),
      completion_tokens: aRows.reduce((s, r) => s + Number(r.completion_tokens ?? 0), 0),
      custo_usd: aRows.reduce((s, r) => s + Number(r.custo_usd ?? 0), 0),
      chamadas: aRows.length,
    }
  }).filter((s) => s.chamadas > 0).sort((a, b) => b.total_tokens - a.total_tokens)

  const totais = stats.reduce(
    (acc, s) => ({ total_tokens: acc.total_tokens + s.total_tokens, custo_usd: acc.custo_usd + s.custo_usd, chamadas: acc.chamadas + s.chamadas }),
    { total_tokens: 0, custo_usd: 0, chamadas: 0 }
  )

  const maxTokens = Math.max(...stats.map(s => s.total_tokens), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs */}
      <motion.div
        initial="hidden" animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}
      >
        {[
          { label: 'Total de tokens', value: totais.total_tokens.toLocaleString('pt-BR'), icon: 'fa-coins', color: '#e8622a' },
          { label: 'Custo total (USD)', value: `$${totais.custo_usd.toFixed(4)}`, icon: 'fa-dollar-sign', color: '#22C55E', mono: true },
          { label: 'Total de chamadas', value: totais.chamadas.toLocaleString('pt-BR'), icon: 'fa-bolt', color: '#7C3AED' },
        ].map((k) => (
          <motion.div
            key={k.label}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.3 }}
          >
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: `${k.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`fa-solid ${k.icon}`} style={{ fontSize: 14, color: k.color }} />
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', fontFamily: k.mono ? "'DM Mono',monospace" : undefined, marginBottom: 4 }}>{k.value}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{k.label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Usage by agent with bar chart */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}
        style={{ overflow: 'hidden' }}
      >
        <div className="card-header">
          <span className="card-title">Consumo por Agente</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stats.length} agente{stats.length !== 1 ? 's' : ''} ativos</span>
        </div>
        {loading ? (
          <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
            <motion.div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
          </div>
        ) : stats.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <i className="fa-solid fa-chart-bar" style={{ fontSize: 28, marginBottom: 12, display: 'block', opacity: 0.2 }} />
            Nenhuma chamada registrada ainda.
          </div>
        ) : (
          <>
            {/* Bar chart rows */}
            <div style={{ padding: '12px 18px 6px' }}>
              {stats.map((s, i) => {
                const agente = AGENTES.find(a => a.id === s.agente_id)!
                const pct = Math.round((s.total_tokens / maxTokens) * 100)
                return (
                  <motion.div
                    key={s.agente_id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}
                  >
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: agente.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{agente.inicial}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>{agente.nome}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>{s.total_tokens.toLocaleString()} tk · ${s.custo_usd.toFixed(4)}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.2 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
                          style={{ height: '100%', background: agente.cor, borderRadius: 3 }}
                        />
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', minWidth: 28, textAlign: 'right', fontFamily: "'DM Mono',monospace" }}>{s.chamadas}x</span>
                  </motion.div>
                )
              })}
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', borderTop: '0.5px solid var(--border)' }}>
              <table className="crud-table">
                <thead>
                  <tr><th>Agente</th><th>Chamadas</th><th>Prompt tk</th><th>Output tk</th><th>Total tk</th><th>Custo USD</th></tr>
                </thead>
                <tbody>
                  {stats.map((s) => {
                    const agente = AGENTES.find((a) => a.id === s.agente_id)!
                    return (
                      <tr key={s.agente_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 24, height: 24, borderRadius: 5, background: agente.cor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, flexShrink: 0 }}>{agente.inicial}</div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{agente.nome}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: "'DM Mono',monospace", color: 'var(--text)', fontSize: 12 }}>{s.chamadas.toLocaleString('pt-BR')}</td>
                        <td style={{ fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)', fontSize: 11 }}>{s.prompt_tokens.toLocaleString('pt-BR')}</td>
                        <td style={{ fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)', fontSize: 11 }}>{s.completion_tokens.toLocaleString('pt-BR')}</td>
                        <td style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600, color: 'var(--text)', fontSize: 12 }}>{s.total_tokens.toLocaleString('pt-BR')}</td>
                        <td style={{ fontFamily: "'DM Mono',monospace", color: s.custo_usd > 0.1 ? 'var(--gold)' : 'var(--text-muted)', fontSize: 12 }}>${s.custo_usd.toFixed(4)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </motion.div>

      {/* Recent log */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.3 }}
        style={{ overflow: 'hidden' }}
      >
        <div className="card-header">
          <span className="card-title">Histórico recente</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>últimas {Math.min(rows.length, 50)} chamadas</span>
        </div>
        {rows.length === 0 && !loading ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Sem registros ainda.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crud-table">
              <thead><tr><th>Data</th><th>Agente</th><th>Modelo</th><th>Tokens</th><th>Custo (USD)</th></tr></thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => {
                  const agente = AGENTES.find((a) => a.id === r.agente_id)
                  return (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.4) }}
                    >
                      <td style={{ color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace", fontSize: 11 }}>
                        {new Date(r.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        {agente
                          ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 20, height: 20, borderRadius: 4, background: agente.cor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800 }}>{agente.inicial}</div>
                              <span style={{ fontSize: 12, color: 'var(--text)' }}>{agente.nome}</span>
                            </div>
                          : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.agente_id}</span>
                        }
                      </td>
                      <td style={{ color: 'var(--text-dim)', fontFamily: "'DM Mono',monospace", fontSize: 10.5 }}>{r.modelo}</td>
                      <td style={{ fontFamily: "'DM Mono',monospace", color: 'var(--text)', fontSize: 12 }}>{Number(r.total_tokens).toLocaleString('pt-BR')}</td>
                      <td style={{ fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)', fontSize: 12 }}>${Number(r.custo_usd).toFixed(6)}</td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
