'use client'

import { useEffect, useState, useCallback } from 'react'
import { AGENTES, type Agente } from '@/lib/hub-agentes'
import { supabase } from '@/lib/supabase'

type Tarefa = { id: string; titulo: string; descricao: string | null; status: string; resultado: string | null; custo_usd: number; created_at: string }

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

export default function AgentesPage() {
  const [ativo, setAtivo] = useState<Agente>(AGENTES[0])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTarefas, setLoadingTarefas] = useState(false)
  const [tarefaAberta, setTarefaAberta] = useState<Tarefa | null>(null)

  const carregarTarefas = useCallback(async (agentId: string) => {
    setLoadingTarefas(true)
    const { data: sess } = await supabase.auth.getSession()
    const token = sess.session?.access_token
    const res = await fetch(`/api/hub/tarefa?agentId=${agentId}&limit=30`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const payload = await res.json().catch(() => ({ tarefas: [] }))
    setTarefas(payload.tarefas ?? [])
    setLoadingTarefas(false)
  }, [])

  useEffect(() => {
    void carregarTarefas(ativo.id)
    setTarefaAberta(null)
  }, [ativo.id, carregarTarefas])

  async function executar() {
    if (!titulo.trim() || loading) return
    setLoading(true)
    const { data: sess } = await supabase.auth.getSession()
    const token = sess.session?.access_token
    const res = await fetch('/api/hub/tarefa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ agentId: ativo.id, titulo: titulo.trim(), descricao: descricao.trim() || undefined }),
    })
    const payload = await res.json().catch(() => ({}))
    setLoading(false)
    setTitulo('')
    setDescricao('')
    if (payload.tarefa) {
      setTarefaAberta(payload.tarefa as Tarefa)
      void carregarTarefas(ativo.id)
    }
  }

  const statusColor: Record<string, string> = { concluida: 'var(--green)', executando: 'var(--gold)', erro: 'var(--red)' }
  const statusBg: Record<string, string> = { concluida: 'rgba(34,197,94,.12)', executando: 'rgba(245,158,11,.12)', erro: 'rgba(239,68,68,.12)' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, height: '100%', minHeight: 0 }}>

      {/* Agent list */}
      <div className="card" style={{ overflowY: 'auto' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
          Squad
        </div>
        <div style={{ padding: 8 }}>
          {AGENTES.map(a => {
            const sel = a.id === ativo.id
            return (
              <button key={a.id} onClick={() => setAtivo(a)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, border: `1px solid ${sel ? a.cor + '50' : 'transparent'}`, background: sel ? `${a.cor}10` : 'transparent', transition: 'all .12s' }}>
                <div className="agent-av" style={{ background: a.cor, width: 30, height: 30, borderRadius: 7, fontSize: 10 }}>{a.inicial}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: sel ? 600 : 500, color: sel ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nome}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{a.especialidade}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0, overflow: 'auto' }}>

        {/* Agent header + task form */}
        <div className="card">
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="agent-av" style={{ background: ativo.cor, width: 40, height: 40, borderRadius: 10, fontSize: 13 }}>{ativo.inicial}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{ativo.nome}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{ativo.especialidade}</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: `${ativo.cor}15`, color: ativo.cor, letterSpacing: '.04em' }}>IA</div>
          </div>

          <div style={{ padding: '16px 18px' }}>
            <div style={{ marginBottom: 10 }}>
              <label className="form-label">Tarefa para {ativo.nome}</label>
              <input
                className="form-input"
                placeholder={ativo.sugestoes[0]}
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void executar() } }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Contexto adicional (opcional)</label>
              <textarea className="form-input" rows={2} placeholder="Detalhe a tarefa se precisar..." value={descricao} onChange={e => setDescricao(e.target.value)} style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="btn btn-primary" disabled={loading || !titulo.trim()} onClick={() => void executar()}>
                {loading ? (
                  <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 12 }} />Executando...</>
                ) : (
                  <><i className="fa-solid fa-play" style={{ fontSize: 11 }} />Executar</>
                )}
              </button>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ativo.sugestoes.map(s => (
                  <button key={s} onClick={() => setTitulo(s)} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>{s}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Result inline */}
          {tarefaAberta && (
            <div style={{ margin: '0 18px 18px', padding: 14, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>{tarefaAberta.titulo}</span>
                <span className="task-status-pill" style={{ background: statusBg[tarefaAberta.status], color: statusColor[tarefaAberta.status] }}>{tarefaAberta.status}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>${Number(tarefaAberta.custo_usd).toFixed(6)}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {tarefaAberta.resultado ?? ''}
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setTarefaAberta(null)}>Fechar</button>
            </div>
          )}
        </div>

        {/* Task history */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <span className="card-title">Historico — {ativo.nome}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tarefas.length} tarefa{tarefas.length !== 1 ? 's' : ''}</span>
          </div>
          {loadingTarefas ? (
            <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Carregando...</div>
          ) : tarefas.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              Nenhuma tarefa ainda para este agente.
            </div>
          ) : (
            <div>
              {tarefas.map(t => (
                <div key={t.id} className="task-row" style={{ cursor: 'pointer' }} onClick={() => setTarefaAberta(tarefaAberta?.id === t.id ? null : t)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="task-status-pill" style={{ background: statusBg[t.status], color: statusColor[t.status] }}>{t.status}</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titulo}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(t.created_at)}</span>
                    </div>
                    {tarefaAberta?.id === t.id && t.resultado && (
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginTop: 10, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 7 }}>
                        {t.resultado}
                      </div>
                    )}
                  </div>
                  <i className={`fa-solid ${tarefaAberta?.id === t.id ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
