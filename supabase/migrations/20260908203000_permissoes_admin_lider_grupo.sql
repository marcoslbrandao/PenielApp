-- ============================================================================
-- Permissões: o que é da IGREJA (admin) e o que é do GRUPO (líder do grupo)
--
-- Regra de produto definida pelo Marcos em 8 Set 2026:
--   • Admin           → tudo. Avisos, devocionais, mensagens e shorts criados
--                       na aba Admin são PÚBLICOS (aparecem na Home e na Mídia).
--   • Líder de grupo  → só o grupo que ele lidera. Avisos, devocionais,
--                       mensagens, shorts e materiais do grupo são exclusivos
--                       daquele grupo, e ele os gerencia dentro da aba Grupos.
--   • Membro          → nem Admin, nem lista de Membros.
--   • Só o ADMIN adiciona ou remove líderes de grupo. O líder não.
--
-- O QUE ESTAVA ERRADO
-- O papel global `profiles.role = 'lider'` dava, na prática, poder de admin
-- sobre a igreja inteira: as policies antigas usavam `role in ('admin',
-- 'lider')` em members, avisos, shorts, agenda, mensagens, convites, ofertas
-- e pedidos de oração. Ou seja, tornar alguém líder de UM grupo (ou de uma
-- área de escala) liberava publicar conteúdo público pra toda a congregação e
-- ler o diretório inteiro de membros, com telefone, endereço e observações
-- internas. Esconder botões no app não resolvia nada: a permissão estava no
-- banco, e qualquer cliente com o token da pessoa conseguia escrever.
--
-- O QUE MUDA AQUI
-- Todo poder sobre conteúdo DA IGREJA passa a exigir `is_admin()`. O líder de
-- grupo continua com poder total sobre o próprio grupo — isso já estava certo
-- desde 20260727160000 (`is_grupo_leader(grupo)`), e não é tocado aqui.
--
-- `role = 'lider'` deixa de ser uma permissão e vira o que sempre deveria ter
-- sido: uma ETIQUETA. Quem manda de verdade é `group_leaders` (grupo a grupo)
-- e `escala_area_lideres` (área a área).
--
-- Como aplicar: revise e rode via Supabase Dashboard > SQL Editor, ou
-- `supabase db push`. Nada aqui roda sozinho.
-- ============================================================================


-- ─── 1. Diretório de membros: só admin ────────────────────────────────────
-- O líder de grupo NÃO vê o diretório (telefone, endereço, data de nascimento,
-- observações internas da liderança). Pra montar o grupo dele existe uma busca
-- reduzida, criada no item 8 — só nome e sobrenome.
drop policy if exists "Admin/líder gerencia membros" on public.members;
drop policy if exists "Admin gerencia membros" on public.members;
create policy "Admin gerencia membros"
  on public.members for all
  using (public.is_admin())
  with check (public.is_admin());


-- ─── 2. Convites de membro: só admin ──────────────────────────────────────
drop policy if exists "Líderes gerenciam convites" on public.invite_codes;
drop policy if exists "Admin gerencia convites" on public.invite_codes;
create policy "Admin gerencia convites"
  on public.invite_codes for all
  using (public.is_admin())
  with check (public.is_admin());


-- ─── 3. Agenda da igreja: só admin ────────────────────────────────────────
drop policy if exists "Admin/líder gerencia a agenda" on public.agenda_eventos;
drop policy if exists "Admin gerencia a agenda" on public.agenda_eventos;
create policy "Admin gerencia a agenda"
  on public.agenda_eventos for all
  using (public.is_admin())
  with check (public.is_admin());


-- ─── 4. Mensagens (blog público): só admin ────────────────────────────────
drop policy if exists "Admin/líder gerencia as mensagens" on public.mensagens;
drop policy if exists "Admin gerencia as mensagens" on public.mensagens;
create policy "Admin gerencia as mensagens"
  on public.mensagens for all
  using (public.is_admin())
  with check (public.is_admin());

-- Imagens do blog no Storage seguem a mesma regra de quem escreve o post.
drop policy if exists "Admin/líder sobe imagem do blog" on storage.objects;
drop policy if exists "Admin sobe imagem do blog" on storage.objects;
create policy "Admin sobe imagem do blog"
  on storage.objects for insert
  with check (bucket_id = 'blog' and public.is_admin());

drop policy if exists "Admin/líder atualiza imagem do blog" on storage.objects;
drop policy if exists "Admin atualiza imagem do blog" on storage.objects;
create policy "Admin atualiza imagem do blog"
  on storage.objects for update
  using (bucket_id = 'blog' and public.is_admin());

