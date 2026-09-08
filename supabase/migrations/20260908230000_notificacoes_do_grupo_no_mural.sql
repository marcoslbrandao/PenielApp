-- ============================================================================
-- Conteúdo de grupo aparece nas notificações de quem é do grupo
--
-- Pedido do Marcos (8 Set 2026): quando o líder publica um devocional, short,
-- material, evento — ou quando aparece conversa no chat — os PARTICIPANTES
-- daquele grupo devem ver isso nas notificações da Home. Cada pessoa recebe
-- as notificações públicas MAIS as do(s) grupo(s) de que participa, e nunca
-- as de outro grupo.
--
-- POR QUE ESPELHAR EM `avisos` EM VEZ DE CRIAR UMA TABELA DE NOTIFICAÇÕES
-- O sininho da Home já lê `avisos` sem filtro de grupo, deixando a RLS decidir
-- o que cada um enxerga (`grupo is null` ou `tem_acesso_grupo(grupo)`) — ou
-- seja, a segmentação que o Marcos pediu já está pronta e testada nesse
-- caminho. Além disso, `avisos` já tem push segmentado por grupo (a função
-- content-notifications), tradução automática dos textos pros 4 idiomas, e o
-- "dispensar notificação" por usuário. Uma tabela nova exigiria refazer as
-- quatro coisas. Espelhando, tudo isso vem de graça.
--
-- A coluna `origem` marca essas linhas: `null` = aviso escrito por uma pessoa;
-- 'devocional' | 'short' | 'material' | 'evento' | 'chat' = espelho automático.
--
-- DEPOIS DE RODAR ESTA MIGRAÇÃO, FALTA UM PASSO:
--   supabase functions deploy content-notifications
-- A função foi ajustada para NÃO mandar push das linhas com
-- origem in ('devocional','short') — essas duas tabelas já têm webhook
-- próprio e já mandam o push do grupo. Sem esse deploy, um devocional de
-- grupo chega duas vezes no celular.
-- ============================================================================

alter table public.avisos
  add column if not exists origem text
  check (origem is null or origem in ('devocional', 'short', 'material', 'evento', 'chat'));

create index if not exists avisos_grupo_origem_idx on public.avisos (grupo, origem, created_at desc);


create or replace function public.notificar_grupo_no_mural()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo       text := new.grupo;
  v_nome_grupo  text;
  v_titulo      text;
  v_texto       text;
  v_origem      text;
begin
  -- Conteúdo geral (grupo null) não é espelhado: ele já é público e já
  -- aparece pra todo mundo pelos caminhos de sempre.
  if v_grupo is null then return new; end if;

  v_nome_grupo := case v_grupo
    when 'mulheres'       then 'Grupo de Mulheres'
    when 'homens'         then 'Grupo de Homens'
    when 'jovens'         then 'Peniel Alive'
    when 'estudo_biblico' then 'Estudo Bíblico'
    else v_grupo
  end;

  if TG_TABLE_NAME = 'devocionais' then
    v_origem := 'devocional';
    v_titulo := 'Novo devocional · ' || v_nome_grupo;
    v_texto  := new.titulo;

  elsif TG_TABLE_NAME = 'shorts_videos' then
    v_origem := 'short';
    v_titulo := 'Novo vídeo · ' || v_nome_grupo;
    v_texto  := new.titulo;

  elsif TG_TABLE_NAME = 'grupo_arquivos' then
    v_origem := 'material';
    v_titulo := 'Novo material · ' || v_nome_grupo;
    v_texto  := new.titulo;

  elsif TG_TABLE_NAME = 'grupo_eventos' then
    v_origem := 'evento';
    v_titulo := 'Novo encontro · ' || v_nome_grupo;
    v_texto  := new.titulo || coalesce(' — ' || to_char(new.data, 'DD/MM'), '')
                           || coalesce(' às ' || new.horario, '');

  elsif TG_TABLE_NAME = 'grupo_chat_mensagens' then
    v_origem := 'chat';
    -- Uma notificação por CONVERSA, não por mensagem. Sem isso, dez mensagens
    -- trocadas em dois minutos viram dez notificações e dez pushes, e a
    -- primeira reação de todo mundo é desligar as notificações do app.
    if exists (
      select 1 from public.avisos a
      where a.grupo = v_grupo
        and a.origem = 'chat'
        and a.created_at > now() - interval '60 minutes'
    ) then
      return new;
    end if;
    v_titulo := 'Novas mensagens no chat · ' || v_nome_grupo;
    v_texto  := new.autor_nome || ': ' || left(new.texto, 100);

  else
    return new;
  end if;

  insert into public.avisos (titulo, texto, tipo, data, grupo, apenas_membros, origem)
  values (v_titulo, v_texto, 'geral', now(), v_grupo, false, v_origem);

  return new;
end;
$$;


drop trigger if exists devocional_grupo_no_mural on public.devocionais;
create trigger devocional_grupo_no_mural
  after insert on public.devocionais
  for each row execute function public.notificar_grupo_no_mural();

drop trigger if exists short_grupo_no_mural on public.shorts_videos;
create trigger short_grupo_no_mural
  after insert on public.shorts_videos
  for each row execute function public.notificar_grupo_no_mural();

drop trigger if exists material_grupo_no_mural on public.grupo_arquivos;
create trigger material_grupo_no_mural
  after insert on public.grupo_arquivos
  for each row execute function public.notificar_grupo_no_mural();

drop trigger if exists evento_grupo_no_mural on public.grupo_eventos;
create trigger evento_grupo_no_mural
  after insert on public.grupo_eventos
  for each row execute function public.notificar_grupo_no_mural();

drop trigger if exists chat_grupo_no_mural on public.grupo_chat_mensagens;
create trigger chat_grupo_no_mural
  after insert on public.grupo_chat_mensagens
  for each row execute function public.notificar_grupo_no_mural();


-- ─── Conferência ───────────────────────────────────────────────────────────
-- Depois de publicar um material num grupo, isto deve trazer a linha nova:
--   select titulo, grupo, origem, created_at from public.avisos
--   where origem is not null order by created_at desc limit 10;
--
-- E a RLS continua sendo quem segmenta: entrando com a conta de alguém que
-- NÃO é do grupo, essa linha não aparece.
