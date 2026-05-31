'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

type CerebroData = {
  // IDENTIDADE
  nome_empresa: string
  slogan: string
  missao: string
  visao: string
  valores: string
  // PRODUTO
  produto_principal: string
  diferenciais: string
  modelo_negocio: string
  preco_medio: string
  // AUDIÊNCIA
  publico_alvo: string
  dores_principais: string
  objecoes: string
  canais: string
  // DECISÕES
  metas: string
  prioridades: string
  restricoes: string
  orcamento_mensal: string
}

const EMPTY: CerebroData = {
  nome_empresa: '', slogan: '', missao: '', visao: '', valores: '',
  produto_principal: '', diferenciais: '', modelo_negocio: '', preco_medio: '',
  publico_alvo: '', dores_principais: '', objecoes: '', canais: '',
  metas: '', prioridades: '', restricoes: '', orcamento_mensal: '',
}

const LAYERS = [
  {
    id: 'identidade',
    label: 'Identidade',
    icon: 'fa-fingerprint',
    color: '#e8622a',
    desc: 'Quem você é',
    fields: [
      { key: 'nome_empresa', label: 'Nome da empresa', placeholder: 'Ex: FactorHub', type: 'input' },
      { key: 'slogan', label: 'Slogan / Tagline', placeholder: 'Ex: Agentes de IA para empresários sérios', type: 'input' },
      { key: 'missao', label: 'Missão', placeholder: 'Por que a empresa existe?', type: 'textarea' },
      { key: 'visao', label: 'Visão', placeholder: 'Onde quer chegar em 5–10 anos?', type: 'textarea' },
      { key: 'valores', label: 'Valores', placeholder: 'Ex: Clareza, Execução, Resultado', type: 'input' },
    ],
  },
  {
    id: 'produto',
    label: 'Produto',
    icon: 'fa-box',
    color: '#2563EB',
    desc: 'O que você vende',
    fields: [
      { key: 'produto_principal', label: 'Produto / Serviço principal', placeholder: 'Ex: SaaS de gestão + consultoria estratégica', type: 'input' },
      { key: 'diferenciais', label: 'Diferenciais competitivos', placeholder: 'O que você faz que ninguém faz igual?', type: 'textarea' },
      { key: 'modelo_negocio', label: 'Modelo de negócio', placeholder: 'Ex: Assinatura mensal + evento anual + imóveis', type: 'input' },
      { key: 'preco_medio', label: 'Ticket médio / Faixa de preço', placeholder: 'Ex: R$500/mês SaaS, R$15k consultoria', type: 'input' },
    ],
  },
  {
    id: 'audiencia',
    label: 'Audiência',
    icon: 'fa-users',
    color: '#7C3AED',
    desc: 'Para quem você vende',
    fields: [
      { key: 'publico_alvo', label: 'ICP — Cliente Ideal', placeholder: 'Ex: Empresário com 5–50 funcionários, faturamento R$1M–R$20M', type: 'textarea' },
      { key: 'dores_principais', label: 'Dores principais', placeholder: 'Ex: Sem visão financeira, equipe desorganizada, marketing sem resultado', type: 'textarea' },
      { key: 'objecoes', label: 'Principais objeções', placeholder: 'Ex: Caro demais, não tenho tempo, já tentei antes', type: 'textarea' },
      { key: 'canais', label: 'Canais de aquisição', placeholder: 'Ex: Instagram, LinkedIn, indicação, eventos presenciais', type: 'input' },
    ],
  },
  {
    id: 'decisoes',
    label: 'Decisões',
    icon: 'fa-bullseye',
    color: '#0D9488',
    desc: 'O que importa agora',
    fields: [
      { key: 'metas', label: 'Metas do trimestre', placeholder: 'Ex: 50 novos clientes, R$200k MRR, lançar FactorOne', type: 'textarea' },
      { key: 'prioridades', label: 'Prioridades absolutas', placeholder: 'Em ordem: 1. 2. 3.', type: 'textarea' },
      { key: 'restricoes', label: 'Restrições e limites', placeholder: 'Ex: Sem capital para contratação, equipe de 3 pessoas', type: 'input' },
      { key: 'orcamento_mensal', label: 'Orçamento mensal para IA/ferramentas', placeholder: 'Ex: R$2.000/mês', type: 'input' },
    ],
  },
]

function pct(data: CerebroData): number {
  const vals = Object.values(data).filter(Boolean)
  return Math.round((vals.length / Object.keys(EMPTY).length) * 100)
}

