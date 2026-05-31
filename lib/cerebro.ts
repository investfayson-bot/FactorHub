import { SupabaseClient } from '@supabase/supabase-js'
import { AgentV2 } from './agents-v2'

export type CerebroRow = {
  empresa_id: string
  // Identidade
  nome_empresa?: string
  slogan?: string
  missao?: string
  visao?: string
  valores?: string
  // Produto
  produto_principal?: string
  diferenciais?: string
  modelo_negocio?: string
  preco_medio?: string
  // Audiência
  publico_alvo?: string
  dores_principais?: string
  objecoes?: string
  canais?: string
  // Decisões
  metas?: string
  prioridades?: string
  restricoes?: string
  orcamento_mensal?: string
  // DNA (novo)
  dna_fundador?: string
  // Knowledge Vault (novo)
  knowledge_vault?: string
  // Playbooks (novo)
  playbooks?: string
  // Memória corporativa (auto-gerado)
  memoria_corporativa?: string
  licoes_aprendidas?: string
}

const GLOBAL_RULES = `
[REGRAS FUNDAMENTAIS — TODOS OS AGENTES DEVEM SEGUIR]

REGRA 1 — EVIDENCE FIRST: Nunca faça afirmações sem evidência ou estimativa fundamentada. Se não tem o dado, estime com metodologia explícita e sinalize "estimativa".

REGRA 2 — ZERO RESPOSTAS GENÉRICAS: Proibido usar "mercado competitivo", "boa oportunidade", "alta demanda" sem qualificar com números reais.
- Errado: "O mercado está crescendo"
- Correto: "O mercado B2B SaaS BR cresceu 22% em 2024, TAM de ~R$8B"

REGRA 3 — THINK BEYOND THE REQUEST: Entregue X + o que o fundador precisava saber mas não sabia que precisava perguntar. A pergunta não feita frequentemente é a mais importante.

REGRA 4 — MENTALIDADE DE DONO: Aja como sócio, não como funcionário. Pergunta obrigatória interna: "Se o dinheiro fosse meu, eu faria isso?" Se não, revise a recomendação.

REGRA 5 — EXECUÇÃO OBRIGATÓRIA: Toda análise termina com próximos passos concretos (ação, responsável, prazo, risco principal, impacto esperado). Análise sem ação é teoria.

REGRA 6 — PROFUNDIDADE DE PRIMEIROS PRINCÍPIOS: Quebre todo problema em (1) objetivo real, (2) restrições existentes, (3) evidências disponíveis, (4) alternativas possíveis, (5) solução recomendada com justificativa.
`.trim()

export async function getCerebroContext(
  empresaId: string,
  supabase: SupabaseClient
): Promise<{ raw: CerebroRow | null; formatted: string; completionPct: number }> {
  const { data } = await supabase
    .from('hub_cerebro')
    .select('*')
    .eq('empresa_id', empresaId)
    .maybeSingle()

  const raw = data as CerebroRow | null
  if (!raw) {
    return {
      raw: null,
      formatted: '[CÉREBRO CORPORATIVO]\nNenhum contexto configurado. Opere com base nas informações fornecidas na missão.',
      completionPct: 0,
    }
  }

  const lines: string[] = ['[CÉREBRO CORPORATIVO]']

  if (raw.nome_empresa) lines.push(`Empresa: ${raw.nome_empresa}`)
  if (raw.slogan) lines.push(`Slogan: ${raw.slogan}`)
  if (raw.missao) lines.push(`Missão: ${raw.missao}`)
  if (raw.visao) lines.push(`Visão: ${raw.visao}`)
  if (raw.valores) lines.push(`Valores: ${raw.valores}`)

  if (raw.produto_principal) lines.push(`\nProduto principal: ${raw.produto_principal}`)
  if (raw.diferenciais) lines.push(`Diferenciais: ${raw.diferenciais}`)
  if (raw.modelo_negocio) lines.push(`Modelo de negócio: ${raw.modelo_negocio}`)
  if (raw.preco_medio) lines.push(`Ticket médio: ${raw.preco_medio}`)

  if (raw.publico_alvo) lines.push(`\nPúblico-alvo (ICP): ${raw.publico_alvo}`)
  if (raw.dores_principais) lines.push(`Dores principais: ${raw.dores_principais}`)
  if (raw.objecoes) lines.push(`Objeções comuns: ${raw.objecoes}`)
  if (raw.canais) lines.push(`Canais de aquisição: ${raw.canais}`)

  if (raw.metas) lines.push(`\nMetas atuais: ${raw.metas}`)
  if (raw.prioridades) lines.push(`Prioridades: ${raw.prioridades}`)
  if (raw.restricoes) lines.push(`Restrições: ${raw.restricoes}`)
  if (raw.orcamento_mensal) lines.push(`Orçamento mensal: ${raw.orcamento_mensal}`)

  if (raw.dna_fundador) lines.push(`\nDNA do Fundador: ${raw.dna_fundador}`)

  if (raw.knowledge_vault) lines.push(`\n[BASE DE CONHECIMENTO]\n${raw.knowledge_vault}`)
  if (raw.playbooks) lines.push(`\n[PLAYBOOKS APROVADOS]\n${raw.playbooks}`)

  if (raw.memoria_corporativa) lines.push(`\n[MEMÓRIA CORPORATIVA]\n${raw.memoria_corporativa}`)
  if (raw.licoes_aprendidas) lines.push(`\n[LIÇÕES APRENDIDAS]\n${raw.licoes_aprendidas}`)

  const completionPct = calcCerebroCompletion(raw)

  return {
    raw,
    formatted: lines.join('\n'),
    completionPct,
  }
}

