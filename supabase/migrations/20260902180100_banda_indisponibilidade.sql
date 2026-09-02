-- ============================================================================
-- Indisponibilidade: os dias em que o músico não pode servir
--
-- Uma linha por pessoa por dia. Quem monta a escala vê antes de escalar, em
-- vez de descobrir no grupo do WhatsApp na véspera.
--
-- Diferente de `banda_presenca`, que é uma resposta a um culto específico já
-- marcado, isto é declarado antes de existir culto nenhum: "nas duas semanas
-- de janeiro eu viajo".
-- ============================================================================

create table if not exists public.banda_indisponibilidade (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  data date not null,
  created_at timestamptz not null default now(),
  unique (profile_id, data)
);

create index if not exists banda_indisponibilidade_data_idx
  on public.banda_indisponibilidade (data);

alter table public.banda_indisponibilidade enable row level security;

-- A banda inteira enxerga (é justamente pra isso que serve), mas cada um só
-- mexe nos próprios dias.
drop policy if exists "Banda vê as indisponibilidades" on public.banda_indisponibilidade;
create policy "Banda vê as indisponibilidades"
  on public.banda_indisponibilidade for select
  using (public.is_banda_membro());

drop policy if exists "Cada um marca os próprios dias" on public.banda_indisponibilidade;
create policy "Cada um marca os próprios dias"
  on public.banda_indisponibilidade for insert
  with check (profile_id = auth.uid() and public.is_banda_membro());

drop policy if exists "Cada um desmarca os próprios dias" on public.banda_indisponibilidade;
create policy "Cada um desmarca os próprios dias"
  on public.banda_indisponibilidade for delete
  using (profile_id = auth.uid() or public.is_admin());
