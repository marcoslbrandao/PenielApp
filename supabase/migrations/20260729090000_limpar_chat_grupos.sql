-- ============================================================================
-- Limpeza automática do chat de grupo: não deixa acumular mensagem antiga
--
-- Todo dia às 3h da manhã, apaga mensagens de `grupo_chat_mensagens` com mais
-- de 14 dias. É uma janela "rolante" (sempre as últimas ~2 semanas ficam
-- disponíveis) em vez de um apagão total a cada 2 semanas — assim o chat
-- nunca fica vazio de uma hora pra outra.
--
-- Precisa da extensão pg_cron. Se o Supabase recusar `create extension`
-- aqui, é só ir em Database > Extensions, procurar "pg_cron" e habilitar
-- pelo toggle, depois rodar esta migração de novo.
-- ============================================================================

create extension if not exists pg_cron;

-- Remove o agendamento anterior (se existir) antes de recriar, pra essa
-- migração poder rodar de novo sem duplicar o job.
do $$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'limpar-chat-grupos-antigo';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end $$;

select cron.schedule(
  'limpar-chat-grupos-antigo',
  '0 3 * * *',
  $$ delete from public.grupo_chat_mensagens where created_at < now() - interval '14 days'; $$
);
