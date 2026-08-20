-- ============================================================================
-- Cadastro de membro feito pelo próprio membro (nova tela "Meu Cadastro" no
-- app, aberta pelo Perfil). Até agora só o admin/líder conseguia
-- criar/editar linhas em `members` (MembrosScreen). Esta migração:
--
-- 1. Adiciona as colunas que faltavam pro formulário novo:
--    - instagram: usuário do Instagram (seção Contato).
--    - deseja_batizar: quando a pessoa NÃO é batizada, se tem interesse em
--      se batizar (popup condicional, só relevante se batizado = false).
--    - compartilhar_mais: campo livre "algo mais que queira compartilhar",
--      preenchido pelo próprio membro — separado de `observacoes`, que
--      continua sendo só para notas internas do admin/líder.
--
-- 2. Permite (via RLS) que o usuário logado crie e edite SEU PRÓPRIO
--    registro em `members` (profile_id = auth.uid()), sem precisar de
--    admin/líder. As políticas de admin/líder continuam intactas — essas
--    novas políticas são adicionais (Postgres RLS combina políticas
--    permissivas com OR), então quem já podia gerenciar todo mundo continua
--    podendo.
--
-- IMPORTANTE — risco de duplicidade: se um admin já cadastrou essa pessoa
-- manualmente antes (sem profile_id vinculado), e ela agora se cadastra
-- sozinha pelo app, isso cria uma SEGUNDA linha em `members` (o app não tem
-- como saber que já existe uma). Nesses casos o admin precisa mesclar/
-- excluir a duplicata manualmente na aba Membros. Não é possível evitar
-- isso automaticamente sem um critério de correspondência (email/telefone)
-- que hoje não existe.
-- ============================================================================

alter table public.members
  add column if not exists instagram text,
  add column if not exists deseja_batizar boolean not null default false,
  add column if not exists compartilhar_mais text;

drop policy if exists "Usuário cria seu próprio registro no diretório" on public.members;
create policy "Usuário cria seu próprio registro no diretório"
  on public.members for insert
  with check (profile_id = auth.uid());

drop policy if exists "Usuário edita seu próprio registro no diretório" on public.members;
create policy "Usuário edita seu próprio registro no diretório"
  on public.members for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
