-- ============================================================================
-- Rascunho x publicado em culto e ensaio
--
-- Hoje, no instante em que alguém cria um culto, a banda inteira já vê a
-- escala pela metade — sem as músicas, sem os músicos. Esta coluna deixa
-- montar em paz e só depois abrir pra todo mundo.
--
-- IMPORTANTE, e está aqui pra ninguém confundir depois: o filtro é de
-- INTERFACE, não de segurança. As policies de `cultos` foram criadas fora das
-- migrations e não são visíveis daqui; além disso, políticas de RLS no
-- Postgres são permissivas e se somam (OR), então acrescentar uma nova nunca
-- restringe o que as antigas já liberam. Um rascunho fica ESCONDIDO da tela,
-- não protegido do banco. Como escala incompleta é bagunça e não segredo,
-- isso resolve o problema real.
--
-- Default `true` de propósito: tudo que já existe continua visível como
-- sempre esteve. Só o que for criado daqui pra frente começa como rascunho,
-- e quem cria decide na hora.
-- ============================================================================

alter table public.cultos  add column if not exists publicado boolean not null default true;
alter table public.ensaios add column if not exists publicado boolean not null default true;

comment on column public.cultos.publicado  is 'false = rascunho, escondido da banda na interface (não é barreira de segurança).';
comment on column public.ensaios.publicado is 'false = rascunho, escondido da banda na interface (não é barreira de segurança).';