export default function CerebroPage() {
  const [data, setData] = useState<CerebroData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const token = (await supabase.auth.getSession()).data.session?.access_token
    const res = await fetch('/api/hub/cerebro', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const payload = await res.json().catch(() => ({ cerebro: null }))
    if (payload.cerebro) {
      setData({ ...EMPTY, ...payload.cerebro as Partial<CerebroData> })
    }
    setLoading(false)
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  async function salvar() {
    setSaving(true)
    const token = (await supabase.auth.getSession()).data.session?.access_token
    await fetch('/api/hub/cerebro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const layer = LAYERS[activeTab]
  const completion = pct(data)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Cerebro — Identidade da Empresa</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              Estas informações são injetadas no contexto de todos os agentes automaticamente.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AnimatePresence>
              {saved && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}
                >
                  <i className="fa-solid fa-check" style={{ marginRight: 4 }} />Salvo
                </motion.span>
              )}
            </AnimatePresence>
            <motion.button
              className="btn btn-primary"
              onClick={() => void salvar()}
              disabled={saving}
              whileHover={!saving ? { scale: 1.02 } : {}}
              whileTap={!saving ? { scale: 0.97 } : {}}
            >
              {saving ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 11 }} />Salvando...</> : <><i className="fa-solid fa-floppy-disk" style={{ fontSize: 11 }} />Salvar Cerebro</>}
            </motion.button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completion}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', background: 'var(--accent)', borderRadius: 2 }}
            />
          </div>
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, minWidth: 32 }}>{completion}%</span>
        </div>
      </motion.div>

      {/* Layer tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {LAYERS.map((l, i) => (
          <motion.button
            key={l.id}
            onClick={() => setActiveTab(i)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              background: activeTab === i ? `${l.color}18` : 'var(--surface-2)',
              border: `0.5px solid ${activeTab === i ? l.color + '60' : 'var(--border)'}`,
              transition: 'all .15s',
            }}
          >
            <i className={`fa-solid ${l.icon}`} style={{ fontSize: 11, color: activeTab === i ? l.color : 'var(--text-muted)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: activeTab === i ? l.color : 'var(--text-muted)' }}>{l.label}</span>
            <span style={{ fontSize: 9.5, color: 'var(--text-dim)' }}>{l.desc}</span>
          </motion.button>
        ))}
      </div>

      {/* Layer form */}
      {loading ? (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <motion.div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="card"
            style={{ padding: 24 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${layer.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fa-solid ${layer.icon}`} style={{ fontSize: 15, color: layer.color }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{layer.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{layer.desc}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {layer.fields.map((field) => (
                <div key={field.key}>
                  <label className="form-label">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder={field.placeholder}
                      value={data[field.key as keyof CerebroData]}
                      onChange={e => setData(d => ({ ...d, [field.key]: e.target.value }))}
                      style={{ resize: 'vertical' }}
                    />
                  ) : (
                    <input
                      className="form-input"
                      placeholder={field.placeholder}
                      value={data[field.key as keyof CerebroData]}
                      onChange={e => setData(d => ({ ...d, [field.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Navigation buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <motion.button
                className="btn btn-ghost"
                onClick={() => setActiveTab(i => Math.max(0, i - 1))}
                disabled={activeTab === 0}
                whileHover={activeTab > 0 ? { x: -2 } : {}}
                style={{ opacity: activeTab === 0 ? 0.3 : 1 }}
              >
                <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }} />Anterior
              </motion.button>
              {activeTab < LAYERS.length - 1 ? (
                <motion.button
                  className="btn btn-primary"
                  onClick={() => setActiveTab(i => Math.min(LAYERS.length - 1, i + 1))}
                  whileHover={{ x: 2 }}
                >
                  Próximo<i className="fa-solid fa-arrow-right" style={{ fontSize: 11 }} />
                </motion.button>
              ) : (
                <motion.button
                  className="btn btn-primary"
                  onClick={() => void salvar()}
                  disabled={saving}
                  whileHover={!saving ? { scale: 1.02 } : {}}
                >
                  <i className="fa-solid fa-brain" style={{ fontSize: 11 }} />
                  {saving ? 'Salvando...' : 'Salvar tudo'}
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Preview */}
      {completion > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
          style={{ padding: 18 }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>
            Preview — O que os agentes recebem
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.8, background: 'var(--surface-2)', borderRadius: 8, padding: 14, border: '0.5px solid var(--border)', whiteSpace: 'pre-wrap' }}>
{`=== CONTEXTO DA EMPRESA (Cerebro) ===${data.nome_empresa ? `\nEmpresa: ${data.nome_empresa}` : ''}${data.slogan ? `\nSlogan: ${data.slogan}` : ''}${data.missao ? `\nMissão: ${data.missao}` : ''}${data.produto_principal ? `\nProduto principal: ${data.produto_principal}` : ''}${data.publico_alvo ? `\nPúblico-alvo: ${data.publico_alvo}` : ''}${data.diferenciais ? `\nDiferenciais: ${data.diferenciais}` : ''}${data.metas ? `\nMetas atuais: ${data.metas}` : ''}${data.restricoes ? `\nRestrições: ${data.restricoes}` : ''}
=== FIM DO CONTEXTO ===

[system prompt do agente selecionado...]`}
          </div>
        </motion.div>
      )}
    </div>
  )
}
