-- Eventos + inscrições (lista de presença)
-- RLS permissiva: isolamento por empresa_id é garantido pela API (admin client + filtro).
create table if not exists public.hub_eventos (
  id uuid primary key default gen_random_uuid(),
  empresa_id text not null,
  nome text not null,
  descricao text,
  data_evento timestamptz,
  local text,
  capacidade int default 0,
  status text default 'aberto',
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
drop policy if exists "insc_all" on public.hub_inscricoes;
create policy "ev_all" on public.hub_eventos for all using (true) with check (true);
create policy "insc_all" on public.hub_inscricoes for all using (true) with check (true);

create index if not exists idx_eventos_emp on public.hub_eventos(empresa_id, created_at desc);
create index if not exists idx_insc_ev on public.hub_inscricoes(evento_id);
