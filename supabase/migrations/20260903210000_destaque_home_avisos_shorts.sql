-- Destaque na Home para Avisos e Shorts.
--
-- Mesmo mecanismo já usado na agenda (20260903190000_agenda_destaque_home):
-- uma coluna `destaque_home` por tabela, com trigger garantindo um só
-- destaque por vez DENTRO de cada tabela. As três coisas são independentes:
-- dá pra ter, ao mesmo tempo, 1 evento + 1 aviso + 1 short na Home.
--
-- Avisos: hoje só aparecem no sininho e na busca. Marcado como destaque, o
-- aviso passa a aparecer no topo da Home, antes do versículo do dia.
-- Shorts: hoje só na aba Mídia. Marcado, ganha um card com miniatura na Home.

alter table public.avisos
  add column if not exists destaque_home boolean not null default false;

alter table public.shorts_videos
  add column if not exists destaque_home boolean not null default false;

comment on column public.avisos.destaque_home is
  'true = este aviso aparece no topo da Home. Só um por vez (garantido por trigger).';
comment on column public.shorts_videos.destaque_home is
  'true = este short aparece na Home com miniatura. Só um por vez (garantido por trigger).';

-- Uma função por tabela (o nome da tabela no update precisa ser literal).
-- Sem recursão: o update interno grava `false`, e o `when (new.destaque_home)`
-- do trigger só dispara quando o valor novo é true.
create or replace function public.avisos_destaque_home_exclusivo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.avisos set destaque_home = false
   where destaque_home and id <> new.id;
  return new;
end;
$$;

drop trigger if exists avisos_destaque_home_exclusivo_trg on public.avisos;
create trigger avisos_destaque_home_exclusivo_trg
  after insert or update of destaque_home on public.avisos
  for each row when (new.destaque_home)
  execute function public.avisos_destaque_home_exclusivo();

create or replace function public.shorts_destaque_home_exclusivo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shorts_videos set destaque_home = false
   where destaque_home and id <> new.id;
  return new;
end;
$$;

drop trigger if exists shorts_destaque_home_exclusivo_trg on public.shorts_videos;
create trigger shorts_destaque_home_exclusivo_trg
  after insert or update of destaque_home on public.shorts_videos
  for each row when (new.destaque_home)
  execute function public.shorts_destaque_home_exclusivo();

-- Checagem informativa: os gatilhos de notificação push deste projeto foram
-- criados à mão no SQL Editor, fora das migrações, então não dá pra conferir
-- no repositório se algum deles dispara em UPDATE. Se disparar, marcar um
-- aviso como destaque (que é um UPDATE) mandaria push pra congregação toda
-- sem querer. Este bloco só imprime o que existe — não altera nada.
do $$
declare r record;
begin
  for r in
    select c.relname as tabela, t.tgname as gatilho,
           pg_get_triggerdef(t.oid) as definicao
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
     where not t.tgisinternal
       and c.relname in ('avisos', 'shorts_videos')
       and t.tgname not like '%destaque_home%'
  loop
    raise notice 'GATILHO EXISTENTE em %: % -> %', r.tabela, r.gatilho, r.definicao;
  end loop;
end $$;
