-- ============================================================================
-- Conteúdo de grupo privado por membresia (Mulheres/Homens/Jovens)
--
-- Até agora `grupo_eventos` e `devocionais` de grupo eram visíveis a
-- qualquer usuário autenticado — só a lista de participantes
-- (`grupo_membros`) já era restrita ao líder/admin. Esta migração fecha
-- essa lacuna: só quem foi adicionado ao grupo pelo líder (ou é o próprio
-- líder/admin) enxerga o conteúdo interno do grupo. A "vitrine" do grupo
-- (nome, descrição, contato do líder) continua pública porque é texto fixo
-- no app, não vem do banco — isso é decisão de produto, não RLS.
--
-- Também adiciona: Shorts por grupo (reaproveitando `shorts_videos`), Avisos
-- por grupo (reaproveitando `avisos`, pra notificação push segmentada) e
-- Chat de grupo em tempo real (`grupo_chat_mensagens`, via Realtime).
-- ============================================================================

-- ─── Funções auxiliares (security definer — ver nota abaixo) ──────────────
-- Precisam ser security definer porque `is_grupo_membro` consulta
-- `grupo_membros`, cuja policy de SELECT só libera pra líder/admin daquele
-- grupo (de propósito — um membro comum não vê a lista de colegas). Sem
-- security definer, um membro comum nunca conseguiria confirmar a própria
-- participação e ficaria trancado pra fora do próprio grupo.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  );
$$;

create or replace function public.is_grupo_leader(p_grupo text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_leaders
    where group_leaders.profile_id = auth.uid() and group_leaders.grupo = p_grupo
  );
$$;

create or replace function public.is_grupo_membro(p_grupo text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.grupo_membros gm
    join public.members m on m.id = gm.membro_id
    where m.profile_id = auth.uid() and gm.grupo = p_grupo
  );
$$;

-- Admin, líder do grupo ou membro adicionado pelo líder — usado em toda
-- policy de SELECT de conteúdo interno do grupo.
create or replace function public.tem_acesso_grupo(p_grupo text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or public.is_grupo_leader(p_grupo)
    or public.is_grupo_membro(p_grupo);
$$;

-- RPC pro app: "de quais grupos eu sou membro?" — mesmo motivo do security
-- definer acima. Usado pela GruposScreen pra decidir se mostra o conteúdo
-- do grupo ou o aviso de "conteúdo exclusivo".
create or replace function public.meus_grupos()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct gm.grupo), '{}')
  from public.grupo_membros gm
  join public.members m on m.id = gm.membro_id
  where m.profile_id = auth.uid();
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_grupo_leader(text) from public;
revoke all on function public.is_grupo_membro(text) from public;
revoke all on function public.tem_acesso_grupo(text) from public;
revoke all on function public.meus_grupos() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_grupo_leader(text) to authenticated;
grant execute on function public.is_grupo_membro(text) to authenticated;
grant execute on function public.tem_acesso_grupo(text) to authenticated;
grant execute on function public.meus_grupos() to authenticated;


-- ─── grupo_eventos: só quem tem acesso ao grupo vê ─────────────────────────
drop policy if exists "Qualquer usuário autenticado vê eventos de grupo" on public.grupo_eventos;
create policy "Quem tem acesso ao grupo vê os eventos"
  on public.grupo_eventos for select
  using (public.tem_acesso_grupo(grupo));

-- Líder do próprio grupo também pode gerenciar (além do admin/lider global
-- já coberto pela policy existente "Admin/líder gerencia eventos de grupo").
drop policy if exists "Líder do grupo gerencia eventos do próprio grupo" on public.grupo_eventos;
create policy "Líder do grupo gerencia eventos do próprio grupo"
  on public.grupo_eventos for all
  using (public.is_admin() or public.is_grupo_leader(grupo))
  with check (public.is_admin() or public.is_grupo_leader(grupo));


-- ─── devocionais: geral continua público, de grupo fica restrito ──────────
-- `devocionais` foi criada fora das migrations (dashboard), então não temos
-- o nome exato da(s) policy(ies) de SELECT existentes. Removemos todas e
-- recriamos do zero pra garantir que nenhuma policy antiga e permissiva
-- (ex: "true" pra qualquer autenticado) continue liberando devocional de
-- grupo específico pra quem não deveria ver.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'devocionais' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.devocionais', pol.policyname);
  end loop;
end $$;

create policy "Devocional geral é público pra autenticado"
  on public.devocionais for select
  using (grupo is null and auth.role() = 'authenticated');

create policy "Devocional de grupo só pra quem tem acesso"
  on public.devocionais for select
  using (grupo is not null and public.tem_acesso_grupo(grupo));

