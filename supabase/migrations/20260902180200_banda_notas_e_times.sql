-- ============================================================================
-- Notas por música do culto + times salvos
--
-- `nota`: o recado que hoje se perde no chat — "entrar direto no refrão",
-- "sem bateria na primeira estrofe", "termina na quarta". Fica na música
-- DAQUELE culto, não na música do repertório: a mesma canção pode ser tocada
-- de um jeito no domingo de manhã e de outro no camping.
--
-- `banda_times`: formações que se repetem ("equipe A", "equipe do camping").
-- Guarda pessoa + instrumento, exatamente o par que a escala usa, pra montar
-- um culto inteiro num toque.
-- ============================================================================

alter table public.culto_songs  add column if not exists nota text check (nota is null or char_length(nota) <= 300);
alter table public.ensaio_songs add column if not exists nota text check (nota is null or char_length(nota) <= 300);

comment on column public.culto_songs.nota  is 'Observação desta música NESTE culto (ex: "entrar direto no refrão").';
comment on column public.ensaio_songs.nota is 'Observação desta música NESTE ensaio.';

create table if not exists public.banda_times (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) > 0 and char_length(nome) <= 60),
  created_at timestamptz not null default now()
);

create table if not exists public.banda_time_membros (
  id uuid primary key default gen_random_uuid(),
  time_id uuid not null references public.banda_times(id) on delete cascade,
  membro_id uuid not null references public.banda_membros(id) on delete cascade,
  instrumento text not null,
  unique (time_id, membro_id, instrumento)
);

create index if not exists banda_time_membros_time_idx on public.banda_time_membros (time_id);

alter table public.banda_times enable row level security;
alter table public.banda_time_membros enable row level security;

drop policy if exists "Banda vê os times" on public.banda_times;
create policy "Banda vê os times"
  on public.banda_times for select using (public.is_banda_membro());

drop policy if exists "Banda gerencia os times" on public.banda_times;
create policy "Banda gerencia os times"
  on public.banda_times for all
  using (public.is_banda_membro()) with check (public.is_banda_membro());

drop policy if exists "Banda vê os membros do time" on public.banda_time_membros;
create policy "Banda vê os membros do time"
  on public.banda_time_membros for select using (public.is_banda_membro());

drop policy if exists "Banda gerencia os membros do time" on public.banda_time_membros;
create policy "Banda gerencia os membros do time"
  on public.banda_time_membros for all
  using (public.is_banda_membro()) with check (public.is_banda_membro());
