-- FactorHub — tarefas executadas pelos agentes de IA

CREATE TABLE IF NOT EXISTS hub_tarefas (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  titulo            TEXT NOT NULL,
  descricao         TEXT,
  agente_id         TEXT NOT NULL,
  modelo            TEXT,
  status            TEXT DEFAULT 'executando' CHECK (status IN ('executando','concluida','erro')),
  resultado         TEXT,
  prompt_tokens     INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  custo_usd         NUMERIC(12, 8) DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

ALTER TABLE hub_tarefas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hub_tarefas_empresa" ON hub_tarefas;
CREATE POLICY "hub_tarefas_empresa" ON hub_tarefas
  FOR ALL USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_hub_tarefas_empresa ON hub_tarefas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hub_tarefas_agente  ON hub_tarefas(empresa_id, agente_id);
CREATE INDEX IF NOT EXISTS idx_hub_tarefas_created ON hub_tarefas(empresa_id, created_at DESC);
