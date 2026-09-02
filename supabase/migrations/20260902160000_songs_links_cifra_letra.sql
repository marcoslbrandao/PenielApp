-- Links de cifra e letra por música (aba Banda)
--
-- Contexto: até aqui a tela da Banda ADIVINHAVA a URL do Cifra Club e do
-- Letras.mus.br a partir do nome da música e do artista, montando algo como
-- `cifraclub.com.br/{artista}/{titulo}/`. Isso dá 404 quase sempre, porque os
-- dois sites usam o nome oficial completo no endereço — a URL real de
-- "Oceanos" do Hillsong é `/hillsong-united/oceanos-onde-meus-pes-podem-falhar/`.
-- Nenhum dos dois sites tem API pública, então a única forma confiável é
-- guardar o link real, colado pela própria banda.
--
-- Estas duas colunas são opcionais: quando estiverem vazias, o app abre a
-- BUSCA do site já preenchida com "título + artista" em vez de um link quebrado.

alter table public.songs add column if not exists cifra_url text;
alter table public.songs add column if not exists letra_url text;

comment on column public.songs.cifra_url is 'URL completa da cifra (Cifra Club ou outro site). Vazio = o app abre a busca do Cifra Club.';
comment on column public.songs.letra_url is 'URL completa da letra (Letras.mus.br ou outro site). Vazio = o app abre a busca do Letras.';

-- Editar música pelo app
--
-- Até aqui a tela da Banda só INSERIA músicas — não havia como corrigir uma
-- música já cadastrada, então um link errado ficava errado pra sempre. Agora o
-- mesmo modal edita, o que exige permissão de UPDATE na tabela.
--
-- A tabela `songs` foi criada fora das migrations (direto no painel), então não
-- dá pra saber daqui quais políticas ela já tem. Esta política é ADITIVA: as
-- políticas de RLS se somam (OR), então nada que já funcionava deixa de
-- funcionar. Se a tabela estiver com RLS desligado, ela é simplesmente ignorada.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'is_banda_membro') then
    execute 'drop policy if exists "Banda gerencia as músicas" on public.songs';
    execute 'create policy "Banda gerencia as músicas" on public.songs for all
             using (public.is_banda_membro()) with check (public.is_banda_membro())';
  end if;
end $$;
