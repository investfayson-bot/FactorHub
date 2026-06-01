-- CRM de Leads
create table if not exists public.hub_leads (
  id uuid primary key default gen_random_uuid(),
  empresa_id text not null,
  nome text not null,
  email text,
  telefone text,
  origem text default 'manual',        -- manual | atendimento | site | indicacao
  status text default 'novo',          -- novo | contato | qualificado | proposta | fechado | perdido
  valor numeric default 0,
  interesse text,                      -- o que o lead quer (ex: apê na Savassi)
  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.hub_leads enable row level security;

drop policy if exists "leads_select" on public.hub_leads;
drop policy if exists "leads_insert" on public.hub_leads;
drop policy if exists "leads_update" on public.hub_leads;
drop policy if exists "leads_delete" on public.hub_leads;

create policy "leads_select" on public.hub_leads for select using (
  empresa_id = cast(auth.uid() as text)
  or empresa_id in (select cast(u.empresa_id as text) from public.usuarios u where u.id = auth.uid())
);
create policy "leads_insert" on public.hub_leads for insert with check (true);  -- captura pública (atendimento/site)
create policy "leads_update" on public.hub_leads for update using (
  empresa_id = cast(auth.uid() as text)
  or empresa_id in (select cast(u.empresa_id as text) from public.usuarios u where u.id = auth.uid())
);
create policy "leads_delete" on public.hub_leads for delete using (
  empresa_id = cast(auth.uid() as text)
  or empresa_id in (select cast(u.empresa_id as text) from public.usuarios u where u.id = auth.uid())
);

create index if not exists idx_leads_empresa on public.hub_leads(empresa_id, created_at desc);
