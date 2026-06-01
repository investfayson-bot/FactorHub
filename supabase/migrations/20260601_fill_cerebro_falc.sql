-- ============================================================
-- Preenche o Cérebro da FALC INC ~100%
-- Resolve o empresa_id pelo email do fundador automaticamente.
-- Seguro re-rodar (ON CONFLICT atualiza).
-- ============================================================

INSERT INTO public.hub_cerebro (
  empresa_id, nome_empresa, slogan, missao, visao, valores,
  produto_principal, diferenciais, modelo_negocio, preco_medio,
  publico_alvo, dores_principais, objecoes, canais,
  metas, prioridades, restricoes, orcamento_mensal,
  dna_fundador, knowledge_vault, playbooks, updated_at
)
SELECT
  COALESCE(u.empresa_id::text, au.id::text),

  -- IDENTIDADE
  'FALC INC',
  'Construímos sistemas que se gerenciam sozinhos.',
  'Construir um ecossistema de produtos SaaS verticais (financeiro, imobiliário, pessoal) operados e escalados por agentes de IA, eliminando o trabalho operacional repetitivo de empresas brasileiras e devolvendo tempo e clareza de decisão aos fundadores.',
  'Ser a holding de software que prova que uma pessoa com agentes de IA bem orquestrados produz como uma empresa de 50 pessoas. Em 5 anos, 3+ produtos lucrativos rodando majoritariamente com agentes, e o FactorHub licenciado para outras empresas operarem do mesmo jeito.',
  'Velocidade com qualidade · Execução acima de teoria · Mentalidade de dono · Dados acima de opinião · Autonomia · Zero genérico',

  -- PRODUTO
  'FactorHub OS — sistema operacional de 26 agentes de IA que criam, gerenciam e executam as ferramentas e operações dos produtos da FALC INC (FactorOne, LifeOS, VN Prime). Os agentes rodam missões em cadeia (N1 a N5) e entregam análise + execução.',
  'Orquestração de 26 agentes em 5 camadas (Conselho, Pesquisa, Diretores, Especialistas, Chief of Staff) com handoff entre eles. Cérebro corporativo injetado no contexto de todos. Modelo por camada (Sonnet para decisão, Haiku para execução) cortando 50-60% de custo. Cada produto vira um cliente das ferramentas que o próprio Hub constrói.',
  'Holding com múltiplos SaaS: assinatura mensal por produto (FactorOne, futuramente VN Prime e LifeOS) + o FactorHub licenciado como plataforma de operação por agentes. Receita também por ferramentas construídas sob demanda para cada produto.',
  'FactorOne: assinatura PME (faixa R$200–800/mês). Consultoria/implantação sob demanda. VN Prime: SaaS imobiliário + success fee. FactorHub: licença de plataforma (a definir).',

  -- AUDIÊNCIA
  'Founders e PMEs brasileiras (5–50 funcionários, faturamento R$1M–R$20M) que precisam de gestão financeira, comercial e operacional sem montar um time grande. No imobiliário: imobiliárias premium e corretores autônomos de alto padrão (BH/Nova Lima via VN Prime). No pessoal: o próprio founder e profissionais ocupados (LifeOS).',
  'Falta de visão financeira em tempo real · Equipe pequena sobrecarregada com tarefa operacional · Marketing sem resultado mensurável · Ferramentas desconexas que não conversam · Decisões tomadas no escuro, sem dado · Tempo do dono consumido por execução em vez de estratégia.',
  'É caro demais · Não tenho tempo de implementar · Já tentei outras ferramentas e não funcionou · IA não entende meu negócio · Vou perder o controle se automatizar · Meus dados estão seguros?',
  'Indicação e network direto · Instagram e LinkedIn do fundador · Conteúdo técnico (cases reais) · Eventos e hackathons (GovTech, HackaConecta) · Parcerias (VN Prime via parceiro corretor) · Venda consultiva 1:1.',

  -- DECISÕES
  'Q3 2026: (1) VN Prime — finalizar auditoria N4 e construir o primeiro conjunto de ferramentas (CRM, agendamento, marketing, métricas). (2) FactorHub — sistema 100% redondo e sem bugs para operar os produtos. (3) FactorOne — destravar pendências (Pluggy, IR, app). Meta: provar o modelo "FactorHub cria ferramenta → produto paga por ela" com pelo menos 1 produto.',
  '1. FactorHub estável e confiável (base de tudo). 2. VN Prime no ar com ferramentas reais. 3. FactorOne monetizando. 4. Documentar o playbook para replicar nos outros produtos.',
  'Operação enxuta (fundador + agentes, sem time grande) · Orçamento de IA controlado (modelo por camada, cache) · Tempo é o recurso mais escasso · Não dispersar: terminar VN Prime antes de abrir nova frente.',
  'IA/ferramentas: alvo R$300–600/mês (OpenRouter via FactorHub, modelo por camada + cache para conter). Infra: Supabase + Vercel (custo baixo). Investimento sob demanda em campanhas quando um produto provar tração.',

  -- DNA
  'Sou empreendedor tech, founder/product owner — não dev puro, mas colaboro lado a lado na construção. Valorizo velocidade COM qualidade: prefiro entregar e iterar a planejar demais. Não aceito resposta genérica nem "depende" sem números. Busco a oportunidade escondida que os outros não viram. Pergunta que sempre faço: "se o dinheiro fosse meu, eu faria isso?" — e é, então faço. Gosto de muita informação, visão completa, tudo clicável e mensurável. Odeio retrabalho e bug. Quero full commitment: as coisas funcionando 100% antes de escalar. Estética importa: limpo, denso, profissional (referência Supabase/Linear/Power BI).',

  -- KNOWLEDGE VAULT
  'STACK PADRÃO FALC INC: Next.js + Supabase (Postgres+Auth+RLS+Storage) + Vercel + OpenRouter (modelo por camada: Sonnet C1, Haiku resto) + Resend. Multi-tenant por empresa_id (UUID da empresa, nunca user.id direto). RLS sempre ativa; escritas server-side usam service-role admin client.

