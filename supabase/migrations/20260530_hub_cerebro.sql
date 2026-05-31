-- hub_cerebro: company identity injected into all agent system prompts
create table if not exists public.hub_cerebro (
  empresa_id        text primary key,
  nome_empresa      text,
  slogan            text,
  missao            text,
  visao             text,
  valores           text,
  produto_principal text,
  diferenciais      text,
  modelo_negocio    text,
  preco_medio       text,
  publico_alvo      text,
  dores_principais  text,
  objecoes          text,
  canais            text,
  metas             text,
  prioridades       text,
  restricoes        text,
  orcamento_mensal  text,
  updated_at        timestamptz default now()
);

alter table public.hub_cerebro enable row level security;

drop policy if exists "cerebro owner access" on public.hub_cerebro;
drop policy if exists "cerebro_select" on public.hub_cerebro;
drop policy if exists "cerebro_insert" on public.hub_cerebro;
drop policy if exists "cerebro_update" on public.hub_cerebro;

create policy "cerebro_select" on public.hub_cerebro
  for select using (
    empresa_id = cast(auth.uid() as text)
    or empresa_id in (select u.empresa_id from public.usuarios u where u.id = auth.uid())
  );

create policy "cerebro_insert" on public.hub_cerebro
  for insert with check (
    empresa_id = cast(auth.uid() as text)
    or empresa_id in (select u.empresa_id from public.usuarios u where u.id = auth.uid())
  );

create policy "cerebro_update" on public.hub_cerebro
  for update using (
    empresa_id = cast(auth.uid() as text)
    or empresa_id in (select u.empresa_id from public.usuarios u where u.id = auth.uid())
  );
