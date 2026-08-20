-- ============================================================================
-- Mensagens de contato (substitui os botões "Contato" via WhatsApp nos
-- grupos, que usavam um número de telefone pessoal fixo). Agora o usuário
-- (membro ou visitante, logado ou não) envia uma mensagem direto pelo app,
-- que fica visível para admin/líder na aba "Contato" do AdminScreen.
--
-- Como aplicar: revise este arquivo e rode via Supabase Dashboard > SQL
-- Editor, ou `supabase db push` com o CLI autenticado. Nada aqui é
-- executado automaticamente.
-- ============================================================================

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  nome text not null,
  email text,
  grupo text check (grupo in ('mulheres', 'homens', 'jovens', 'estudo_biblico')),
  mensagem text not null,
  status text not null default 'novo' check (status in ('novo', 'lido', 'respondido')),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Qualquer pessoa pode enviar uma mensagem de contato — inclusive visitante
-- sem conta (user_id fica null nesse caso). Não é preciso estar logado.
drop policy if exists "Qualquer um envia mensagem de contato" on public.contact_messages;
create policy "Qualquer um envia mensagem de contato"
  on public.contact_messages for insert
  with check (user_id is null or user_id = auth.uid());

-- Só admin/líder consegue ler as mensagens recebidas.
drop policy if exists "Admin/líder vê mensagens de contato" on public.contact_messages;
create policy "Admin/líder vê mensagens de contato"
  on public.contact_messages for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'lider')
  ));

-- Admin/líder marca como lida/respondida.
drop policy if exists "Admin/líder atualiza status da mensagem" on public.contact_messages;
create policy "Admin/líder atualiza status da mensagem"
  on public.contact_messages for update
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'lider')
  ));

create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);
