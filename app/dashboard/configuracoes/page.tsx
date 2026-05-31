'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

type Settings = {
  darkMode: boolean
  compactMode: boolean
  language: 'pt-BR' | 'en'
  autoInjectCerebro: boolean
  manualApproval: boolean
  saveLearning: boolean
  streaming: boolean
  defaultModel: string
  costAlerts: boolean
  costThreshold: number
  missionNotification: boolean
}

const DEFAULTS: Settings = {
  darkMode: true,
  compactMode: false,
  language: 'pt-BR',
  autoInjectCerebro: true,
  manualApproval: true,
  saveLearning: true,
  streaming: true,
  defaultModel: 'openai/gpt-4o-mini',
  costAlerts: false,
  costThreshold: 10,
  missionNotification: true,
}

const MODELS = [
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini — Rápido e econômico' },
  { value: 'openai/gpt-4o', label: 'GPT-4o — Mais capaz' },
  { value: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet 4.6 — Análises complexas' },
  { value: 'anthropic/claude-opus-4-6', label: 'Claude Opus 4.6 — Máxima capacidade' },
]

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: value ? 'var(--accent)' : 'var(--surface-3)',
        border: '1.5px solid ' + (value ? 'var(--accent)' : 'var(--border)'),
        position: 'relative', cursor: disabled ? 'default' : 'pointer',
        transition: 'all .2s', flexShrink: 0, padding: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: value ? 20 : 2,
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
      }} />
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        letterSpacing: '.06em', textTransform: 'uppercase',
      }}>
        {title}
      </div>
      <div style={{ padding: '4px 0' }}>
        {children}
      </div>
    </div>
  )
}

function Row({
  label, description, children,
}: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px', gap: 20,
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push('/auth'); return }
      setUser(u)
    })

    const stored = localStorage.getItem('fh_settings')
    if (stored) {
      try { setSettings({ ...DEFAULTS, ...JSON.parse(stored) as Partial<Settings> }) }
      catch { /* keep defaults */ }
    }
  }, [router])

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      localStorage.setItem('fh_settings', JSON.stringify(next))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      return next
    })
  }

  async function sair() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) : '—'

  return (
    <div style={{ padding: '20px', maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {saved && (
        <div style={{
          padding: '8px 14px', borderRadius: 8,
          background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.3)',
          fontSize: 12, color: '#10b981', fontWeight: 600,
        }}>
          <i className="fa-solid fa-check" style={{ marginRight: 6 }} />
          Configurações salvas automaticamente
        </div>
      )}

      {/* Aparência */}
      <Section title="Aparência">
        <Row label="Tema escuro" description="Interface escura para ambientes de trabalho">
          <Toggle value={settings.darkMode} onChange={v => update('darkMode', v)} disabled />
        </Row>
        <Row label="Modo compacto" description="Reduz o espaçamento para mais conteúdo na tela">
          <Toggle value={settings.compactMode} onChange={v => update('compactMode', v)} />
        </Row>
        <Row label="Idioma">
          <select
            value={settings.language}
            onChange={e => update('language', e.target.value as Settings['language'])}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '5px 10px', color: 'var(--text)',
              fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="pt-BR">Português (BR)</option>
            <option value="en">English</option>
          </select>
        </Row>
      </Section>

      {/* Sistema de IA */}
      <Section title="Sistema de IA">
        <Row label="Injetar Cérebro automaticamente" description="Todo agente recebe o contexto corporativo no system prompt">
          <Toggle value={settings.autoInjectCerebro} onChange={v => update('autoInjectCerebro', v)} />
        </Row>
        <Row label="Aprovação manual de missões" description="Revisar e aprovar antes de salvar no histórico">
          <Toggle value={settings.manualApproval} onChange={v => update('manualApproval', v)} />
        </Row>
        <Row label="Salvar aprendizado ao aprovar" description="Adicionar decisões aprovadas ao Cérebro automaticamente">
          <Toggle value={settings.saveLearning} onChange={v => update('saveLearning', v)} />
        </Row>
        <Row label="Streaming de respostas" description="Receber tokens em tempo real durante a execução">
          <Toggle value={settings.streaming} onChange={v => update('streaming', v)} />
        </Row>
        <Row label="Modelo padrão" description="Modelo usado para todos os agentes por padrão">
          <select
            value={settings.defaultModel}
            onChange={e => update('defaultModel', e.target.value)}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '5px 10px', color: 'var(--text)',
              fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
              maxWidth: 220,
            }}
          >
            {MODELS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </Row>
      </Section>

      {/* Alertas */}
      <Section title="Alertas">
        <Row label="Alertas de custo de IA" description="Receber aviso quando o gasto diário ultrapassar o threshold">
          <Toggle value={settings.costAlerts} onChange={v => update('costAlerts', v)} />
        </Row>
        <Row label="Threshold diário (USD)" description="Valor máximo diário antes do alerta">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>$</span>
            <input
              type="number"
              min={1}
              max={1000}
              value={settings.costThreshold}
              onChange={e => update('costThreshold', Number(e.target.value))}
              disabled={!settings.costAlerts}
              style={{
                width: 70, background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '5px 8px', color: 'var(--text)',
                fontSize: 12, fontFamily: 'inherit', outline: 'none',
                opacity: settings.costAlerts ? 1 : 0.4,
              }}
            />
          </div>
        </Row>
        <Row label="Notificação de missão concluída" description="Aviso visual quando a missão terminar">
          <Toggle value={settings.missionNotification} onChange={v => update('missionNotification', v)} />
        </Row>
      </Section>

      {/* Conta */}
      <Section title="Conta">
        <Row label="Email" description="Endereço de acesso ao FactorHub OS">
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {user?.email ?? '—'}
          </span>
        </Row>
        <Row label="Plano">
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
            background: 'var(--accent-dim)', color: 'var(--accent)',
          }}>
            FactorHub OS
          </span>
        </Row>
        <Row label="Membro desde">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{createdAt}</span>
        </Row>
        <div style={{ padding: '14px 20px', display: 'flex', gap: 10 }}>
          <button
            style={{
              padding: '8px 16px', borderRadius: 7,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--text)', fontWeight: 600,
            }}
            onClick={() => alert('Funcionalidade em breve')}
          >
            Alterar senha
          </button>
          <button
            style={{
              padding: '8px 16px', borderRadius: 7,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--text)', fontWeight: 600,
            }}
            onClick={() => alert('Exportação em breve')}
          >
            Exportar dados
          </button>
          <button
            onClick={sair}
            style={{
              padding: '8px 16px', borderRadius: 7,
              background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: '#ef4444', fontWeight: 700,
            }}
          >
            <i className="fa-solid fa-arrow-right-from-bracket" style={{ marginRight: 6 }} />
            Sair
          </button>
        </div>
      </Section>
    </div>
  )
}
