-- Ajustes no sistema de notificações:
-- 1. Nova coluna avisos.apenas_membros — quando true, o push desse aviso
--    (sem grupo) vai só pra quem tem conta com role != 'visitante'.
-- 2. Novo lembrete automático: Reunião de Oração, toda quarta 9h (UK) —
--    marcado apenas_membros = true.
-- 3. Novo lembrete automático: início do culto ao vivo no YouTube, todo
--    domingo 17:45 (UK), 15 min antes do culto das 18h — esse é público
--    (todo mundo, membros e visitantes), então apenas_membros = false.
--
-- Os horários usam UTC fixo (mesma limitação já aceita no lembrete do
-- Estudo Bíblico): no horário de verão britânico (BST, aprox. final de
-- março a final de outubro) o horário local fica ~1h mais tarde do que o
-- pretendido; no horário de inverno (GMT) bate certinho.
--
-- IMPORTANTE — depois de rodar esta migração no SQL Editor, ainda falta:
--   a) Deploy da função content-notifications atualizada:
--      supabase functions deploy content-notifications
--   b) Deploy da função birthday-notifications atualizada (agora notifica
--      todos os membros, não só líderes/admin):
--      supabase functions deploy birthday-notifications
--   c) Criar dois novos Database Webhooks no Dashboard
--      (Database > Webhooks > Create a new webhook), do mesmo jeito que os
--      de avisos/devocionais já configurados:
--      - Table: shorts_videos | Events: Insert | Edge Function: content-notifications
--      - Table: mensagens     | Events: Insert | Edge Function: content-notifications

alter table public.avisos
  add column if not exists apenas_membros boolean not null default false;

-- Reunião de Oração — toda quarta, 9h UK (8h UTC).
do $$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'lembrete-reuniao-oracao-quarta';
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
end $$;

select cron.schedule(
  'lembrete-reuniao-oracao-quarta',
  '0 8 * * 3',
  $$
    insert into public.avisos (titulo, texto, tipo, data, grupo, apenas_membros)
    values ('Reunião de Oração é hoje!', 'Nos vemos hoje às 20h para a nossa Reunião de Oração. Confira o link na Agenda da igreja.', 'evento', now(), null, true);
  $$
);

-- Início do culto ao vivo no YouTube — todo domingo, 17:45 UK (16:45 UTC),
-- 15 minutos antes do culto das 18h. Público: todo mundo.
do $$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'lembrete-culto-youtube-domingo';
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
end $$;

select cron.schedule(
  'lembrete-culto-youtube-domingo',
  '45 16 * * 0',
  $$
    insert into public.avisos (titulo, texto, tipo, data, grupo, apenas_membros)
    values ('O culto já vai começar!', 'Nosso culto ao vivo no YouTube começa às 18h. Entre agora para não perder o início!', 'evento', now(), null, false);
  $$
);
