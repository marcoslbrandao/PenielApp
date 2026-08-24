-- 15ª rodada: devocional Geral acessível sem login + exclusão de notificação
-- permanente por conta (Supabase), não mais só local (AsyncStorage).

-- ── Devocional Geral público pra qualquer um (logado ou não) ──────────────
-- Antes, mesmo o devocional Geral (grupo IS NULL) exigia
-- auth.role() = 'authenticated' pra aparecer — por isso quem não estava
-- logado (visitante) não conseguia ver nem na Home nem na tela Devocionais.
-- Os de grupo continuam exigindo login + acesso ao grupo (outra policy,
-- não mexida aqui).
drop policy if exists "Devocional geral é público pra quem autenticado" on public.devocionais;

create policy "Devocional geral é público pra todos"
  on public.devocionais
  for select
  using (grupo is null);

-- ── Exclusão de notificação permanente (por conta, não por aparelho) ──────
-- Antes, "excluir" um aviso só escondia localmente (AsyncStorage, ver
-- lib/notificacoesLidas.ts) — ao reinstalar o app ou trocar de aparelho,
-- os avisos excluídos voltavam a aparecer. Agora fica registrado no banco,
-- por usuário — some de vez, em qualquer aparelho.
create table if not exists public.avisos_dispensados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  aviso_id uuid not null references public.avisos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, aviso_id)
);

alter table public.avisos_dispensados enable row level security;

create policy "Usuário vê só os próprios avisos dispensados"
  on public.avisos_dispensados
  for select
  using (user_id = auth.uid());

create policy "Usuário dispensa aviso pra si mesmo"
  on public.avisos_dispensados
  for insert
  with check (user_id = auth.uid());

create policy "Usuário remove seus próprios dispensados"
  on public.avisos_dispensados
  for delete
  using (user_id = auth.uid());
