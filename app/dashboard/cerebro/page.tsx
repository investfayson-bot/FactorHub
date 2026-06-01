'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { calcCerebroCompletion } from '@/lib/cerebro'
import type { CerebroRow } from '@/lib/cerebro'

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
  // DNA DO FUNDADOR (novo)
  dna_fundador: string
  // KNOWLEDGE VAULT (novo)
  knowledge_vault: string
  // PLAYBOOKS (novo)
  playbooks: string
}

const EMPTY: CerebroData = {
  nome_empresa: '', slogan: '', missao: '', visao: '', valores: '',
  produto_principal: '', diferenciais: '', modelo_negocio: '', preco_medio: '',
  publico_alvo: '', dores_principais: '', objecoes: '', canais: '',
  metas: '', prioridades: '', restricoes: '', orcamento_mensal: '',
  dna_fundador: '',
  knowledge_vault: '',
  playbooks: '',
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
  {
    id: 'dna',
    label: 'DNA',
    icon: 'fa-dna',
    color: '#dc2626',
    desc: 'Como você decide',
    fields: [
      {
        key: 'dna_fundador',
        label: 'DNA do Fundador — como você decide',
        placeholder: 'Valorizo velocidade com qualidade. Não aceito respostas genéricas. Busco oportunidades escondidas. Pergunta que sempre faço: se o dinheiro fosse meu, eu faria isso?',
        type: 'textarea-lg',
      },
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge Vault',
    icon: 'fa-vault',
    color: '#f59e0b',
    desc: 'Base de conhecimento',
    fields: [
      {
        key: 'knowledge_vault',
        label: 'Base de Conhecimento da Empresa',
        placeholder: 'Cole aqui: dados de mercado, relatórios, benchmarks, decisões históricas, lições aprendidas, análises aprovadas. Tudo que os agentes precisam saber sobre seu mercado e operação.',
        type: 'textarea-lg',
      },
    ],
  },
  {
    id: 'playbooks',
    label: 'Playbooks',
    icon: 'fa-book-open',
    color: '#10b981',
    desc: 'Processos aprovados',
    fields: [
      {
        key: 'playbooks',
        label: 'Playbooks e Processos Aprovados',
        placeholder: 'Descreva os processos que funcionam: como você vende, como contrata, como lança produto, como toma decisões de investimento. Estes processos serão seguidos pelos agentes.',
        type: 'textarea-lg',
      },
    ],
  },
]

function pct(data: CerebroData): number {
  return calcCerebroCompletion(data as unknown as CerebroRow)
}

export default function CerebroPage() {
  const [data, setData] = useState<CerebroData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [filling, setFilling] = useState(false)
  const [fillMsg, setFillMsg] = useState('')
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [promptText, setPromptText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const savingRef = useRef(false)
  const dataRef = useRef(data)
  useEffect(() => { dataRef.current = data }, [data])

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

  async function salvarCore(d: CerebroData): Promise<void> {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    const res = await fetch('/api/hub/cerebro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(d),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((json as { error?: string }).error ?? `Erro ${res.status}`)
  }

  async function salvar() {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setSaveError('')
    try {
      await salvarCore(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erro de conexão')
    } finally {
      setSaving(false)
      savingRef.current = false
    }
  }

  // Auto-save every 30s
  useEffect(() => {
    if (loading) return
    const id = setInterval(() => {
      void (async () => {
        if (savingRef.current) return
        savingRef.current = true
        try {
          await salvarCore(dataRef.current)
          setLastAutoSave(new Date())
        } catch { /* silent on auto-save */ }
        finally { savingRef.current = false }
      })()
    }, 30000)
    return () => clearInterval(id)
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fillWithAI(text: string) {
    setFilling(true)
    setFillMsg('Analisando com IA…')
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch('/api/hub/cerebro-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text }),
      })
      const json = await res.json()
      if (json.filled) {
        setData(d => {
          const updated = { ...d }
          for (const key of Object.keys(json.filled) as (keyof CerebroData)[]) {
            if (json.filled[key] && String(json.filled[key]).trim()) {
              updated[key] = json.filled[key]
            }
          }
          return updated
        })
        setFillMsg('Preenchido! Revise e salve.')
        setTimeout(() => setFillMsg(''), 5000)
      } else {
        setFillMsg(json.error ?? 'Erro ao preencher')
        setTimeout(() => setFillMsg(''), 4000)
      }
    } catch {
      setFillMsg('Erro de conexão')
      setTimeout(() => setFillMsg(''), 3000)
    } finally {
      setFilling(false)
    }
  }

  async function handleFileUpload(file: File) {
    setFilling(true)
    setFillMsg('Extraindo texto do arquivo…')
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/hub/extract-text', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      const json = await res.json()
      if (json.text) {
        await fillWithAI(json.text)
      } else {
        setFillMsg(json.error ?? 'Falha na extração')
        setFilling(false)
        setTimeout(() => setFillMsg(''), 4000)
      }
    } catch {
      setFillMsg('Erro no upload')
      setFilling(false)
    }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Fill / save status */}
            <AnimatePresence>
              {fillMsg && (
                <motion.span key="fill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ fontSize: 11, color: fillMsg.includes('Erro') ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
                  {fillMsg}
                </motion.span>
              )}
              {saveError && !fillMsg && (
                <motion.span key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 4 }} />Erro: {saveError}
                </motion.span>
              )}
              {saved && !saveError && !fillMsg && (
                <motion.span key="saved" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>
                  <i className="fa-solid fa-check" style={{ marginRight: 4 }} />Salvo com sucesso
                </motion.span>
              )}
              {lastAutoSave && !saved && !saveError && !fillMsg && (
                <motion.span key="auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                  Auto-salvo {lastAutoSave.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Upload file */}
            <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.csv" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = '' }} />

            <motion.button
              className="btn btn-ghost"
              onClick={() => fileRef.current?.click()}
              disabled={filling}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              title="Fazer upload de PDF/TXT e preencher automaticamente"
              style={{ fontSize: 12, gap: 6 }}
            >
              {filling
                ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 10 }} />Analisando...</>
                : <><i className="fa-solid fa-upload" style={{ fontSize: 10 }} />Upload + IA</>
              }
            </motion.button>

            <motion.button
              className="btn btn-ghost"
              onClick={() => setShowPromptModal(true)}
              disabled={filling}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              title="Colar texto e preencher automaticamente"
              style={{ fontSize: 12, gap: 6 }}
            >
              <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 10 }} />Colar + IA
            </motion.button>

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

        {/* Completion indicator — minimal, inline with title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          {[...Array(10)].map((_, i) => (
            <div key={i} style={{ width: 16, height: 3, borderRadius: 2, background: i < Math.round(completion / 10) ? 'var(--accent)' : 'var(--surface-2)', transition: 'background .4s' }} />
          ))}
          <span style={{ fontSize: 10, color: completion < 40 ? '#ef4444' : completion < 70 ? '#f59e0b' : '#22c55e', fontWeight: 700, marginLeft: 4 }}>{completion}%</span>
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
                  {field.type === 'input' ? (
                    <input
                      className="form-input"
                      placeholder={field.placeholder}
                      value={data[field.key as keyof CerebroData]}
                      onChange={e => setData(d => ({ ...d, [field.key]: e.target.value }))}
                    />
                  ) : (
                    <textarea
                      className="form-input"
                      rows={field.type === 'textarea-lg' ? 12 : 3}
                      placeholder={field.placeholder}
                      value={data[field.key as keyof CerebroData]}
                      onChange={e => setData(d => ({ ...d, [field.key]: e.target.value }))}
                      style={{ resize: 'vertical', fontFamily: field.type === 'textarea-lg' ? 'inherit' : undefined }}
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

      {/* Prompt modal */}
      <AnimatePresence>
        {showPromptModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 100,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
            onClick={e => { if (e.target === e.currentTarget) setShowPromptModal(false) }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              style={{
                background: 'var(--surface)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 600,
                border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>Preencher Cérebro com IA</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                    Cole qualquer texto: pitch, email, entrevista, descrição da empresa, transcrição…
                  </div>
                </div>
                <button onClick={() => setShowPromptModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18 }}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              <textarea
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
                placeholder="Cole aqui qualquer texto sobre a empresa. A IA vai extrair e preencher cada seção automaticamente, sem sobrescrever campos já preenchidos."
                rows={10}
                style={{
                  width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: 14, fontSize: 13, color: 'var(--foreground)',
                  resize: 'vertical', outline: 'none', lineHeight: 1.6, fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowPromptModal(false)}>Cancelar</button>
                <motion.button
                  className="btn btn-primary"
                  disabled={!promptText.trim() || filling}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setShowPromptModal(false); fillWithAI(promptText) }}
                  style={{ gap: 6 }}
                >
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 11 }} />
                  Preencher com IA
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
{[
  '[CÉREBRO CORPORATIVO]',
  data.nome_empresa ? `Empresa: ${data.nome_empresa}` : '',
  data.slogan ? `Slogan: ${data.slogan}` : '',
  data.missao ? `Missão: ${data.missao.slice(0, 80)}${data.missao.length > 80 ? '...' : ''}` : '',
  data.produto_principal ? `Produto: ${data.produto_principal}` : '',
  data.publico_alvo ? `ICP: ${data.publico_alvo.slice(0, 60)}...` : '',
  data.metas ? `Metas: ${data.metas.slice(0, 60)}...` : '',
  data.dna_fundador ? `DNA: ${data.dna_fundador.slice(0, 80)}...` : '',
  data.knowledge_vault ? `[BASE DE CONHECIMENTO — ${data.knowledge_vault.length} chars]` : '',
  data.playbooks ? `[PLAYBOOKS — ${data.playbooks.length} chars]` : '',
  '',
  '[REGRAS FUNDAMENTAIS]',
  'Evidence First · Zero Genérico · Think Beyond · Mentalidade de Dono · Execução Obrigatória',
  '',
  '[PERFIL DO AGENTE]',
  '[system prompt específico do agente...]',
].filter(Boolean).join('\n')}
          </div>
        </motion.div>
      )}
    </div>
  )
}
