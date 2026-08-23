-- Corrige notificações push duplicadas.
--
-- O que estava acontecendo: push_tokens tinha UNIQUE(user_id), então cada
-- CONTA só podia ter 1 token — mas nada impedia o mesmo APARELHO FÍSICO
-- (mesmo token Expo) de ficar registrado em várias contas diferentes (ex:
-- a pessoa testou o app com mais de um login no mesmo celular, ou trocou
-- de conta sem que a linha antiga fosse limpa). Resultado: ao publicar um
-- devocional/aviso, a função content-notifications mandava um push por
-- LINHA da tabela — se o mesmo token aparecia em 3 contas, o dono do
-- celular recebia a mesma notificação 3 vezes.
--
-- Correção: o token (aparelho) passa a ser a chave única, não o user_id.
-- Assim, uma pessoa pode ter o app em mais de um aparelho (cada token é
-- uma linha), mas o mesmo aparelho nunca aparece 2x — ao logar com outra
-- conta no mesmo celular, a linha existente é atualizada pro novo
-- user_id em vez de criar uma linha nova (ver ajuste em
-- lib/useNotifications.ts: upsert com onConflict: 'token').

-- 1) Remove duplicatas já existentes, mantendo só a linha mais recente de
--    cada token (a mais recente reflete a conta logada por último nesse
--    aparelho).
delete from public.push_tokens a
using public.push_tokens b
where a.token = b.token
  and (
    a.created_at < b.created_at
    or (a.created_at = b.created_at and a.id < b.id)
  );

-- 2) Troca a constraint de unicidade: de user_id pra token.
alter table public.push_tokens drop constraint if exists push_tokens_user_id_key;
alter table public.push_tokens add constraint push_tokens_token_key unique (token);
