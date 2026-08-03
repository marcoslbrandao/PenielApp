-- ============================================================================
-- Ensaios com setlist real (igual já existe para Cultos)
--
-- Até agora a aba "Ensaios" da BandaScreen era só uma lista estática
-- (hardcoded no app), sem seleção de músicas nem tom/BPM — diferente da aba
-- "Cultos", que já tem tudo isso via `cultos`/`culto_songs`. Esta migração
-- cria o mesmo modelo pra ensaios: `ensaios` (data, horário, local,
-- observação) e `ensaio_songs` (músicas do repertório escolhidas, com tom e
-- BPM ajustáveis por ensaio, igual já acontece em `culto_songs`).
--
-- `songs`, `cultos` e `culto_songs` foram criadas fora das migrations
-- (direto no dashboard), então não temos certeza do nome exato das policies
-- de lá — mas o acesso à área da Banda inteira já é controlado por
-- `profiles.banda_acesso` (ver 20260723153000_banda_acesso_persistente.sql),
-- que é o mesmo modelo replicado aqui.
-- ============================================================================

create or replace function public.is_banda_membro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and (profiles.banda_acesso = true or profiles.role = 'admin')
  );
$$;

revoke all on function public.is_banda_membro() from public;
grant execute on function public.is_banda_membro() to authenticated;


create table if not exists public.ensaios (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  date date not null,
  time text not null default '',
  local text not null default '',
  observacao text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ensaio_songs (
  id uuid primary key default gen_random_uuid(),
  ensaio_id uuid not null references public.ensaios(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  song_key text not null default '',
  bpm integer not null default 0,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ensaio_songs_ensaio_idx on public.ensaio_songs (ensaio_id, order_index);

alter table public.ensaios enable row level security;
alter table public.ensaio_songs enable row level security;

drop policy if exists "Banda vê os ensaios" on public.ensaios;
create policy "Banda vê os ensaios"
  on public.ensaios for select
  using (public.is_banda_membro());

drop policy if exists "Banda gerencia os ensaios" on public.ensaios;
create policy "Banda gerencia os ensaios"
  on public.ensaios for all
  using (public.is_banda_membro())
  with check (public.is_banda_membro());

drop policy if exists "Banda vê as músicas do ensaio" on public.ensaio_songs;
create policy "Banda vê as músicas do ensaio"
  on public.ensaio_songs for select
  using (public.is_banda_membro());

drop policy if exists "Banda gerencia as músicas do ensaio" on public.ensaio_songs;
create policy "Banda gerencia as músicas do ensaio"
  on public.ensaio_songs for all
  using (public.is_banda_membro())
  with check (public.is_banda_membro());
