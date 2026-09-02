-- ============================================================================
-- Ordem do culto (roadmap)
--
-- O setlist diz quais músicas vão ser tocadas; isto diz o que acontece no
-- culto inteiro e quanto tempo cada parte leva — abertura, oração, avisos,
-- oferta, pregação, ministração. Com a duração de cada item somada à das
-- músicas, dá pra saber se o culto cabe no tempo antes de começar.
--
-- As músicas NÃO são copiadas pra cá: elas já vivem em `culto_songs`, e
-- duplicá-las criaria duas listas pra manter em sincronia. A tela junta as
-- duas na hora de mostrar. `order_index` é compartilhado entre os dois
-- mundos: um item de roadmap com order_index 3 aparece entre a 3ª e a 4ª
-- música.
-- ============================================================================

create table if not exists public.culto_roadmap (
  id uuid primary key default gen_random_uuid(),
  culto_id uuid not null references public.cultos(id) on delete cascade,
  titulo text not null check (char_length(trim(titulo)) > 0 and char_length(titulo) <= 80),
  descricao text check (descricao is null or char_length(descricao) <= 200),
  duracao_segundos integer check (duracao_segundos is null or (duracao_segundos > 0 and duracao_segundos < 21600)),
  icone text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists culto_roadmap_culto_idx on public.culto_roadmap (culto_id, order_index);

alter table public.culto_roadmap enable row level security;

drop policy if exists "Banda vê a ordem do culto" on public.culto_roadmap;
create policy "Banda vê a ordem do culto"
  on public.culto_roadmap for select using (public.is_banda_membro());

drop policy if exists "Banda gerencia a ordem do culto" on public.culto_roadmap;
create policy "Banda gerencia a ordem do culto"
  on public.culto_roadmap for all
  using (public.is_banda_membro()) with check (public.is_banda_membro());