PRODUTOS:
- FactorOne (factorone-mvp2): Finance OS B2B completo — caixa, DRE, NF-e/NFS-e, contas pagar/receber, equipe, fornecedores, CRM, logística, AI CFO, módulo PF. 12 sprints entregues. Pendente: Pluggy Open Finance, IR 2024, app mobile.
- VN Prime (vn-prime-imoveis): plataforma imobiliária premium BH/Nova Lima. No ar (Next.js 14 + Supabase + Leaflet). Tabelas: profiles, imoveis, leads, corretores. 3 planos (Venda Direta R$297, Assistida 3%, Completa 6%). Bugs conhecidos: CTA Venda Completa sem link, FAQ due-diligence não renderiza, fotos placeholder Unsplash.
- LifeOS: assessor pessoal com IA (conceito) — finanças, agenda, metas, OCR, WhatsApp.
- FactorHub: este sistema — 26 agentes, missões N1-N5, cérebro, live monitor.

REGRAS DE OURO: nunca mencionar "Claude" em UI/relatórios (usar FactorHub/FactorOne IA). Sem emojis em relatórios. Evidence-first, zero genérico, mentalidade de dono, execução obrigatória com próximos passos.',

  -- PLAYBOOKS
  'COMO LANÇAMOS UM PRODUTO/FERRAMENTA: 1) Missão N4 de auditoria + estratégia no FactorHub. 2) Chief of Staff sintetiza roadmap de 90 dias. 3) Construir em sprints pequenos, verificar cada edit antes de aplicar. 4) Deploy contínuo (git push → Vercel). 5) Testar funcional (sem bug) antes de escalar.

COMO DECIDIMOS INVESTIR: passa no teste "se o dinheiro fosse meu, eu faria?". Priorizar o que destrava receita ou prova o modelo. Não abrir frente nova sem terminar a atual.

COMO VENDEMOS: venda consultiva, mostrar resultado/dado concreto, quebrar objeção de preço com ROI, "só paga se funcionar" quando possível (modelo VN Prime).

COMO TRABALHAMOS COM AGENTES: missão sempre com entregável claro e critério de conclusão. Modelo por camada para conter custo. Cérebro sempre preenchido para contexto. Output revisado pelo fundador antes de aprovar.

PADRÃO DE QUALIDADE: layout limpo estilo Supabase (preto/cinza/verde), tudo clicável e interativo, dashboards densos com gráfico+métrica, zero azul berrante, full commitment com funcionamento 100%.',

  now()
FROM auth.users au
LEFT JOIN public.usuarios u ON u.id = au.id
WHERE au.email = 'invest.fayson@gmail.com'
ON CONFLICT (empresa_id) DO UPDATE SET
  nome_empresa = EXCLUDED.nome_empresa,
  slogan = EXCLUDED.slogan,
  missao = EXCLUDED.missao,
  visao = EXCLUDED.visao,
  valores = EXCLUDED.valores,
  produto_principal = EXCLUDED.produto_principal,
  diferenciais = EXCLUDED.diferenciais,
  modelo_negocio = EXCLUDED.modelo_negocio,
  preco_medio = EXCLUDED.preco_medio,
  publico_alvo = EXCLUDED.publico_alvo,
  dores_principais = EXCLUDED.dores_principais,
  objecoes = EXCLUDED.objecoes,
  canais = EXCLUDED.canais,
  metas = EXCLUDED.metas,
  prioridades = EXCLUDED.prioridades,
  restricoes = EXCLUDED.restricoes,
  orcamento_mensal = EXCLUDED.orcamento_mensal,
  dna_fundador = EXCLUDED.dna_fundador,
  knowledge_vault = EXCLUDED.knowledge_vault,
  playbooks = EXCLUDED.playbooks,
  updated_at = now();