drop policy if exists "Admin/líder remove imagem do blog" on storage.objects;
drop policy if exists "Admin remove imagem do blog" on storage.objects;
create policy "Admin remove imagem do blog"
  on storage.objects for delete
  using (bucket_id = 'blog' and public.is_admin());


-- ─── 5. Pedidos de oração e mensagens de contato: só admin ────────────────
drop policy if exists "Admin/líder vê todos os pedidos de oração" on public.prayer_requests;
drop policy if exists "Admin vê todos os pedidos de oração" on public.prayer_requests;
create policy "Admin vê todos os pedidos de oração"
  on public.prayer_requests for select
  using (public.is_admin());

drop policy if exists "Admin atualiza status de qualquer pedido" on public.prayer_requests;
create policy "Admin atualiza status de qualquer pedido"
  on public.prayer_requests for update
  using (public.is_admin());

drop policy if exists "Admin/líder vê mensagens de contato" on public.contact_messages;
drop policy if exists "Admin vê mensagens de contato" on public.contact_messages;
create policy "Admin vê mensagens de contato"
  on public.contact_messages for select
  using (public.is_admin());

drop policy if exists "Admin/líder atualiza status da mensagem" on public.contact_messages;
drop policy if exists "Admin atualiza status da mensagem" on public.contact_messages;
create policy "Admin atualiza status da mensagem"
  on public.contact_messages for update
  using (public.is_admin());


