-- ============================================================================
-- Bug: Admin não consegue achar NENHUMA outra conta nas buscas por nome —
-- "Gerenciar Líderes" de um grupo (GruposScreen), "vincular Conta" a um
-- membro (MembrosScreen, aba Conta) e o seletor de membro em "Nova Oferta"
-- (AdminScreen) — reportado pelo Marcos ao tentar tornar a Debora Brandão
-- líder do grupo Mulheres: ele digitava "Debora" e nada aparecia, mesmo ela
-- já tendo feito o cadastro/signup.
--
-- Causa confirmada com uma consulta direta: a Debora tem profile e member
-- corretos (profiles.full_name = 'Debora brandao', members.profile_id
-- apontando pra ela certinho) — o problema nunca foi o nome ou acento, foi
-- que `public.profiles` só tem UMA policy de select, "auth.uid() = id",
-- criada em 20260709000000_profiles_and_invite_codes.sql. Isso restringe
-- CADA usuário a enxergar via RLS só a própria linha — inclusive o admin.
-- Toda tela que faz `supabase.from('profiles').select(...).ilike('full_name',
-- ...)` pra buscar OUTRA pessoa sempre voltava vazia, não importa o nome
-- digitado, porque o Postgres nunca deixava nem chegar a comparar o texto.
--
-- Fix: admin passa a enxergar todos os perfis, reusando a função
-- `is_admin()` que já existe em produção (mesma usada nas policies de
-- group_leaders, escala_areas, etc. — SECURITY DEFINER, então não recria
-- o mesmo problema de RLS dentro dela mesma).
-- ============================================================================

drop policy if exists "Perfil visível pelo próprio usuário" on public.profiles;
drop policy if exists "Admin vê todos os perfis" on public.profiles;
create policy "Admin vê todos os perfis"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());
