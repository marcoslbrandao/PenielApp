-- ============================================================================
-- Confirmação de presença em culto e ensaio
--
-- Hoje o líder monta a escala e não tem como saber quem viu e quem vai. Esta
-- tabela guarda a resposta de cada músico: `confirmado` ou `ausente`, com um
-- motivo opcional ("estou viajando"). Quem não respondeu simplesmente não tem
-- linha aqui — é o estado "pendente", e é por isso que não existe um terceiro
-- valor no check.
--
-- Uma tabela só para os dois tipos de evento (`culto` e `ensaio`), em vez de
-- duas tabelas quase idênticas. O par (tipo, evento_id) identifica o evento;
-- não há foreign key porque o alvo depende do tipo — a limpeza fica por conta
-- dos triggers abaixo, que apagam as presenças quando o culto/ensaio some.
-- ============================================================================

create table if not exists public.banda_presenca (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('culto', 'ensaio')),
  evento_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('confirmado', 'ausente')),
  motivo text check (motivo is null or char_length(motivo) <= 200),
  updated_at timestamptz not null default now(),
  unique (tipo, evento_id, profile_id)
);

create index if not exists banda_presenca_evento_idx
  on public.banda_presenca (tipo, evento_id);

alter table public.banda_presenca enable row level security;

drop policy if exists "Banda vê as confirmações" on public.banda_presenca;
create policy "Banda vê as confirmações"
  on public.banda_presenca for select
  using (public.is_banda_membro());

-- Cada um responde só por si — ninguém confirma presença no lugar de outro.
drop policy if exists "Cada um confirma a própria presença" on public.banda_presenca;
create policy "Cada um confirma a própria presença"
  on public.banda_presenca for insert
  with check (profile_id = auth.uid() and public.is_banda_membro());

drop policy if exists "Cada um muda a própria presença" on public.banda_presenca;
create policy "Cada um muda a própria presença"
  on public.banda_presenca for update
  using (profile_id = auth.uid() and public.is_banda_membro())
  with check (profile_id = auth.uid());

drop policy if exists "Cada um remove a própria presença" on public.banda_presenca;
create policy "Cada um remove a própria presença"
  on public.banda_presenca for delete
  using (profile_id = auth.uid() or public.is_admin());

-- Apagar o culto/ensaio apaga as confirmações dele. Sem isso, sobrariam
-- linhas órfãs apontando pra um evento que não existe mais (não dá pra usar
-- foreign key porque o alvo depende da coluna `tipo`).
create or replace function public.limpa_presenca_do_evento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.banda_presenca
   where tipo = tg_argv[0] and evento_id = old.id;
  return old;
end $$;

-- `cultos` foi criada fora das migrations, direto no painel do Supabase (o
-- mesmo já está anotado em 20260728090000_ensaios_setlist.sql). Num banco
-- limpo — `supabase db reset` ou um projeto de staging novo — ela não existe,
-- e `drop trigger if exists ... on public.cultos` NÃO protege contra isso: o
-- Postgres reclama da tabela ausente e a migração inteira aborta. Por isso os
-- gatilhos só são criados se a tabela realmente estiver lá.
do $$
declare
  alvo record;
begin
  for alvo in
    select * from (values ('cultos', 'culto'), ('ensaios', 'ensaio')) as v(tabela, tipo)
  loop
    if to_regclass('public.' || alvo.tabela) is not null then
      execute format('drop trigger if exists limpa_presenca_%s on public.%I', alvo.tipo, alvo.tabela);
      execute format(
        'create trigger limpa_presenca_%s after delete on public.%I
           for each row execute function public.limpa_presenca_do_evento(%L)',
        alvo.tipo, alvo.tabela, alvo.tipo);
    end if;
  end loop;
end $$;
