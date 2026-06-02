-- Eventos + inscrições (lista de presença)
create table if not exists public.hub_eventos (
  id uuid primary key default gen_random_uuid(),
  empresa_id text not null,
  nome text not null,
  descricao text,
  data_evento timestamptz,
  local text,
  capacidade int default 0,
  status text default 'aberto',   -- aberto | encerrado
  created_at timestamptz default now()
);
create table if not exists public.hub_inscricoes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references public.hub_eventos(id) on delete cascade,
  empresa_id text not null,
  nome text not null,
  email text,
  telefone text,
  presente boolean default false,
  created_at timestamptz default now()
);

alter table public.hub_eventos enable row level security;
alter table public.hub_inscricoes enable row level security;

drop policy if exists "ev_all" on public.hub_eventos;
create policy "ev_all" on public.hub_eventos for all
  using (empresa_id = cast(auth.uid() as text) or empresa_id in (select cast(u.empresa_id as text) from public.usuarios u where u.id = auth.uid()))
  with check (empresa_id = cast(auth.uid() as text) or empresa_id in (select cast(u.empresa_id as text) from public.usuarios u where u.id = auth.uid()));

drop policy if exists "insc_select" on public.hub_inscricoes;
drop policy if exists "insc_insert" on public.hub_inscricoes;
drop policy if exists "insc_mod" on public.hub_inscricoes;
create policy "insc_select" on public.hub_inscricoes for select
  using (empresa_id = cast(auth.uid() as text) or empresa_id in (select cast(u.empresa_id as text) from public.usuarios u where u.id = auth.uid()));
create policy "insc_insert" on public.hub_inscricoes for insert with check (true); -- inscrição pública
create policy "insc_mod" on public.hub_inscricoes for update
  using (empresa_id = cast(auth.uid() as text) or empresa_id in (select cast(u.empresa_id as text) from public.usuarios u where u.id = auth.uid()));

create index if not exists idx_eventos_emp on public.hub_eventos(empresa_id, created_at desc);
create index if not exists idx_insc_ev on public.hub_inscricoes(evento_id);
