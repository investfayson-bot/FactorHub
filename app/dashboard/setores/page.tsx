'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AGENTS_V2 } from '@/lib/agents-v2'
import PageHeader from '@/components/layout/PageHeader'

type Setor = {
  id: string
  nome: string
  icon: string
  desc: string
  lead: string          // agente responsável (com quem você fala)
  equipe: string[]      // agentes de apoio
  ferramentas: string[] // o que esse setor vai operar
}

const SETORES: Setor[] = [
  { id: 'marketing', nome: 'Marketing', icon: 'fa-bullhorn', desc: 'Posicionamento, conteúdo e marca', lead: 'CMO', equipe: ['CW', 'DG', 'DS'],
    ferramentas: ['Campanhas', 'Conteúdo', 'Redes sociais', 'Calendário editorial'] },
  { id: 'trafego', nome: 'Tráfego Pago', icon: 'fa-chart-line', desc: 'Aquisição paga e funil', lead: 'DG', equipe: ['CMO', 'DA'],
    ferramentas: ['Meta/Google Ads', 'Funil de conversão', 'ROAS', 'Otimização'] },
  { id: 'vendas', nome: 'Vendas', icon: 'fa-handshake', desc: 'Prospecção, follow-up e fechamento', lead: 'DC', equipe: ['SDR', 'CLO'],
    ferramentas: ['CRM de leads', 'Follow-up automático', 'Propostas', 'Fechamento'] },
  { id: 'atendimento', nome: 'Atendimento 24/7', icon: 'fa-headset', desc: 'Suporte, retenção e sucesso do cliente', lead: 'CS', equipe: ['CX'],
    ferramentas: ['Chat 24/7', 'FAQ inteligente', 'NPS', 'Retenção'] },
  { id: 'financeiro', nome: 'Financeiro', icon: 'fa-coins', desc: 'Caixa, precificação e viabilidade', lead: 'CFO', equipe: ['DA'],
    ferramentas: ['Fluxo de caixa', 'DRE', 'Precificação', 'Projeções'] },
  { id: 'analises', nome: 'Análises', icon: 'fa-chart-pie', desc: 'Dados, métricas e inteligência', lead: 'DA', equipe: ['SI', 'MR', 'CI'],
    ferramentas: ['Dashboards', 'Métricas', 'Relatórios', 'Pesquisa de mercado'] },
  { id: 'eventos', nome: 'Eventos', icon: 'fa-calendar-star', desc: 'Palestras, inscrições e gestão', lead: 'COO', equipe: ['CMO', 'CW'],
    ferramentas: ['Gestão de eventos', 'Palestras', 'Inscrições', 'Pós-evento'] },
  { id: 'produto', nome: 'Produto', icon: 'fa-cube', desc: 'Roadmap, specs e construção', lead: 'CPO', equipe: ['DP', 'DV', 'DS'],
    ferramentas: ['Roadmap', 'Specs', 'MVP', 'Curadoria'] },
  { id: 'tecnologia', nome: 'Tecnologia', icon: 'fa-microchip', desc: 'Arquitetura, deploy e integrações', lead: 'CTO', equipe: ['DV'],
    ferramentas: ['Arquitetura', 'Deploy', 'Integrações', 'Automações'] },
  { id: 'estrategia', nome: 'Estratégia', icon: 'fa-chess-king', desc: 'Decisões e direção da empresa', lead: 'CEO', equipe: ['CSO', 'CA'],
    ferramentas: ['Validação', 'Planejamento', 'Alocação', 'Síntese executiva'] },
]

export default function SetoresPage() {
  const router = useRouter()

  function falarCom(agentId: string) {
    router.push(`/dashboard/agentes?open=${agentId}`)
  }
  function criarPara(setor: Setor) {
    sessionStorage.setItem('factohub-tool-prefill', `Ferramenta para o setor de ${setor.nome} da FALC INC. Foco: ${setor.ferramentas.join(', ')}.`)
    router.push('/dashboard/criar')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Setores da Empresa"
        subtitle="Cada departamento com seu agente responsável — saiba com quem falar e o que cada um opera"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {SETORES.map((s, i) => {
          const lead = AGENTS_V2[s.lead]
          const leadColor = lead?.color ?? 'var(--accent)'
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card"
              style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              {/* header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${leadColor}15`, border: `1px solid ${leadColor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fa-solid ${s.icon}`} style={{ fontSize: 15, color: leadColor }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{s.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
              </div>

              {/* responsável */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Responsável — fale com</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${leadColor}18`, border: `1.5px solid ${leadColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: leadColor, flexShrink: 0 }}>{lead?.initial ?? s.lead}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{lead?.name ?? s.lead}</div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead?.role ?? ''}</div>
                  </div>
                  <button onClick={() => falarCom(s.lead)} style={{ fontSize: 10, fontWeight: 700, padding: '6px 11px', borderRadius: 7, background: leadColor, color: '#0a0a0a', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    Falar
                  </button>
                </div>
                {/* equipe */}
                {s.equipe.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>Equipe:</span>
                    {s.equipe.map(aid => {
                      const a = AGENTS_V2[aid]
                      return <div key={aid} title={a?.name ?? aid} onClick={() => falarCom(aid)} style={{ width: 22, height: 22, borderRadius: 6, background: `${a?.color ?? '#888'}18`, border: `1px solid ${a?.color ?? '#888'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7.5, fontWeight: 800, color: a?.color ?? '#888', cursor: 'pointer' }}>{a?.initial ?? aid.slice(0, 2)}</div>
                    })}
                  </div>
                )}
              </div>

              {/* ferramentas */}
              <div style={{ padding: '12px 16px', flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Ferramentas do setor</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {s.ferramentas.map(f => (
                    <span key={f} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{f}</span>
                  ))}
                </div>
              </div>

              {/* footer action */}
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                <button onClick={() => criarPara(s)} style={{ width: '100%', fontSize: 11, fontWeight: 700, padding: '8px', borderRadius: 7, background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 10, marginRight: 6, color: 'var(--accent)' }} />Criar ferramenta para {s.nome}
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