-- ─── 6. Eventos de grupo: admin, ou o líder DAQUELE grupo ─────────────────
-- A policy antiga dava a qualquer 'lider' poder sobre eventos de TODOS os
-- grupos. A policy por grupo ("Líder do grupo gerencia eventos do próprio
-- grupo", de 20260727160000) continua valendo e não é tocada aqui.
drop policy if exists "Admin/líder gerencia eventos de grupo" on public.grupo_eventos;
drop policy if exists "Admin gerencia eventos de grupo" on public.grupo_eventos;
create policy "Admin gerencia eventos de grupo"
  on public.grupo_eventos for all
  using (public.is_admin())
  with check (public.is_admin());


-- ─── 7. Avisos, devocionais e shorts ──────────────────────────────────────
-- Estas três tabelas nasceram fora do controle de versão (criadas no
-- dashboard), então não dá pra confiar no nome das policies de escrita que
-- existem hoje: pode haver uma policy antiga e permissiva que ninguém
-- documentou. Derrubamos TODAS as policies de escrita (tudo que não é SELECT)
-- e recriamos as duas que devem existir. As de SELECT ficam intactas — foram
-- reescritas em 20260727160000/20260824090000 e estão corretas.
do $$
declare
  pol record;
  tabela text;
begin
  foreach tabela in array array['avisos', 'devocionais', 'shorts_videos'] loop
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = tabela and cmd <> 'SELECT'
    loop
      execute format('drop policy %I on public.%I', pol.policyname, tabela);
    end loop;
  end loop;
end $$;

-- Conteúdo geral (grupo is null) = público, aparece na Home e na Mídia. Só admin.
create policy "Admin gerencia avisos"
  on public.avisos for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admin gerencia devocionais"
  on public.devocionais for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admin gerencia shorts"
  on public.shorts_videos for all
  using (public.is_admin())
  with check (public.is_admin());

-- Conteúdo de grupo = exclusivo do grupo. O líder daquele grupo gerencia o
-- que for do grupo dele, e só isso: `grupo is not null` impede que ele
-- publique um aviso geral se passar um `grupo: null` na requisição.
create policy "Líder do grupo gerencia avisos do próprio grupo"
  on public.avisos for all
  using (grupo is not null and public.is_grupo_leader(grupo))
  with check (grupo is not null and public.is_grupo_leader(grupo));

create policy "Líder do grupo gerencia devocionais do próprio grupo"
  on public.devocionais for all
  using (grupo is not null and public.is_grupo_leader(grupo))
  with check (grupo is not null and public.is_grupo_leader(grupo));

create policy "Líder do grupo gerencia shorts do próprio grupo"
  on public.shorts_videos for all
  using (grupo is not null and public.is_grupo_leader(grupo))
  with check (grupo is not null and public.is_grupo_leader(grupo));


-- ─── 8. Como o líder monta o grupo sem ver o diretório ────────────────────
-- Ele precisa achar pessoas pelo nome pra adicionar ao grupo, mas não pode
-- ler a ficha delas. Duas funções SECURITY DEFINER devolvem só o nome — sem
-- telefone, endereço, data de nascimento, e-mail ou observações da liderança.
-- A checagem de permissão está DENTRO da função: quem não é admin nem líder
-- daquele grupo recebe zero linhas, não importa o que o app mande.

create or replace function public.membros_para_grupo(p_grupo text, p_busca text default null)
returns table (id uuid, nome text, sobrenome text)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.nome, m.sobrenome
  from public.members m
  where (public.is_admin() or public.is_grupo_leader(p_grupo))
    and (
      p_busca is null
      or btrim(p_busca) = ''
      or (coalesce(m.nome, '') || ' ' || coalesce(m.sobrenome, '')) ilike '%' || btrim(p_busca) || '%'
    )
    and not exists (
      select 1 from public.grupo_membros gm
      where gm.membro_id = m.id and gm.grupo = p_grupo
    )
  order by m.nome, m.sobrenome
  limit 20;
$$;

create or replace function public.participantes_do_grupo(p_grupo text)
returns table (id uuid, membro_id uuid, nome text, sobrenome text)
language sql
stable
security definer
set search_path = public
as $$
  select gm.id, gm.membro_id, m.nome, m.sobrenome
  from public.grupo_membros gm
  join public.members m on m.id = gm.membro_id
  where (public.is_admin() or public.is_grupo_leader(p_grupo))
    and gm.grupo = p_grupo
  order by m.nome, m.sobrenome;
$$;

revoke all on function public.membros_para_grupo(text, text) from public;
revoke all on function public.participantes_do_grupo(text) from public;
grant execute on function public.membros_para_grupo(text, text) to authenticated;
grant execute on function public.participantes_do_grupo(text) to authenticated;


-- ─── 9. O mesmo problema no time das áreas de escala ──────────────────────
-- O líder de uma área (banda, som, recepção) monta o time da área dele
-- buscando pessoas no diretório — que ele também deixou de enxergar. Mesma
-- solução: funções que devolvem só o nome, com a permissão checada dentro.
-- Isto é um eixo separado do líder de grupo: a mesma pessoa pode ser os dois,
-- ou nenhum dos dois.

create or replace function public.lidera_area_escala(p_area_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.escala_area_lideres
    where escala_area_lideres.profile_id = auth.uid()
      and escala_area_lideres.area_id = p_area_id
  );
$$;

create or replace function public.membros_para_area_escala(p_area_id uuid, p_busca text default null)
returns table (id uuid, nome text, sobrenome text)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.nome, m.sobrenome
  from public.members m
  where (public.is_admin() or public.lidera_area_escala(p_area_id))
    and (
      p_busca is null
      or btrim(p_busca) = ''
      or (coalesce(m.nome, '') || ' ' || coalesce(m.sobrenome, '')) ilike '%' || btrim(p_busca) || '%'
    )
    and not exists (
      select 1 from public.escala_area_voluntarios v
      where v.membro_id = m.id and v.area_id = p_area_id
    )
  order by m.nome, m.sobrenome
  limit 20;
$$;

create or replace function public.voluntarios_da_area(p_area_id uuid)
returns table (id uuid, area_id uuid, membro_id uuid, nome text, sobrenome text)
language sql
stable
security definer
set search_path = public
as $$
  select v.id, v.area_id, v.membro_id, m.nome, m.sobrenome
  from public.escala_area_voluntarios v
  join public.members m on m.id = v.membro_id
  where (public.is_admin() or public.lidera_area_escala(p_area_id))
    and v.area_id = p_area_id
  order by m.nome, m.sobrenome;
$$;

revoke all on function public.lidera_area_escala(uuid) from public;
revoke all on function public.membros_para_area_escala(uuid, text) from public;
revoke all on function public.voluntarios_da_area(uuid) from public;
grant execute on function public.lidera_area_escala(uuid) to authenticated;
grant execute on function public.membros_para_area_escala(uuid, text) to authenticated;
grant execute on function public.voluntarios_da_area(uuid) to authenticated;


-- ─── 10. Conferência ───────────────────────────────────────────────────────
-- Depois de aplicar, isto deve listar SÓ policies com is_admin() ou
-- is_grupo_leader() — nenhuma com role in ('admin','lider'):
--
--   select tablename, policyname, qual
--   from pg_policies
--   where schemaname = 'public' and qual ilike '%lider%'
--   order by tablename;
