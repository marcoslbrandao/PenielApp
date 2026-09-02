-- ============================================================================
-- Comentários por culto + histórico da escala
--
-- `culto_comentarios`: a conversa que hoje se perde no chat geral. Presa ao
-- culto, ela ainda está lá no domingo de manhã, junto do setlist.
--
-- `banda_escala_log`: quem entrou e quem saiu da escala, e quando. Encerra a
-- discussão de "mas eu não fui avisado" — e, diferente de um comentário, é
-- gravado sozinho, por gatilho, sem depender de alguém lembrar de escrever.
--
-- `autor_nome` duplicado pelo mesmo motivo do chat: a policy de SELECT de
-- `profiles` só libera cada um ver a própria linha, então não há join possível
-- para descobrir o nome de quem fez a coisa.
-- ============================================================================

create table if not exists public.culto_comentarios (
  id uuid primary key default gen_random_uuid(),
  culto_id uuid not null references public.cultos(id) on delete cascade,
  autor_id uuid not null references public.profiles(id) on delete cascade,
  autor_nome text not null,
  texto text not null check (char_length(trim(texto)) > 0 and char_length(texto) <= 600),
  created_at timestamptz not null default now()
);

create index if not exists culto_comentarios_culto_idx on public.culto_comentarios (culto_id, created_at);

alter table public.culto_comentarios enable row level security;

drop policy if exists "Banda lê os comentários" on public.culto_comentarios;
create policy "Banda lê os comentários"
  on public.culto_comentarios for select using (public.is_banda_membro());

drop policy if exists "Banda comenta" on public.culto_comentarios;
create policy "Banda comenta"
  on public.culto_comentarios for insert
  with check (autor_id = auth.uid() and public.is_banda_membro());

drop policy if exists "Autor ou admin apaga comentário" on public.culto_comentarios;
create policy "Autor ou admin apaga comentário"
  on public.culto_comentarios for delete
  using (autor_id = auth.uid() or public.is_admin());

do $$
begin
  execute 'alter publication supabase_realtime add table public.culto_comentarios';
exception when duplicate_object then
  null;
end $$;

-- ─── Histórico da escala ────────────────────────────────────────────────────
create table if not exists public.banda_escala_log (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('culto', 'ensaio')),
  evento_id uuid not null,
  acao text not null check (acao in ('adicionou', 'removeu')),
  membro_nome text not null,
  instrumento text not null,
  autor_nome text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists banda_escala_log_evento_idx on public.banda_escala_log (tipo, evento_id, created_at desc);

alter table public.banda_escala_log enable row level security;

drop policy if exists "Banda vê o histórico" on public.banda_escala_log;
create policy "Banda vê o histórico"
  on public.banda_escala_log for select using (public.is_banda_membro());

-- Escrita só pelo gatilho (security definer). Ninguém insere à mão, e é assim
-- que o histórico continua confiável.
create or replace function public.registra_escala_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_json jsonb;
  v_evento_id uuid;
  v_membro text;
  v_autor text;
begin
  -- Em plpgsql, num gatilho de DELETE o registro `new` fica NÃO ATRIBUÍDO (e
  -- `old` fica no INSERT). Tocar nele — mesmo dentro de um coalesce — levanta
  -- "record new is not assigned yet" e aborta a instrução inteira, ou seja,
  -- ninguém mais conseguiria entrar nem sair da escala.
  if tg_op = 'INSERT' then
    v_json := to_jsonb(new);
  else
    v_json := to_jsonb(old);
  end if;

  -- Pelo jsonb, e não por `v_linha.culto_id`/`.ensaio_id` num CASE: o plpgsql
  -- resolve os campos de um record ao PLANEJAR a expressão, não ao escolher o
  -- ramo — e `culto_escala` não tem coluna `ensaio_id` nenhuma, então o CASE
  -- estourava "record has no field" já no primeiro insert.
  v_evento_id := (v_json ->> (tg_argv[0] || '_id'))::uuid;

  select nome into v_membro from public.banda_membros
   where id = (v_json ->> 'membro_id')::uuid;
  select coalesce(full_name, '') into v_autor from public.profiles where id = auth.uid();

  insert into public.banda_escala_log (tipo, evento_id, acao, membro_nome, instrumento, autor_nome)
  values (
    tg_argv[0],
    v_evento_id,
    case when tg_op = 'INSERT' then 'adicionou' else 'removeu' end,
    coalesce(v_membro, '?'),
    coalesce(v_json ->> 'instrumento', ''),
    coalesce(v_autor, '')
  );

  return null; -- gatilho AFTER: o valor de retorno é ignorado
end $$;

-- O histórico só é escrito pelo gatilho (security definer, dono da tabela, que
-- não passa por RLS). Revogar a escrita direta deixa isso explícito em vez de
-- depender de quem por acaso criou a função.
revoke insert, update, delete on public.banda_escala_log from authenticated;

-- Só cria os gatilhos se as tabelas existirem: `culto_escala` veio de uma
-- migração anterior, mas o mesmo cuidado da migração de presença vale aqui.
do $$
declare
  alvo record;
begin
  for alvo in
    select * from (values ('culto_escala', 'culto'), ('ensaio_escala', 'ensaio')) as v(tabela, tipo)
  loop
    if to_regclass('public.' || alvo.tabela) is not null then
      execute format('drop trigger if exists escala_log_%s on public.%I', alvo.tipo, alvo.tabela);
      execute format(
        'create trigger escala_log_%s after insert or delete on public.%I
           for each row execute function public.registra_escala_log(%L)',
        alvo.tipo, alvo.tabela, alvo.tipo);
    end if;
  end loop;
end $$;
