-- ============================================================
-- FactorHub v2 — schema additions (one ALTER per column)
-- ============================================================

-- ── hub_cerebro: new columns added in v2 ─────────────────────
ALTER TABLE public.hub_cerebro ADD COLUMN IF NOT EXISTS dna_fundador text;
ALTER TABLE public.hub_cerebro ADD COLUMN IF NOT EXISTS knowledge_vault text;
ALTER TABLE public.hub_cerebro ADD COLUMN IF NOT EXISTS playbooks text;
ALTER TABLE public.hub_cerebro ADD COLUMN IF NOT EXISTS memoria_corporativa text;
ALTER TABLE public.hub_cerebro ADD COLUMN IF NOT EXISTS licoes_aprendidas text;

-- ── hub_projetos: decision workflow ──────────────────────────
ALTER TABLE public.hub_projetos ADD COLUMN IF NOT EXISTS decisao text;
ALTER TABLE public.hub_projetos ADD COLUMN IF NOT EXISTS observacao text;
ALTER TABLE public.hub_projetos ADD COLUMN IF NOT EXISTS decidido_at timestamptz;

-- ── missions: v2 multi-agent mission records ──────────────────
CREATE TABLE IF NOT EXISTS public.missions (
  id           uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id   text          NOT NULL,
  title        text          NOT NULL,
  description  text,
  level        text          NOT NULL DEFAULT 'N2',
  status       text          NOT NULL DEFAULT 'running',
  product      text          DEFAULT 'general',
  agents_used  text[]        DEFAULT '{}',
  total_tokens integer       DEFAULT 0,
  cost_usd     numeric(12,8) DEFAULT 0,
  approved_at  timestamptz,
  created_at   timestamptz   DEFAULT now(),
  updated_at   timestamptz   DEFAULT now()
);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "missions_empresa" ON public.missions;
CREATE POLICY "missions_empresa" ON public.missions FOR ALL
  USING (
    empresa_id = cast(auth.uid() as text)
    OR empresa_id IN (
      SELECT cast(u.empresa_id as text)
      FROM public.usuarios u
      WHERE u.id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_missions_empresa ON public.missions(empresa_id);
CREATE INDEX IF NOT EXISTS idx_missions_created ON public.missions(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_missions_status  ON public.missions(empresa_id, status);
