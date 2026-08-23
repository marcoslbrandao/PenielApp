-- Corrige o erro "duplicate key value violates unique constraint devocionais_data_key"
-- ao publicar um devocional de grupo no mesmo dia em que já existe um devocional Geral
-- (ou de outro grupo).
--
-- Causa: a constraint `devocionais_data_key` era UNIQUE(data) — só permitia 1
-- devocional por dia NO TOTAL, criada antes de existir a funcionalidade de
-- devocionais por grupo (14ª rodada). Agora que Geral + cada grupo podem ter
-- seu próprio devocional, a regra certa é: no máximo 1 devocional Geral por
-- dia, e no máximo 1 devocional por dia POR GRUPO (Homens, Mulheres, Alive e
-- Estudo Bíblico podem cada um ter o seu, no mesmo dia).

alter table public.devocionais drop constraint if exists devocionais_data_key;

-- No máximo 1 devocional Geral (grupo IS NULL) por dia.
create unique index if not exists devocionais_data_geral_key
  on public.devocionais (data)
  where grupo is null;

-- No máximo 1 devocional por dia, por grupo.
create unique index if not exists devocionais_data_grupo_key
  on public.devocionais (data, grupo)
  where grupo is not null;
