-- Projetos de criação (estilo Claude Projects) — salva artefato + conversa, reabrível
create table if not exists public.hub_criacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id text not null,
  nome text not null,
  setor text default 'Geral',
  prompt text,
  conteudo text,                          -- o HTML/artefato gerado
  conversa jsonb default '[]'::jsonb,     -- histórico de mensagens
  status text default 'rascunho',         -- rascunho | aprovado | recusado
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.hub_criacoes enable row level security;

drop policy if exists "criacoes_select" on public.hub_criacoes;
drop policy if exists "criacoes_insert" on public.hub_criacoes;
drop policy if exists "criacoes_update" on public.hub_criacoes;
drop policy if exists "criacoes_delete" on public.hub_criacoes;

create policy "criacoes_select" on public.hub_criacoes for select using (
  empresa_id = cast(auth.uid() as text)
  or empresa_id in (select cast(u.empresa_id as text) from public.usuarios u where u.id = auth.uid())
);
create policy "criacoes_insert" on public.hub_criacoes for insert with check (
  empresa_id = cast(auth.uid() as text)
  or empresa_id in (select cast(u.empresa_id as text) from public.usuarios u where u.id = auth.uid())
);
create policy "criacoes_update" on public.hub_criacoes for update using (
  empresa_id = cast(auth.uid() as text)
  or empresa_id in (select cast(u.empresa_id as text) from public.usuarios u where u.id = auth.uid())
);
create policy "criacoes_delete" on public.hub_criacoes for delete using (
  empresa_id = cast(auth.uid() as text)
  or empresa_id in (select cast(u.empresa_id as text) from public.usuarios u where u.id = auth.uid())
);

create index if not exists idx_criacoes_empresa on public.hub_criacoes(empresa_id, created_at desc);