drop policy if exists "Líder do grupo gerencia devocionais do próprio grupo" on public.devocionais;
create policy "Líder do grupo gerencia devocionais do próprio grupo"
  on public.devocionais for all
  using (grupo is not null and (public.is_admin() or public.is_grupo_leader(grupo)))
  with check (grupo is not null and (public.is_admin() or public.is_grupo_leader(grupo)));


-- ─── avisos: novo campo `grupo` (null = geral, igual hoje) ────────────────
alter table public.avisos
  add column if not exists grupo text check (grupo is null or grupo in ('mulheres', 'homens', 'jovens'));

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'avisos' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.avisos', pol.policyname);
  end loop;
end $$;

create policy "Aviso geral é público pra autenticado"
  on public.avisos for select
  using (grupo is null and auth.role() = 'authenticated');

create policy "Aviso de grupo só pra quem tem acesso"
  on public.avisos for select
  using (grupo is not null and public.tem_acesso_grupo(grupo));

drop policy if exists "Líder do grupo gerencia avisos do próprio grupo" on public.avisos;
create policy "Líder do grupo gerencia avisos do próprio grupo"
  on public.avisos for all
  using (grupo is not null and (public.is_admin() or public.is_grupo_leader(grupo)))
  with check (grupo is not null and (public.is_admin() or public.is_grupo_leader(grupo)));


-- ─── shorts_videos: novo campo `grupo` (null = geral, aba Mídia) ──────────
alter table public.shorts_videos
  add column if not exists grupo text check (grupo is null or grupo in ('mulheres', 'homens', 'jovens'));

drop policy if exists "Qualquer um vê os shorts" on public.shorts_videos;
create policy "Short geral é público"
  on public.shorts_videos for select
  using (grupo is null);

create policy "Short de grupo só pra quem tem acesso"
  on public.shorts_videos for select
  using (grupo is not null and public.tem_acesso_grupo(grupo));

drop policy if exists "Líder do grupo gerencia shorts do próprio grupo" on public.shorts_videos;
create policy "Líder do grupo gerencia shorts do próprio grupo"
  on public.shorts_videos for all
  using (grupo is not null and (public.is_admin() or public.is_grupo_leader(grupo)))
  with check (grupo is not null and (public.is_admin() or public.is_grupo_leader(grupo)));


-- ─── grupo_chat_mensagens: chat em tempo real, só de quem tem acesso ──────
-- `autor_nome` fica duplicado aqui de propósito (denormalizado): a policy
-- de SELECT de `profiles` só libera o próprio usuário ver o próprio nome
-- (auth.uid() = id), então não dá pra fazer join pra mostrar o nome de quem
-- mandou a mensagem pros outros membros do grupo. Gravando o nome junto da
-- mensagem, o realtime já chega com tudo que a UI precisa, sem query extra
-- nem afrouxar a privacidade de `profiles`.
create table if not exists public.grupo_chat_mensagens (
  id uuid primary key default gen_random_uuid(),
  grupo text not null check (grupo in ('mulheres', 'homens', 'jovens')),
  autor_id uuid not null references public.profiles(id) on delete cascade,
  autor_nome text not null,
  texto text not null check (char_length(trim(texto)) > 0 and char_length(texto) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists grupo_chat_mensagens_grupo_idx
  on public.grupo_chat_mensagens (grupo, created_at);

alter table public.grupo_chat_mensagens enable row level security;

drop policy if exists "Quem tem acesso ao grupo lê o chat" on public.grupo_chat_mensagens;
create policy "Quem tem acesso ao grupo lê o chat"
  on public.grupo_chat_mensagens for select
  using (public.tem_acesso_grupo(grupo));

drop policy if exists "Quem tem acesso ao grupo manda mensagem" on public.grupo_chat_mensagens;
create policy "Quem tem acesso ao grupo manda mensagem"
  on public.grupo_chat_mensagens for insert
  with check (autor_id = auth.uid() and public.tem_acesso_grupo(grupo));

-- Autor apaga a própria mensagem; líder/admin moderam o grupo inteiro.
drop policy if exists "Autor ou líder apaga mensagem do chat" on public.grupo_chat_mensagens;
create policy "Autor ou líder apaga mensagem do chat"
  on public.grupo_chat_mensagens for delete
  using (autor_id = auth.uid() or public.is_admin() or public.is_grupo_leader(grupo));

-- Liga Realtime nessa tabela (idempotente — ignora se já estiver ligado).
do $$
begin
  execute 'alter publication supabase_realtime add table public.grupo_chat_mensagens';
exception when duplicate_object then
  null;
end $$;
