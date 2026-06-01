-- Ensure all hub_cerebro columns exist (safe to re-run)
ALTER TABLE public.hub_cerebro ADD COLUMN IF NOT EXISTS dna_fundador text;
ALTER TABLE public.hub_cerebro ADD COLUMN IF NOT EXISTS knowledge_vault text;
ALTER TABLE public.hub_cerebro ADD COLUMN IF NOT EXISTS playbooks text;
ALTER TABLE public.hub_cerebro ADD COLUMN IF NOT EXISTS memoria_corporativa text;
ALTER TABLE public.hub_cerebro ADD COLUMN IF NOT EXISTS licoes_aprendidas text;
