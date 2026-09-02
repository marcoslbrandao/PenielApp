-- ============================================================================
-- Chat da Banda — de verdade
--
-- Até aqui a aba Chat da Banda era MENTIRA: três mensagens fixas no código
-- (`CHAT_INIT` em screens/BandaScreen.tsx) que nunca iam ao banco e sumiam
-- ao fechar o app. Esta tabela é a versão real.
--
-- É um espelho de `grupo_chat_mensagens` (20260727160000), que já funciona em
-- produção nos grupos: mesma forma, mesmo realtime, mesmo motivo pro
-- `autor_nome` ficar duplicado aqui. A policy de SELECT de `profiles` só
-- libera cada um ver a própria linha, então não dá pra fazer join pra
-- descobrir quem mandou a mensagem — gravando o nome junto, o realtime já
-- chega com tudo que a tela precisa, sem query extra nem afrouxar a
-- privacidade de `profiles`.
-- ============================================================================

create table if not exists public.banda_chat_mensagens (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references public.profiles(id) on delete cascade,
  autor_nome text not null,
  texto text not null check (char_length(trim(texto)) > 0 and char_length(texto) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists banda_chat_mensagens_created_idx
  on public.banda_chat_mensagens (created_at);

alter table public.banda_chat_mensagens enable row level security;

drop policy if exists "Banda lê o chat" on public.banda_chat_mensagens;
create policy "Banda lê o chat"
  on public.banda_chat_mensagens for select
  using (public.is_banda_membro());

drop policy if exists "Banda manda mensagem" on public.banda_chat_mensagens;
create policy "Banda manda mensagem"
  on public.banda_chat_mensagens for insert
  with check (autor_id = auth.uid() and public.is_banda_membro());

-- Autor apaga a própria mensagem; admin modera.
drop policy if exists "Autor ou admin apaga mensagem da banda" on public.banda_chat_mensagens;
create policy "Autor ou admin apaga mensagem da banda"
  on public.banda_chat_mensagens for delete
  using (autor_id = auth.uid() or public.is_admin());

-- Liga Realtime nessa tabela (idempotente — ignora se já estiver ligado).
do $$
begin
  execute 'alter publication supabase_realtime add table public.banda_chat_mensagens';
exception when duplicate_object then
  null;
end $$;
