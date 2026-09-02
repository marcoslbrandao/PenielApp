-- ============================================================================
-- Versões da mesma música
--
-- A banda quase nunca toca no tom do disco. Hoje dá pra ajustar tom e BPM por
-- culto (`culto_songs.song_key` / `.bpm`), mas esse ajuste morre ali: no culto
-- seguinte alguém tem que lembrar de novo, e a cifra continua abrindo no tom
-- do site.
--
-- Uma versão é essa escolha com nome e memória: "nossa versão em Sol", com
-- tom, BPM, duração e links próprios. A música em `songs` continua sendo a
-- versão original — não há linha aqui para ela, e é por isso que `versao_id`
-- é opcional em todo lugar: nulo significa "o original".
-- ============================================================================

create table if not exists public.song_versoes (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) > 0 and char_length(nome) <= 40),
  song_key text not null default '',
  bpm integer check (bpm is null or (bpm > 0 and bpm < 400)),
  duracao_segundos integer check (duracao_segundos is null or (duracao_segundos > 0 and duracao_segundos < 7200)),
  -- Links próprios: uma versão em outro tom costuma ter outra cifra.
  cifra_url text,
  cifra_tom text check (cifra_tom is null or char_length(cifra_tom) <= 3),
  letra_url text,
  youtube_id text,
  spotify_id text,
  created_at timestamptz not null default now(),
  unique (song_id, nome)
);

create index if not exists song_versoes_song_idx on public.song_versoes (song_id);

alter table public.song_versoes enable row level security;

drop policy if exists "Banda vê as versões" on public.song_versoes;
create policy "Banda vê as versões"
  on public.song_versoes for select using (public.is_banda_membro());

drop policy if exists "Banda gerencia as versões" on public.song_versoes;
create policy "Banda gerencia as versões"
  on public.song_versoes for all
  using (public.is_banda_membro()) with check (public.is_banda_membro());

-- Qual versão foi usada em cada evento. `on delete set null`: apagar a versão
-- não pode apagar a música do setlist — ela volta a ser o original.
alter table public.culto_songs  add column if not exists versao_id uuid references public.song_versoes(id) on delete set null;
alter table public.ensaio_songs add column if not exists versao_id uuid references public.song_versoes(id) on delete set null;

comment on column public.culto_songs.versao_id  is 'Versão usada neste culto. Nulo = a versão original da música.';
comment on column public.ensaio_songs.versao_id is 'Versão usada neste ensaio. Nulo = a versão original da música.';
