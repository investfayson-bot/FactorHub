-- ============================================================
-- FactorHub — schema base (empresas + usuarios)
-- ============================================================

CREATE TABLE IF NOT EXISTS empresas (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        TEXT NOT NULL,
  plano       TEXT DEFAULT 'free',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome        TEXT,
  cargo       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresas_own" ON empresas;
CREATE POLICY "empresas_own" ON empresas FOR ALL
  USING (id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "usuarios_own" ON usuarios;
CREATE POLICY "usuarios_own" ON usuarios FOR ALL
  USING (id = auth.uid() OR empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

-- ── Hub Projetos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hub_projetos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  status      TEXT DEFAULT 'ideia' CHECK (status IN ('ideia','planejamento','desenvolvimento','concluido','pausado')),
  progresso   INTEGER DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
  categoria   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Hub Ideias ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hub_ideias (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  titulo      TEXT NOT NULL,
  descricao   TEXT,
  origem      TEXT DEFAULT 'manual',
  tipo        TEXT DEFAULT 'feature',
  status      TEXT DEFAULT 'nova',
  projeto_id  UUID REFERENCES hub_projetos(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Hub Clientes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hub_clientes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  email       TEXT,
  telefone    TEXT,
  segmento    TEXT,
  status      TEXT DEFAULT 'lead' CHECK (status IN ('lead','ativo','socio','inativo')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Hub Eventos ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hub_eventos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  titulo      TEXT NOT NULL,
  descricao   TEXT,
  tipo        TEXT DEFAULT 'mentoria',
  data_inicio TIMESTAMPTZ,
  data_fim    TIMESTAMPTZ,
  local       TEXT,
  nicho       TEXT,
  status      TEXT DEFAULT 'planejado',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Hub Conteúdo ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hub_conteudo (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id       UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  titulo           TEXT NOT NULL,
  formato          TEXT DEFAULT 'post',
  plataforma       TEXT DEFAULT 'instagram',
  status           TEXT DEFAULT 'ideia' CHECK (status IN ('ideia','producao','revisao','agendado','publicado')),
  data_publicacao  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Hub Uso Agentes ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hub_uso_agentes (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id         UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  agente_id          TEXT NOT NULL,
  modelo             TEXT NOT NULL,
  prompt_tokens      INTEGER DEFAULT 0,
  completion_tokens  INTEGER DEFAULT 0,
  total_tokens       INTEGER DEFAULT 0,
  custo_usd          NUMERIC(12, 8) DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS em todas as tabelas Hub ───────────────────────────────
ALTER TABLE hub_projetos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_ideias      ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_clientes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_eventos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_conteudo    ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_uso_agentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hub_projetos_empresa"    ON hub_projetos;
DROP POLICY IF EXISTS "hub_ideias_empresa"      ON hub_ideias;
DROP POLICY IF EXISTS "hub_clientes_empresa"    ON hub_clientes;
DROP POLICY IF EXISTS "hub_eventos_empresa"     ON hub_eventos;
DROP POLICY IF EXISTS "hub_conteudo_empresa"    ON hub_conteudo;
DROP POLICY IF EXISTS "hub_uso_agentes_empresa" ON hub_uso_agentes;

CREATE POLICY "hub_projetos_empresa"    ON hub_projetos    FOR ALL USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "hub_ideias_empresa"      ON hub_ideias      FOR ALL USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "hub_clientes_empresa"    ON hub_clientes    FOR ALL USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "hub_eventos_empresa"     ON hub_eventos     FOR ALL USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "hub_conteudo_empresa"    ON hub_conteudo    FOR ALL USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "hub_uso_agentes_empresa" ON hub_uso_agentes FOR ALL USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

-- ── Índices ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa        ON usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hub_projetos_empresa    ON hub_projetos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hub_ideias_empresa      ON hub_ideias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hub_clientes_empresa    ON hub_clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hub_eventos_empresa     ON hub_eventos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hub_conteudo_empresa    ON hub_conteudo(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hub_uso_empresa         ON hub_uso_agentes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hub_uso_agente          ON hub_uso_agentes(empresa_id, agente_id);
CREATE INDEX IF NOT EXISTS idx_hub_uso_created         ON hub_uso_agentes(empresa_id, created_at DESC);

-- ── Trigger: criar empresa + usuario ao signup ─────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_empresa_id UUID;
BEGIN
  INSERT INTO public.empresas (nome) VALUES (COALESCE(NEW.raw_user_meta_data->>'empresa', split_part(NEW.email, '@', 1)))
  RETURNING id INTO new_empresa_id;
  INSERT INTO public.usuarios (id, empresa_id, nome) VALUES (NEW.id, new_empresa_id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
