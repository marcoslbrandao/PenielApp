-- ============================================================================
-- 4º grupo: Estudo Bíblico
--
-- Mesmo padrão dos outros grupos (Mulheres/Homens/Jovens): eventos,
-- devocional, shorts, chat, avisos (só líder/professor) e gestão de
-- participantes/líderes pelo admin. Duas coisas novas específicas:
--
-- 1. `grupo_arquivos`: pro professor compartilhar o PDF da aula (ou
--    qualquer link — slide, apostila, gravação). Como o app publica via OTA
--    (sem passar pela loja a cada atualização), optamos por um campo de
--    LINK colado em vez de upload nativo de arquivo — adicionar upload
--    nativo (expo-document-picker) exigiria uma nova build nativa na loja,
--    quebrando esse fluxo rápido. O professor sobe o PDF em qualquer lugar
--    (Google Drive, WeTransfer, etc.) e cola o link aqui.
--
-- 2. Lembrete automático: pg_cron insere um aviso toda sexta de manhã
--    (grupo='estudo_biblico'), avisando que o estudo é às 20h daquele dia
--    na sala do Zoom (horário temporário atual) — reaproveita o webhook que
--    já dispara push notification segmentada por grupo (content-notifications),
--    nenhum código novo de notificação é necessário, só a inserção.
--    Horário do LEMBRETE (não do estudo): 8h UTC (≈ 8h em GMT no inverno,
--    9h em BST no verão) — ajuste o cron abaixo se quiser mandar em outra hora.
-- ============================================================================

-- ─── 1. Libera 'estudo_biblico' nos CHECK constraints existentes ──────────
-- As constraints foram criadas sem nome explícito em migrações anteriores,
-- então em vez de arriscar o nome exato (algumas tabelas foram criadas
-- fora de migração, direto no dashboard), a gente descobre e remove
-- dinamicamente qualquer CHECK que mencione a coluna `grupo` antes de
-- recriar já incluindo o novo grupo.
do $$
declare
  v_table text;
  v_constraint text;
  v_tables text[] := array[
    'devocionais', 'grupo_eventos', 'group_leaders', 'grupo_membros',
    'avisos', 'shorts_videos', 'grupo_chat_mensagens'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass('public.' || v_table) is null then
      continue;
    end if;
    for v_constraint in
      select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      where rel.relname = v_table
        and con.contype = 'c'
        and pg_get_constraintdef(con.oid) ilike '%grupo%'
    loop
      execute format('alter table public.%I drop constraint %I', v_table, v_constraint);
    end loop;
  end loop;
end $$;

alter table public.devocionais add constraint devocionais_grupo_check
  check (grupo is null or grupo in ('mulheres', 'homens', 'jovens', 'estudo_biblico'));

alter table public.grupo_eventos add constraint grupo_eventos_grupo_check
  check (grupo in ('mulheres', 'homens', 'jovens', 'estudo_biblico'));

alter table public.group_leaders add constraint group_leaders_grupo_check
  check (grupo in ('mulheres', 'homens', 'jovens', 'estudo_biblico'));

alter table public.grupo_membros add constraint grupo_membros_grupo_check
  check (grupo in ('mulheres', 'homens', 'jovens', 'estudo_biblico'));

alter table public.avisos add constraint avisos_grupo_check
  check (grupo is null or grupo in ('mulheres', 'homens', 'jovens', 'estudo_biblico'));

alter table public.shorts_videos add constraint shorts_videos_grupo_check
  check (grupo is null or grupo in ('mulheres', 'homens', 'jovens', 'estudo_biblico'));

alter table public.grupo_chat_mensagens add constraint grupo_chat_mensagens_grupo_check
  check (grupo in ('mulheres', 'homens', 'jovens', 'estudo_biblico'));


-- ─── 2. grupo_arquivos: materiais (PDF/links) do grupo ─────────────────────
create table if not exists public.grupo_arquivos (
  id uuid primary key default gen_random_uuid(),
  grupo text not null check (grupo in ('mulheres', 'homens', 'jovens', 'estudo_biblico')),
  titulo text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists grupo_arquivos_grupo_idx on public.grupo_arquivos (grupo, created_at desc);

alter table public.grupo_arquivos enable row level security;

drop policy if exists "Quem tem acesso ao grupo vê os materiais" on public.grupo_arquivos;
create policy "Quem tem acesso ao grupo vê os materiais"
  on public.grupo_arquivos for select
  using (public.tem_acesso_grupo(grupo));

drop policy if exists "Líder do grupo gerencia os materiais do próprio grupo" on public.grupo_arquivos;
create policy "Líder do grupo gerencia os materiais do próprio grupo"
  on public.grupo_arquivos for all
  using (public.is_admin() or public.is_grupo_leader(grupo))
  with check (public.is_admin() or public.is_grupo_leader(grupo));


-- ─── 3. Lembrete automático toda sexta de manhã ────────────────────────────
create extension if not exists pg_cron;

do $$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'lembrete-estudo-biblico-sexta';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end $$;

select cron.schedule(
  'lembrete-estudo-biblico-sexta',
  '0 8 * * 5',
  $$
    insert into public.avisos (titulo, texto, tipo, data, grupo)
    values (
      'Estudo Bíblico é hoje!',
      'Nos vemos hoje às 20h na sala do Zoom para o nosso Estudo Bíblico. Confira o link na Agenda da igreja.',
      'evento',
      now(),
      'estudo_biblico'
    );
  $$
);
