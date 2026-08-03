-- ============================================================================
-- Novos campos no cadastro de Membros (Admin > Membros)
--
-- 1. `complemento`: separa complemento do endereço (apto, bloco, referência)
--    do campo `endereco` (rua e número), pra deixar o endereço mais completo
--    sem virar um texto único genérico.
-- 2. `igreja_anterior` / `igreja_anterior_nome`: se a pessoa já pertenceu a
--    outra igreja antes.
-- 3. `ministerio_anterior` / `ministerio_anterior_qual`: se já participou ou
--    participa de algum ministério (em qualquer igreja, não só a atual em
--    Peniel — por isso é separado da coluna `ministerio`, que é a
--    designação atual dela aqui).
-- 4. `deseja_servir` / `deseja_servir_area`: se tem interesse em servir em
--    alguma área da igreja, e qual.
--
-- `membro_desde` não muda de tipo (continua `date`) — só passou a ser
-- preenchida no app como mês/ano (dia sempre 01), porque a pergunta real é
-- "em que ano e mês chegou", não o dia exato.
-- ============================================================================

alter table public.members
  add column if not exists complemento text,
  add column if not exists igreja_anterior boolean not null default false,
  add column if not exists igreja_anterior_nome text,
  add column if not exists ministerio_anterior boolean not null default false,
  add column if not exists ministerio_anterior_qual text,
  add column if not exists deseja_servir boolean not null default false,
  add column if not exists deseja_servir_area text;
