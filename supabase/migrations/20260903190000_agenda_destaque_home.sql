-- Destaque na Home: liga a Home à agenda.
--
-- Antes desta migração o card de "evento especial" da Home estava escrito à
-- mão em screens/HomeScreen.tsx (Camping Peniel 2026, com data, texto e link
-- fixos). Resultado: apagar o evento na Agenda/Admin não tirava nada da Home,
-- e não havia como promover outro evento sem publicar código novo.
--
-- Agora qualquer evento da agenda pode ser marcado como destaque da Home,
-- pelo Painel Admin. Marcar → aparece na Home; desmarcar → some da Home e
-- continua normalmente na Agenda.

alter table public.agenda_eventos
  add column if not exists destaque_home boolean not null default false,
  add column if not exists cta_texto text,   -- rótulo do botão no card da Home (ex.: "Inscreva-se")
  add column if not exists cta_url text;     -- destino do botão; se vazio, o card só abre a Agenda

comment on column public.agenda_eventos.destaque_home is
  'true = este evento é o destaque/chamada de ação da Home. Só um por vez (garantido por trigger).';

-- Só pode haver um destaque por vez: ao marcar um evento, os outros são
-- desmarcados automaticamente. Feito por trigger (e não por índice único
-- parcial) pra que o admin não precise desmarcar o anterior antes de marcar
-- o novo — trocar o aviso da Home vira um toque só.
create or replace function public.agenda_destaque_home_exclusivo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.destaque_home then
    update public.agenda_eventos
       set destaque_home = false
     where destaque_home
       and id <> new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists agenda_destaque_home_exclusivo_trg on public.agenda_eventos;
create trigger agenda_destaque_home_exclusivo_trg
  after insert or update of destaque_home on public.agenda_eventos
  for each row
  when (new.destaque_home)
  execute function public.agenda_destaque_home_exclusivo();
