-- hub_cerebro: company identity injected into all agent system prompts
create table if not exists public.hub_cerebro (
  empresa_id        text primary key,
  -- IDENTIDADE
  nome_empresa      text,
  slogan            text,
  missao            text,
  visao             text,
  valores           text,
  -- PRODUTO
  produto_principal text,
  diferenciais      text,
  modelo_negocio    text,
  preco_medio       text,
  -- AUDIÊNCIA
  publico_alvo      text,
  dores_principais  text,
  objecoes          text,
  canais            text,
  -- DECISÕES
  metas             text,
  prioridades       text,
  restricoes        text,
  orcamento_mensal  text,
  -- meta
  updated_at        timestamptz default now()
);

alter table public.hub_cerebro enable row level security;

create policy "cerebro owner access" on public.hub_cerebro
  using (empresa_id = auth.uid()::text or empresa_id in (
    select empresa_id from public.usuarios where id = auth.uid()
  ))
  with check (empresa_id = auth.uid()::text or empresa_id in (
    select empresa_id from public.usuarios where id = auth.uid()
  ));