export function calcCerebroCompletion(raw: CerebroRow): number {
  const checks = [
    { value: raw.missao, minChars: 200, weight: 20 },
    { value: raw.produto_principal, minChars: 200, weight: 20 },
    { value: raw.publico_alvo, minChars: 150, weight: 20 },
    { value: raw.metas, minChars: 150, weight: 15 },
    { value: raw.dna_fundador, minChars: 100, weight: 10 },
    { value: raw.nome_empresa, minChars: 3, weight: 5 },
    { value: raw.diferenciais, minChars: 100, weight: 5 },
    { value: raw.knowledge_vault, minChars: 100, weight: 3 },
    { value: raw.playbooks, minChars: 100, weight: 2 },
  ]

  let total = 0
  for (const c of checks) {
    if (c.value && c.value.length >= c.minChars) total += c.weight
    else if (c.value && c.value.length > 0) total += c.weight * (c.value.length / c.minChars)
  }

  return Math.min(100, Math.round(total))
}

export function buildSystemPrompt(
  cerebroFormatted: string,
  agent: AgentV2,
  handoffContext?: string
): string {
  const parts: string[] = []

  parts.push(cerebroFormatted)
  parts.push('')
  parts.push(GLOBAL_RULES)
  parts.push('')
  parts.push(`[PERFIL DO AGENTE]`)
  parts.push(`Você é: ${agent.name}`)
  parts.push(`Camada: ${agent.layerLabel} (${agent.layer})`)
  parts.push(`Função: ${agent.role}`)
  parts.push('')
  parts.push(agent.systemPrompt)

  if (handoffContext) {
    parts.push('')
    parts.push('[CONTEXTO DA CADEIA — OUTPUT DOS AGENTES ANTERIORES]')
    parts.push(handoffContext)
  }

  return parts.join('\n')
}

export function buildHandoffContext(
  originalMission: string,
  steps: Array<{ agentId: string; agentName: string; layer: string; output: string }>
): string {
  if (!steps.length) return `MISSÃO ORIGINAL: ${originalMission}`

  const lines: string[] = [`MISSÃO ORIGINAL: ${originalMission}`, '']

  const grouped: Record<string, typeof steps> = {}
  for (const s of steps) {
    if (!grouped[s.layer]) grouped[s.layer] = []
    grouped[s.layer].push(s)
  }

  for (const [layer, layerSteps] of Object.entries(grouped)) {
    lines.push(`--- ${layer} ---`)
    for (const s of layerSteps) {
      lines.push(`[${s.agentName}]:`)
      // Truncate very long outputs to keep context manageable
      const out = s.output.length > 2000 ? s.output.slice(0, 2000) + '...[truncado]' : s.output
      lines.push(out)
      lines.push('')
    }
  }

  return lines.join('\n')
}
