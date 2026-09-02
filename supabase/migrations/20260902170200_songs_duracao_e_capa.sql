-- ============================================================================
-- Duração e capa do álbum por música
--
-- Vem da busca no Deezer, que o app passa a oferecer no cadastro de música
-- (a API pública do Deezer não exige chave nem login, diferente do Spotify).
-- Com a duração dá pra somar o setlist e dizer "este culto tem 37 minutos de
-- música"; com a capa o repertório deixa de ser uma lista de texto.
--
-- Ambas opcionais: música cadastrada na mão continua funcionando sem elas.
-- `deezer_id` fica guardado pra saber que a música já veio da busca e poder
-- reconsultar a capa se o link expirar.
-- ============================================================================

alter table public.songs add column if not exists duracao_segundos integer
  check (duracao_segundos is null or (duracao_segundos > 0 and duracao_segundos < 7200));
alter table public.songs add column if not exists capa_url text;
alter table public.songs add column if not exists deezer_id text;

comment on column public.songs.duracao_segundos is 'Duração em segundos, normalmente vinda da busca do Deezer. Usada pra somar o tempo do setlist.';
comment on column public.songs.capa_url is 'URL da capa do álbum (Deezer cover_medium, 250x250).';
comment on column public.songs.deezer_id is 'ID da faixa no Deezer, quando a música foi cadastrada pela busca.';

-- ─── Tom em que a cifra está escrita no site ────────────────────────────────
-- O Cifra Club transpõe pela própria URL, com `#key=N` — N em semitons a
-- partir do tom em que a cifra foi publicada. Só que o app não tem como
-- adivinhar esse tom: a cifra de "Oceanos" pode estar em Ré no site enquanto
-- a banda toca em Sol. Guardando aqui o tom do site, o app calcula os
-- semitons sozinho e abre a cifra já transposta pro tom da nossa versão.
-- Vazio = abre a cifra como está publicada, sem transpor.
alter table public.songs add column if not exists cifra_tom text
  check (cifra_tom is null or char_length(cifra_tom) <= 3);

comment on column public.songs.cifra_tom is 'Tom em que a cifra está publicada no site (ex: D). Com song_key, permite montar #key=N e abrir a cifra já no tom da banda.';
