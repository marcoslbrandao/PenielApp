-- ============================================================================
-- Importação do repertório do LouveApp  —  147 músicas
--
-- Origem: exportação em Excel feita pelo Marcos no LouveApp (02 Set 2026),
-- ministério "Adoradores Peniel Church". 149 linhas no arquivo, 147 músicas
-- únicas depois da limpeza.
--
-- COMO RODAR: cole este arquivo inteiro no SQL Editor do Supabase e execute.
-- Não precisa de senha, chave nem token em lugar nenhum.
--
-- É UM COMANDO SÓ, de propósito. A primeira versão deste arquivo usava uma
-- tabela temporária e falhava no SQL Editor com "relation _louveapp_import
-- does not exist": o editor roda os comandos por uma conexão em pool, e uma
-- tabela temporária morre junto com a sessão, antes do comando seguinte. Como
-- CTE, os dados e os dois passos viajam juntos num único comando — e, sendo um
-- comando só, ele é atômico sem precisar de BEGIN/COMMIT.
--
-- É SEGURO RODAR DUAS VEZES. Nada é apagado e nada é sobrescrito:
--   • músicas que já existem (mesmo título + artista) são ignoradas na inserção;
--   • o UPDATE só PREENCHE campos vazios — um link que você já tenha cadastrado
--     à mão continua como está.
--
-- Limpezas já aplicadas nos dados:
--   • 2 linhas duplicadas resolvidas, mantendo a mais completa;
--   • 2 links de CIFRA que estavam na coluna de LETRA foram descartados, pra o
--     botão "letra" não abrir uma cifra;
--   • 1 link de cifra com domínio quebrado (m.cifraclub.com sem o .br) corrigido;
--   • durações "0:00" viraram vazio.
--
-- Não veio no export e fica vazio: capa do álbum, tom da cifra (`cifra_tom`) e
-- a classificação Louvor/Adoração, que não tem coluna no nosso app.
-- ============================================================================

with dados (title, artist, song_key, bpm, cifra_url, letra_url, youtube_id, spotify_id, deezer_id, duracao_segundos) as (
  values
  ('Sobre as Águas'::text, 'Trazendo a Arca'::text, 'A'::text, 138::integer, 'https://m.cifraclub.com.br/trazendo-arca/sobre-as-aguas/'::text, 'https://www.vagalume.com.br/ministerio-trazendo-a-arca/sobre-as-aguas.html'::text, 'cqR7hNpMUtw'::text, null::text, '69922589'::text, null::integer),
  ('Me Atraiu (Ao Vivo)', 'Gabriela Rocha', 'E', 128, 'https://www.cifraclub.com.br/gabriela-rocha/me-atraiu', 'https://m.letras.mus.br/gabriela-rocha/me-atraiu/', 'Z6cONvRUFZQ', null, '2111539977', null),
  ('Reina em Mim', 'Ministério Vineyard', 'G', 102, 'https://www.cifraclub.com.br/vineyard/reina-em-mim', 'https://m.letras.mus.br/vineyard/75531/', 'bpabvrhSJ6Y', null, '729229632', null),
  ('O Cordeiro e o Leão (Ao Vivo)', 'Drops INA', 'C', 180, 'https://www.cifraclub.com.br/drops-gl-adolescentes/o-cordeiro-e-o-leao/', 'https://letras.mus.br/bethel-music/the-lion-and-the-lamb/', 'zmeOpNlPOh8', null, '642013862', null),
  ('Lindo És + Só Quero Ver Você (Ao Vivo)', 'Juliano Son', 'Em', 131, 'https://m.cifraclub.com.br/juliano-son/lindo-s/', 'https://m.letras.mus.br/juliano-son/lindo-es/', 'tjgFHeI9JGs', null, '673537562', null),
  ('Só Tu És Santo (Ao Vivo)', 'MORADA', 'C', 62, 'https://m.cifraclub.com.br/ministerio-morada/so-tu-s-santo/', 'https://m.letras.mus.br/ministerio-morada/so-tu-es-santo/', 'Krw3YIZI-Ps', null, '720204392', null),
  ('Essência da Adoração', 'David Quinlan', 'D', 68, 'https://www.cifraclub.com.br/david-quinlan/essencia-da-adoracao/', 'https://m.letras.mus.br/david-quinlan/190810/', 'ZfOpeP2SMx8', null, '553122742', null),
  ('Era Eu', 'Casa Worship', 'Em', 132, 'https://www.cifraclub.com.br/casa-worship/era-eu/', 'https://www.letras.mus.br/casa-worship/era-eu/', 'UsVFERf_5K0', null, '675771422', null),
  ('Nada Além do Sangue (Ao Vivo)', 'Fernandinho', 'A', 144, 'https://m.cifraclub.com.br/fernandinho/nada-alem-do-sangue/', 'https://m.letras.mus.br/fernandinho/1025731/', 'WhVtdWdST44', null, null, null),
  ('Ousado Amor', 'fhop music', 'C', 163, 'https://m.cifraclub.com.br/emi-sousa-fhop/ousado-amor/', null, 'VTGPhZmBXVM', null, null, null),
  ('Que Ele Cresça', 'Deigma Marques', 'A', 144, 'https://m.cifraclub.com.br/deigma-marques/que-ele-cresca/', 'https://m.letras.mus.br/deigma-marques/1893020/', 'DZQfsSygjWo', null, null, null),
  ('Atos 2', 'Gabriela Rocha', 'G', 158, 'https://www.cifraclub.com.br/gabriela-rocha/atos-2', 'https://www.vagalume.com.br/gabriela-rocha/atos-2.html', 'WWrU6LC_4ho', null, null, null),
  ('Com Alegria (Ao Vivo)', 'Nani Azevedo', 'D', 0, 'https://www.cifraclub.com.br/nani-azevedo/com-alegria', 'https://m.letras.mus.br/nani-azevedo/946655/', '3kFU-wG0m7A', null, null, null),
  ('A Ele a Glória / Porque Ele vive (Live 2020)', 'Gabriela Rocha', 'D', 136, 'https://www.cifraclub.com.br/gabriela-rocha/a-ele-a-gloria-porque-ele-vive-pot-pourri', 'https://m.letras.mus.br/gabriela-rocha/a-ele-a-gloria-porque-ele-vive-pot-pourri/', 'vsV404GaiYs', null, null, null),
  ('Todavia Me Alegrarei (Ao Vivo)', 'Samuel Messias', 'G', 65, 'https://www.cifraclub.com.br/leandro-soares/todavia-me-alegrarei/#key=7', 'https://m.letras.mus.br/samuel-messias/todavia-me-alegrarei/', '81GaF34veWA', null, '820700082', null),
  ('Bondade De Deus', 'Pedras Vivas', 'A', 126, 'https://m.cifraclub.com.br/ministerio-pedras-vivas/bondade-de-deus/', 'https://m.letras.mus.br/ministerio-pedras-vivas/bondade-de-deus/', 'coKTcmR0hgQ', null, '1585071252', null),
  ('Teu Amor Não Falha (Ao Vivo)', 'Nivea Soares', 'C', 114, 'https://m.cifraclub.com.br/nivea-soares/teu-amor-nao-falha/', 'https://m.letras.mus.br/nivea-soares/1980755/', '3q-pRKf-VaQ', null, '554480112', null),
  ('Vitorioso És (Ao Vivo)', 'fhop music', 'A', 70, 'https://m.cifraclub.com.br/emi-sousa-fhop/vitorioso-es-part-andre-aquino/', 'https://m.letras.mus.br/emi-sousa-fhop/vitorioso-es-part-andre-aquino/', 'WDvbo8EgIoc', null, '941401782', null),
  ('Eu Vou Construir (Ao Vivo)', 'ELESDOIS', 'E', 140, 'https://m.cifraclub.com.br/dunamis-movement/eu-vou-construir-part-elesdois/', 'https://m.letras.mus.br/dunamis-movement/eu-vou-construir-part-elesdois/', 'p0-icGD0r2w', null, '659594902', null),
  ('Eu Me Rendo', 'Renascer Praise', 'C', 150, 'https://www.cifraclub.com.br/renascer-praise/eu-me-rendo', 'https://m.letras.mus.br/renascer-praise/856021/', 'HWVuBlxj0Fg', null, '935584292', null),
  ('Grandes Coisas (Ao Vivo)', 'Fernandinho', 'D', 147, 'https://m.cifraclub.com.br/fernandinho/grandes-coisas/', 'https://m.letras.mus.br/fernandinho/1496920/', '5WxNEs9fxG0', null, '706248692', null),
  ('Rei do Meu Coração (Ao Vivo)', 'Be One Music', 'G', 136, 'https://m.cifraclub.com.br/be-one-music/rei-do-meu-coracao/', 'https://m.letras.mus.br/be-one-music/rei-do-meu-coracao-king-of-my-heart/', 'GQBJ2rZHAR8', null, '646857002', null),
  ('Maravilhosa Graça', 'Drops INA', 'A', 105, 'https://m.cifraclub.com.br/drops-gl-adolescentes/maravilhosa-graca/', 'https://m.letras.mus.br/drops-gl-adolescentes/maravilhosa-graca-this-is-amazing-grace/', 'nv-T2_JPKZA', null, '642013872', null),
  ('Santo Espírito', 'Laura Souguellis', 'E', 139, 'https://www.cifraclub.com.br/laura-souguellis/santo-espirito', 'https://m.letras.mus.br/laura-souguellis/santo-espirito-holy-spirit/', 'J2rTdu7vqTE', null, '1117435952', null),
  ('Tú Vives Entre os Querubins', 'Hemily Tatila', 'E', 0, null, null, 'TUhCrUTHdAg', null, null, null),
  ('Creio Que Tu És a Cura', 'Gabriela Rocha', 'D', 156, 'https://www.cifraclub.com.br/gabriela-rocha/creio-que-tu-es-a-cura/', 'https://www.vagalume.com.br/gabriela-rocha/creio-que-tu-es-a-cura.html', '4X0mSNyZcxQ', null, '1376289142', null),
  ('Te Agradeço (Ao Vivo)', 'Diante Do Trono', 'D', 144, 'https://m.cifraclub.com.br/diante-do-trono/te-agradeco/', 'https://m.letras.mus.br/diante-do-trono/432327/', 'JxelK0iWXpw', null, '582992862', null),
  ('A Bênção', 'Gabriel Guedes de Almeida', 'A', 140, 'https://m.cifraclub.com.br/gabriel-guedes/a-bencao/simplificada.html', 'https://m.letras.mus.br/gabriel-guedes/a-bencao-part-nivea-soares/', 'v8gaG2ed01I', null, '965608182', null),
  ('O Amor de Deus (Logo Eu) (Ao Vivo)', 'Rachel Novaes', 'A', 83, 'https://m.cifraclub.com.br/rachel-novaes/o-amor-de-deus/', 'https://m.letras.mus.br/rachel-novaes/o-amor-de-deus-logo-eu-part-paulo-cesar-baruk/', 't3uT_xGD4T0', null, '1637181942', null),
  ('Digno é o Senhor (Worthy Is The Lamb) (Ao Vivo)', 'Aline Barros', 'G', 76, 'https://m.cifraclub.com.br/aline-barros/digno-o-senhor--/', 'https://m.letras.mus.br/aline-barros/127758/', 'stKPXkcW5v8', null, '51546321', null),
  ('Toma o Teu Lugar', 'Diante Do Trono', 'G', 140, 'https://m.cifraclub.com.br/diante-do-trono/toma-o-teu-lugar-/', 'https://m.letras.mus.br/diante-do-trono/toma-o-teu-lugar/', '7KeFbagI_J8', null, '563355702', null),
  ('Caminho no Deserto', 'Marcio Couth', 'D', 69, 'https://m.cifraclub.com.br/marcio-couth/caminho-no-deserto/', 'https://m.letras.mus.br/marcio-couth/caminho-no-deserto/', '32Xz3QUDLLg', null, '850859162', null),
  ('Vinho e Pão (Ao Vivo)', 'Ipalpha', 'Ab', 0, 'https://www.cifraclub.com.br/ipalpha/vinho-e-pao', 'https://www.letras.mus.br/ipalpha/vinho-e-pao/', 'JheqX_w3m08', null, null, null),
  ('Pra Sempre (Ao Vivo)', 'Ministério Avivah', 'G', 144, 'https://m.cifraclub.com.br/ministerio-avivah/pra-sempre-forever/', 'https://m.letras.mus.br/ministerio-avivah/pra-sempre/', 'ishM2o8LW94', null, '681788582', null),
  ('Quebrantado', 'Ministério Vineyard', 'G', 94, 'https://m.cifraclub.com.br/vineyard/quebrantado/', 'https://m.letras.mus.br/vineyard-music-brasil/1354909/', 'OE3fYrynTzY', null, '930596672', null),
  ('Jesus Te Entronizamos (Ao Vivo)', 'Marcos Góes', 'E', 64, 'https://www.cifraclub.com.br/marcos-goes/jesus-te-entronizamos-trono-de-louvor', 'https://m.letras.mus.br/corinhos-evangelicos/1262045/', 'rpBCO9Ck4nA', null, '800525052', null),
  ('Teu Santo Nome (Ao Vivo)', 'Gabriela Rocha', 'G', 142, 'https://m.cifraclub.com.br/gabriela-rocha/teu-santo-nome/', 'https://m.letras.mus.br/gabriela-rocha/teu-santo-nome/', 'E3Y7sDChX9s', null, '137726397', null),
  ('Caminho no Deserto (Ao Vivo)', 'Marcio Couth', 'D', 69, 'https://m.cifraclub.com.br/marcio-couth/caminho-no-deserto/', 'https://m.letras.mus.br/marcio-couth/caminho-no-deserto/', '32Xz3QUDLLg', null, '850859162', null),
  ('Agnus Dei', 'David Quinlan', 'G', 141, 'https://www.cifraclub.com.br/david-quinlan/agnus-dei', 'https://m.letras.mus.br/david-quinlan/1227051/', 'E_CpWL4Ygs8', null, '559367642', null),
  ('Ao Erguermos as Mãos', 'Aline Barros', 'C', 156, 'https://m.cifraclub.com.br/aline-barros/ao-erguermos-as-maos/', 'https://m.letras.mus.br/aline-barros/1233732/', 'prKARWDrwEo', null, '93550108', null),
  ('Santo Pra Sempre (Ao Vivo)', 'Gabriel Guedes de Almeida', 'G', 144, 'https://m.cifraclub.com.br/gabriel-guedes/santo-pra-sempre/', 'https://www.azlyrics.com/lyrics/christomlin/holyforeverportugues.html', 'hYrzD4p9A40', null, null, null),
  ('Quão Grande é o Meu Deus', 'Soraya Moraes', 'G', 146, 'https://m.cifraclub.com.br/soraya-moraes/quao-grande-o-meu-deus/', 'https://m.letras.mus.br/soraya-moraes/grande-e-o-meu-deus/', 'IT827htf_S8', null, '804406232', null),
  ('Meu Respirar (Ao Vivo)', 'Ministério Vineyard', 'G', 120, 'https://m.cifraclub.com.br/vineyard/meu-respirar/', 'https://m.letras.mus.br/nivea-soares/1366569/', 'oyZ3-sCb2xY', null, '779993882', null),
  ('Maravilhoso (feat. Pra. Ludmila Ferber)', 'Ministério Koinonya de Louvor', 'G', 50, 'https://m.cifraclub.com.br/ministerio-koinonya-de-louvor/maravilhoso-s/', 'https://m.letras.mus.br/ministerio-koinonya-de-louvor/503334/', '0MYXrpczA_w', null, '680187102', null),
  ('Que Ele Cresça (Ao Vivo)', 'Nivea Soares', 'G', 72, 'https://www.cifraclub.com.br/nivea-soares/que-ele-cresca-part-nathanael-brito/letra/', 'https://www.letras.mus.br/nivea-soares/que-ele-cresca-part-nathanael-brito/', 'hDjFz6DOcQo', '297lnlXZD2tFe8wotWyaA8', null, null),
  ('Oferta de Amor (Acústico)', 'Louvor e Adoração Vida', 'G', 0, null, null, '37NTtPilj0A', null, '1236449012', null),
  ('Grande é o Senhor (Acústico Ao Vivo)', 'Adhemar De Campos', 'G', 118, 'https://m.cifraclub.com.br/adhemar-de-campos/grande-o-senhor/', 'https://m.letras.mus.br/nivea-soares/1094801/', 'Eu6pr3N-UXE', null, '779999722', null),
  ('Rei Dos Reis', 'Hillsong Em Português', 'D', 136, 'https://m.cifraclub.com.br/hillsong-brasil/rei-dos-reis/', 'https://www.letras.mus.br/hillsong-brasil/rei-dos-reis/', 'oMneWx9IPts', null, '845485932', null),
  ('Vem Esta é a Hora', 'Ministério Vineyard', 'D', 110, 'https://m.cifraclub.com.br/vineyard/vem-esta-a-hora/', 'https://m.letras.mus.br/vineyard/69527/', '7j5aLkEe_vE', null, '729229622', null),
  ('Oh, Quão Lindo Esse Nome É (Acústico)', 'Ana Nóbrega', 'D', 68, 'https://m.cifraclub.com.br/ana-nobrega/oh-quao-lindo-esse-nome-/', 'https://m.letras.mus.br/ana-nobrega/oh-quao-lindo-esse-nome-e-what-a-beautiful-name/', 'mTPgy4VuXyo', null, '1813930007', null),
  ('Aclame ao Senhor (Ao Vivo)', 'Diante Do Trono', 'G', 121, 'https://m.cifraclub.com.br/diante-do-trono/aclame-ao-senhor/', 'https://m.letras.mus.br/diante-do-trono/45465/', 'U4l40DvaeGw', null, '582992892', null),
  ('Eu Te Louvarei Meu Bom Jesus (Live)', 'Ronaldo Bezerra', 'D', 122, 'https://www.cifraclub.com.br/ronaldo-bezerra/eu-te-louvarei-meu-bom-jesus/', 'https://m.letras.mus.br/ronaldo-bezerra/173208/', 'Mxfwh4QZcUs', '1z3gUuVS16pXsLoCue4TNI', null, null),
  ('Santo, Santo (Ao Vivo)', 'Renascer Praise', 'C', 140, 'https://m.cifraclub.com.br/renascer-praise/santo-santo-santo/', null, '7D--TqO-dEs', null, '938933672', null),
  ('Cantai (Ao Vivo)', 'Marcos Góes', 'A', 0, 'https://m.cifraclub.com.br/marcos-goes/1029266/letra/original.html', 'https://m.letras.mus.br/marcos-goes/1029266/', 'qhXapfyShMM', null, '1064163882', null),
  ('Tu és + Águas Purificadoras (Ao vivo)', 'fhop music', 'D', 142, 'https://www.cifraclub.com.br/florianopolis-house-of-prayer/tu-es-aguas-purificadoras/', 'https://www.letras.mus.br/florianopolis-house-of-prayer/tu-es/', 'z_v7YtJwywI', '2xVe3wMbesHcOhqW8OoyS8', null, null),
  ('Meu Prazer / Não Há Deus Maior / Maravilhoso / Maior é Jesus', 'MORADA', 'D', 130, 'https://m.cifraclub.com.br/ministerio-morada/meu-prazer-nao-ha-deus-maior-maravilhoso-maior-e-jesus-pot-pourri/#tabs=false', 'https://www.letras.mus.br/ministerio-morada/meu-prazer-nao-ha-deus-maior-maravilhoso-maior-e-jesus-pot-pourri/', 'r1vsQufWeF4', null, '1894646167', null),
  ('Meu Prazer (feat. Marcio Pereira & Pra. Ludmila Ferber)', 'Ministério Koinonya de Louvor', 'G', 120, 'https://m.cifraclub.com.br/ministerio-koinonya-de-louvor/meu-prazer-em-espirito-em-verdade/', 'https://m.letras.mus.br/ministerio-koinonya-de-louvor/503335/', 'YBJHkUP_fbs', null, '680110292', null),
  ('Nosso Deus é Soberano (Gravado na Deezer, São Paulo)', 'Aline Barros', 'E', 135, 'https://m.cifraclub.com.br/aline-barros/nosso-deus-e-soberano/', 'https://m.letras.mus.br/aline-barros/nosso-deus-e-soberano/', 'SacFg6uq_EE', null, '849431842', null),
  ('Gratidão (Ao Vivo)', 'fhop music', 'D', 156, 'https://www.cifraclub.com.br/florianopolis-house-of-prayer/gratidao#tabs=false', 'https://m.letras.mus.br/florianopolis-house-of-prayer/gratidao/', '3SEz_SemHtk', null, '1631948782', null),
  ('Te Louvarei (Ao Vivo)', 'Trazendo a Arca', 'G', 130, 'https://m.cifraclub.com.br/toque-no-altar/te-louvarei/', 'https://m.letras.mus.br/trazendo-arca/1490746/', '-YTfVwUe-wY', null, '83087130', null),
  ('Descerá Sobre Ti', 'Comunidade de Nilópolis', 'G', 57, 'https://www.cifraclub.com.br/comunidade-de-nilopolis/descera-sobre-ti#instrument=keyboard&left=false&tabs=false', 'https://www.vagalume.com.br/comunidade-de-nilopolis/descera-sobre-ti.html', '0drvI6_XUK0', null, '1050203692', null),
  ('Vento Do Espírito', 'Comunidade de Nilópolis', 'C', 0, 'https://www.cifraclub.com.br/comunidade-de-nilopolis/descera-sobre-ti/', 'https://www.letras.mus.br/comunidade-de-nilopolis/189943/', 'JzSLAGyjDoU', null, '1050203702', null),
  ('Ao Único (Ao Vivo)', 'Marcos Góes', 'C', 0, null, null, 'IjgfBeBf9Sg', null, '803188052', null),
  ('Vem Me Buscar (Ao Vivo)', 'Jefferson & Suellen', 'G', 136, 'https://m.cifraclub.com.br/jefferson-e-suellen/vem-me-buscar/', 'https://m.letras.mus.br/jefferson-e-suellen/vem-me-buscar/', 't6Pd8gXIASU', null, '1564075132', null),
  ('Teu Reino (Ao Vivo)', 'Cristo Vivo', 'C', 140, 'https://www.cifraclub.com.br/ministerio-cristo-vivo/teu-reino', 'https://m.letras.mus.br/ministerio-cristo-vivo/1950960/', 'lMhEFpHzRsY', null, '621522952', null),
  ('Não Mais Escravos', 'Nivea Soares', 'C', 148, 'https://www.cifraclub.com.br/nivea-soares/nao-mais-escravos#tabs=false', 'https://m.letras.mus.br/nivea-soares/nao-mais-escravos/', '7p0V0LE9Avw', null, '1130502262', null),
  ('A Tua Mesa Cura (Ao Vivo)', 'Thamires Garcia', 'C', 132, 'https://m.cifraclub.com.br/thamires-garcia/a-tua-mesa-cura/', 'https://www.letras.mus.br/thamires-garcia/a-tua-mesa-cura/', 'uslQPyqpovY', null, '1974594147', null),
  ('Vitória no Deserto', 'Aline Barros', 'G', 141, 'https://m.cifraclub.com.br/aline-barros/vitoria-no-deserto/', 'https://m.letras.mus.br/aline-barros/1763516/', 'TWBdN9qGL2c', null, '121402628', null),
  ('Glorioso Dia (Ao Vivo)', 'Arieta Magrini', 'G', 110, 'https://www.cifraclub.com.br/rafael-bicudo/glorioso-dia/', 'https://m.letras.mus.br/rafael-bicudo/glorioso-dia/', 'UEBe_pVlVkc', null, '1892114277', null),
  ('Seja Adorado', 'Ministério Sarando a Terra Ferida', 'C', 104, 'https://m.cifraclub.com.br/ministerio-sarando-terra-ferida/seja-adorado/#key=3', 'https://m.letras.mus.br/ministerio-sarando-terra-ferida/725414/', 'eL7chQAdDPQ', null, '93551082', null),
  ('Se Não For Pra Te Adorar (Ao Vivo)', 'Fernandinho', 'C', 113, 'https://www.cifraclub.com.br/fernandinho/se-nao-for-pra-te-adorar', 'https://m.letras.mus.br/fernandinho/1619355/', 'T1Cq7O0-b_U', null, '694743602', null),
  ('Digno de Glória', 'Geração Fiel', 'C', 100, 'https://m.cifraclub.com.br/asaph-borba/digno-de-gloria/', 'https://m.letras.mus.br/asaph-borba/1103987/', 'AmJbrNtz118', null, '457534932', null),
  ('Poderoso Deus (Ao Vivo)', 'Soraya Moraes', 'F', 67, 'https://www.cifraclub.com.br/soraya-moraes/soberano-deus/', 'https://www.letras.mus.br/soraya-moraes/455996/', 's0YWTaCamZ8', null, '1971389987', null),
  ('Deus Proverá', 'Gabriela Gomes', 'C', 143, 'https://m.cifraclub.com.br/gabriela-gomes/deus-provera/', 'https://m.letras.mus.br/gabriela-gomes/deus-provera/', '1i1673ILdVI', null, '471588542', null),
  ('Jesus Te Entronizamos (Ao Vivo)', 'André Santos Ministério Herança', 'E', 0, 'https://www.cifraclub.com.br/marcos-goes/jesus-te-entronizamos-trono-de-louvor', null, 'TQnE6Mn38mM', null, null, null),
  ('Exaltado (Ao Vivo)', 'Diante Do Trono', 'D', 151, 'https://m.cifraclub.com.br/diante-do-trono/exaltado/', 'https://m.letras.mus.br/diante-do-trono/45476/', 'QMZgOafcDZU', null, '1145523032', null),
  ('Preciso de Ti', 'Diante Do Trono', 'A', 143, 'https://m.cifraclub.com.br/diante-do-trono/preciso-de-ti/', 'https://m.letras.mus.br/diante-do-trono/65064/', 'Hy6QJ6LJW2I', null, '1242720492', null),
  ('Estamos de Pé (Ao Vivo)', 'Marcus Salles', 'D', 104, 'https://m.cifraclub.com.br/marcus-salles/estamos-de-pe/', 'https://m.letras.mus.br/marcus-salles/estamos-de-pe/', '4x-yrCz1D9g', null, '1145634452', null),
  ('Algo Novo (feat. Lukas Agustinho) (Ao Vivo)', 'Kemuel', 'G', 120, 'https://m.cifraclub.com.br/coral-kemuel/algo-novo-part-lukas-agustinho/', 'https://m.letras.mus.br/coral-kemuel/algo-novo-part-lukas-agustinho/', 'wWU1Bn6wy9o', null, '970942952', 408),
  ('Vim para Adorar-Te', 'Ministério Adoração & Adoradores', 'C', 76, 'https://m.cifraclub.com.br/adoracao-e-adoradores/vim-para-adorar-te/', 'https://m.letras.mus.br/adoracao-e-adoradores/225173/', '-4AAHPM98Do', null, '1288624222', 399),
  ('Senhor, Te Quero (Ao Vivo)', 'Ministério Vineyard', 'D', 72, 'https://m.cifraclub.com.br/vineyard/senhor-te-quero/', 'https://m.letras.mus.br/vineyard/69528/', 'JMV-K0d1QYQ', null, '779993842', 252),
  ('Me Derramar (Ao Vivo)', 'Ministério Vineyard', 'G', 118, 'https://m.cifraclub.com.br/vineyard/me-derramar/', 'https://m.letras.mus.br/vineyard/507826/', 'qsmHYPk4XGM', null, '779993872', 328),
  ('É Ele', 'Drops INA', 'F', 140, 'https://www.cifraclub.com.br/drops-ina/e-ele/', 'https://www.letras.mus.br/drops-ina/e-ele/', 'L3b2gRB7YVc', null, null, 495),
  ('Pode Morar Aqui', 'Theo Rubia', 'G', 134, 'https://www.cifraclub.com.br/theo-rubia/pode-morar-aqui', 'https://m.letras.mus.br/theo-rubia/pode-morar-aqui/', 'n0fDvJAyrQ8', null, '690133172', 566),
  ('Quero Conhecer Jesus', 'Alessandro Vilas Boas', 'E', 130, 'https://www.cifraclub.com.br/alessandro-vilas-boas/quero-conhecer-jesus-o-meu-amado--o-mais-belo', 'https://www.vagalume.com.br/alessandro-vilas-boas/quero-conhecer-jesus.html', 'dnxkpr6UAMI', null, '382526311', 360),
  ('Águas Purificadoras (Ao Vivo)', 'Diante Do Trono', 'D', 140, 'https://m.cifraclub.com.br/diante-do-trono/aguas-purificadoras/', 'https://m.letras.mus.br/diante-do-trono/80790/', 'ziR49ui-G28', null, '565486912', 965),
  ('Há Poder (Ao Vivo)', 'fhop music', 'B', 150, 'https://www.cifraclub.com.br/florianopolis-house-of-prayer/ha-poder/', 'https://www.letras.mus.br/florianopolis-house-of-prayer/ha-poder/', '4WmlJFsxDv4', '2R36AGg58WMkV0IISiO8Cm', null, 436),
  ('A Casa É Sua', 'Casa Worship', 'G', 67, 'https://m.cifraclub.com.br/casa-worship/a-casa-e-sua/', 'https://m.letras.mus.br/casa-worship/a-casa-e-sua/', '5QHF5OQeFOs', null, '646771622', 562),
  ('É Tudo Sobre Você (Ao Vivo)', 'MORADA', 'Am', 138, 'https://m.cifraclub.com.br/ministerio-morada/e-tudo-sobre-voce/', 'https://m.letras.mus.br/ministerio-morada/e-tudo-sobre-voce/', 'ePdRgBWhvog', null, '947669932', 372),
  ('Vida Aos Sepulcros (Ao Vivo)', 'Gabriela Rocha', 'E', 70, 'https://m.cifraclub.com.br/gabriela-rocha/vida-aos-sepulcros-part-elevation-worship/', 'https://m.letras.mus.br/gabriela-rocha/vida-aos-sepulcros-part-elevation-worship/', 'wfFTSbxyI1M', null, '2163576487', 351),
  ('Vou Seguir com Fé', 'Kleber Lucas', 'C', 112, null, 'https://m.letras.mus.br/kleber-lucas/109773/', 'X9OBwXwEDF8', null, '93545136', 243),
  ('Corpo e Família (Ao Vivo)', 'Daniel Souza', 'G', 68, null, 'https://m.letras.mus.br/frutos-do-espirito/171510/', 'Ddv4ono_BYk', null, '85569002', 249),
  ('Canção do Apocalipse (Ao Vivo)', 'Diante Do Trono', 'E', 123, 'https://m.cifraclub.com.br/diante-do-trono/cancao-do-apocalipse/', 'https://m.letras.mus.br/diante-do-trono/1708842/', '5j0arvaKdqk', null, '565493212', 437),
  ('Consagração / Louvor ao Rei (Ao Vivo)', 'Aline Barros', 'G', 120, 'https://m.cifraclub.com.br/aline-barros/consagracao/', 'https://m.letras.mus.br/aline-barros/44039/', 'YxgHK8rt52U', null, '51546771', 449),
  ('Canção Ao Cordeiro (Ao Vivo)', 'Israel Salazar', 'E', 134, 'https://m.cifraclub.com.br/israel-salazar/cancao-ao-cordeiro-part-gabriel-guedes/', 'https://m.letras.mus.br/israel-salazar/cancao-ao-cordeiro-part-gabriel-guedes/', 'bxMzZVfh7zc', null, '907413122', 365),
  ('Quando Ele Vem (Live)', 'André Aquino', 'C', 70, null, 'https://www.google.com/url?sa=t&source=web&rct=j&url=https://m.letras.mus.br/andre-aquino/quando-ele-vem/&ved=2ahUKEwj74rfSyv_yAhWkqJUCHa9iBu4QFnoECCkQAQ&usg=AOvVaw0BnnZ7OdqacLDKugbn1Rnp', 'p3Raz8HuDjU', null, '1494312162', 576),
  ('Escape', 'Renascer Praise', 'D', 127, null, 'https://www.letras.mus.br/renascer-praise/escape/', 'vM2A2XEm9TE', '3hEB1O2VaMmcqqS3UMlFiR', null, 426),
  ('Eu Posso Ouvir os Anjos (Ao Vivo)', 'Clamor Pelas Nações', 'A', 69, 'https://www.cifraclub.com.br/clamor-pelas-nacoes/eu-posso-ouvir-os-anjos', 'https://m.letras.mus.br/clamor-pelas-nacoes/eu-posso-ouvir-os-anjos/', 'WMPE5ZsDM4A', null, '1004640612', 561),
  ('Abra os Olhos do Meu Coração', 'David Quinlan', 'C', 112, null, 'https://www.vagalume.com.br/david-quinlan/abra-os-olhos-do-meu-coracao.html', 'DRmzDXXPLhA', null, '1147860822', 310),
  ('Poderoso Deus', 'Antonio Cirilo', 'D', 124, null, 'https://m.letras.mus.br/antonio-cirilo/607173/', 'Ccgc30YTWVo', null, '68744639', 889),
  ('Primeira Essência (Ao Vivo)', 'Felipe Rodrigues', 'C', 150, 'https://www.cifraclub.com.br/felipe-rodrigues/primeira-essencia-ministracao-ao-vivo/principal.html#instrument=guitar&capo=0&key=3', 'https://www.letras.mus.br/felipe-rodrigues/primeira-essencia-ministracao-ao-vivo/', 'eO9dUp5goWo', null, null, 345),
  ('Sinto Fluir (Ao Vivo)', 'Marcelo Markes', 'G', 124, 'https://www.cifraclub.com.br/marcelo-markes/sinto-fluir/simplificada.html#instrument=guitar&capo=0&key=10', 'https://m.letras.mus.br/marcelo-markes/sinto-fluir/', 'bwUJsH6bVEI', null, '731328122', 462),
  ('Aleluia (Hallelujah)', 'Gabriela Rocha', 'F', 0, 'https://www.cifraclub.com.br/gabriela-rocha/aleluia-hallelujah/', 'https://www.letras.mus.br/gabriela-rocha/1788765/', 'ic7LToE6DMs', null, null, 212),
  ('Que Se Abram os Céus (Ao Vivo)', 'Nivea Soares', 'A', 128, 'https://m.cifraclub.com.br/nivea-soares/que-se-abra-os-ceus/', 'https://m.letras.mus.br/nivea-soares/que-se-abram-os-ceus/', 'kXKwkQk528A', null, '554475352', 471),
  ('A Promessa Nasceu', 'Aline Barros', 'E', 160, 'https://www.cifraclub.com.br/aline-barros/a-promessa-nasceu-part-sarah-beatriz/', 'https://www.letras.mus.br/aline-barros/a-promessa-nasceu-part-sarah-beatriz/', 'MqTAbY0aysU', null, null, 306),
  ('Messias (Ao Vivo)', 'Bruna Karla', 'G', 0, 'https://www.cifraclub.com.br/bruna-karla/messias-part-averly-morillo/#font=16&key=10', 'https://www.letras.mus.br/bruna-karla/messias/', 'NnsJnm41A6M', null, null, 489),
  ('Eu Também (100 Bilhões X) [So Will I (100 Bilion X)]', 'Ministério Mergulhar', 'A', 128, 'https://www.cifraclub.com.br/ministerio-mergulhar/eu-tambem-100-bilhoes-x-so-will-i-100-billion-x-part-paulo-cesar-baruk/', 'https://www.letras.mus.br/coral-kemuel/eu-tambem-100-bilhoes-x/', '2h9phefQ_n0', '0yYgUPbdBnA4TmYOiD1lLc', null, 419),
  ('Isaías 9 (Ao Vivo)', 'Adoração Central', 'C', 151, 'https://www.cifraclub.com.br/rodox/isaias-9/#instrument=keyboard&tabs=false&key=5', 'https://www.letras.mus.br/rodolfo-abrantes/462838/', 'soQha3BUEsc', '6P8os6KEKDrfvljaceib2J', null, 653),
  ('Ruja o Leão / Que Se Abram Os Céus (Ao Vivo)', 'Isaías Saad', 'G', 138, 'https://m.cifraclub.com.br/isaias-saad/ruja-o-leao-que-se-abram-os-ceus-part-nivea-soares/', 'https://m.letras.mus.br/isaias-saad/ruja-o-leao-que-se-abram-os-ceus-part-nivea-soares/', 'gTRFVMkMajw', null, '1522355242', 454),
  ('Alto Preço (Ao Vivo)', 'Asaph Borba', 'Em', 115, 'https://m.cifraclub.com.br/asaph-borba/alto-preco/', 'https://www.letras.mus.br/diante-do-trono/2002315/', 'paQ2gSPpmTI', null, null, 262),
  ('Faz Chover', 'Trazendo a Arca', 'C', 133, 'https://www.cifraclub.com.br/toque-no-altar/faz-chover', 'https://m.letras.mus.br/toque-no-altar/185318/', 'K6msUXuzL7A', null, '83087154', 378),
  ('Eu Navegarei', 'Gabriela Rocha', 'G#m', 70, 'https://www.cifraclub.com.br/gabriela-rocha/eu-navegarei', 'https://m.letras.mus.br/gabriela-rocha/eu-navegarei/', 'nSvxVCdj_gU', null, '547001022', 469),
  ('Em Fervente Oração', 'Vigília dos Asafes', 'A', 80, 'https://www.cifraclub.com.br/coral-kemuel/em-fervente-oracao', 'https://m.letras.mus.br/harpa-crista/853757/', 'BViQsKhsaGs', null, '2168075637', 484),
  ('Autoridade e Poder', 'Marcos Góes', 'G', 134, 'https://m.cifraclub.com.br/bola-de-neve/autoridade-poder/', 'https://m.letras.mus.br/marcos-goes/1027334/', 'OW4C_vdjOJA', null, '821945362', 233),
  ('Me Leva Onde Eu Possa Ouvir Tua Voz (Ao Vivo)', 'Amilcar Sampaio', 'G', 147, 'https://m.cifraclub.com.br/filhos-do-homem/me-leva-onde-eu-possa-ouvir/', 'https://m.letras.mus.br/filhos-do-homem/me-leva-onde-eu-possa-ouvir/', 'w8W6tLUoG2Y', '0WdBsKjycJEpFGXVLShDuZ', null, 439),
  ('O Mover do Espírito', 'Ludmila Ferber', 'F', 66, 'https://www.cifraclub.com.br/ludmila-ferber/o-mover-do-espirito', 'https://www.letras.mus.br/ludmila-ferber/1654067/', '9PoWnXjRXUw', null, '1516980572', 303),
  ('Digno de Tudo + Te Exaltamos (Ao Vivo)', 'Nivea Soares', 'C', 140, 'https://www.cifraclub.com.br/nivea-soares/digno-de-tudo-te-exaltamos/', 'https://www.letras.mus.br/nivea-soares/digno-de-tudo-te-exaltamos/', '9ot039R1-G0', null, null, 546),
  ('Emanuel (Ao Vivo)', 'Rachel Novaes', 'Bb', 146, null, 'https://www.letras.mus.br/rachel-novaes/emanuel/', 'NmEM3BUpMRs', null, null, 275),
  ('Clamo Jesus', 'Marcelo Markes', 'E', 0, 'https://www.cifraclub.com.br/paulo-cesar-baruk/clamo-jesus/principal.html#instrument=guitar&key=7', null, '3trzD2eZMJo', null, null, 416),
  ('Quem É Esse? (Ao Vivo)', 'Julliany Souza', 'E', 62, 'https://www.cifraclub.com.br/julliany-souza/quem-e-esse/', 'https://www.letras.mus.br/julliany-souza/quem-e-esse/', '0ZF5em0MTwY', null, null, 468),
  ('Em Teus Braços', 'Laura Souguellis', 'C', 134, 'https://m.cifraclub.com.br/laura-souguellis/em-teus-bracos/', 'https://www.vagalume.com.br/laura-souguellis/em-teus-bracos.html', 'IxpWNuxGmzc', null, '1117435972', 735),
  ('Lindo Momento (Ao Vivo)', 'Julliany Souza', 'D', 125, 'https://www.cifraclub.com.br/julliany-souza/lindo-momento/principal.html#instrument=guitar&key=7', 'https://www.letras.mus.br/julliany-souza/lindo-momento/', 'xcC3Xh3PFcE', '396JT3FtF2kk9lxvLQqEaH', null, 893),
  ('Nada Mais', 'David Quinlan', 'A', 135, 'https://m.cifraclub.com.br/david-quinlan/nada-mais/', 'https://m.letras.mus.br/david-quinlan/nada-mais/', 'keBReHEDyOI', null, '1264883242', 460),
  ('Essência da Adoração + Nada Mais', 'Amor em Movimento', 'D', 0, 'https://m.cifraclub.com.br/ruslayra/essencia-da-adoracao-nada-mais/', 'https://www.letras.mus.br/ruslayra/essencia-da-adoracao-nada-mais-pot-pourri/', '0hN17vnkJXA', null, null, 278),
  ('Ele Vem / A Cidade Santa (Ao Vivo)', 'Julia Vitória', 'E', 71, 'https://www.cifraclub.com.br/julia-vitoria/ele-vem-part-aline-barros/principal.html#instrument=guitar&key=8', 'https://m.letras.mus.br/julia-vitoria/ele-vem-part-aline-barros/', 'TwHY-eD3Prs', null, '1013377022', 329),
  ('Tu És Deus (A Ele) (Ao Vivo)', 'O Canto das Igrejas', 'C', 70, 'https://www.cifraclub.com.br/o-canto-das-igrejas/tu-es-deus-a-ele/', 'https://www.letras.mus.br/o-canto-das-igrejas/tu-es-deus-a-ele/', 'VjrhgThb6uk', '1Gol2VjZYbYBsptumlr8jy', null, 304),
  ('Medley Te Agradeço (Ao Vivo)', 'Diante Do Trono', 'G', 72, 'https://m.cifraclub.com.br/diante-do-trono/te-agradeco-cancao-do-apocalipse-relance-exaltado-a-ele-a-gloria-pot-pourri/', 'https://www.letras.mus.br/diante-do-trono/medley-te-agradeco-part-brunao-morada-gabi-sampaio-e-isaque-valadao/', '8gKsfcIvnt0', '6kD7kT7Ti8VPP6TmQvef6I', null, 389),
  ('Aliança (feat. Bené Gomes & Asaph Borba)', 'Ministério Koinonya de Louvor', 'A', 129, null, 'https://www.letras.mus.br/ministerio-koinonya-de-louvor/544060/', '7XNFu7mA_JM', null, '647730662', null),
  ('Digno É o Senhor', 'Felipe Rodrigues', 'E', 136, 'https://www.cifraclub.com.br/felipe-rodrigues/digno-e-o-senhor/', 'https://www.letras.mus.br/felipe-rodrigues/digno-e-o-senhor/', 'Ja0h1aGvMKo', null, '1413792522', 414),
  ('Toda Terra (Ao Vivo)', 'Gabriela Rocha', 'E', 132, 'https://www.cifraclub.com.br/gabriela-rocha/toda-terra-ao-vivo', 'https://www.letras.mus.br/gabriela-rocha/toda-terra/', 'I1vgtswaIfE', '409bxok0eao5dfqJfL3Mot', null, 519),
  ('Nada mais (Ao Vivo)', 'fhop music', 'D', 68, 'https://www.cifraclub.com.br/florianopolis-house-of-prayer/nada-mais/', 'https://www.letras.mus.br/florianopolis-house-of-prayer/nada-mais-espontaneo/', 'N5AMmLZjaaM', '6kEHJYuyiiu4tL0k6AcHh1', null, 452),
  ('Cordeiro e Leão (Ao Vivo)', 'Jefferson & Suellen', 'D', 136, 'https://www.cifraclub.com.br/jefferson-e-suellen/cordeiro-e-leao/', 'https://www.letras.mus.br/jefferson-e-suellen/cordeiro-e-leao/', 'SKS7zkEEqrM', '4bxDGghFKLGfffrcC311N4', null, 590),
  ('Eu Só Quero Tua Presença (feat. Léo Brandão) (Ao Vivo)', 'Theo Rubia', 'D', 68, 'https://www.cifraclub.com.br/theo-rubia/eu-so-quero-tua-presenca#tabs=false', 'https://m.letras.mus.br/theo-rubia/eu-so-quero-tua-presenca/', 'o4AGQdUujss', null, '1589515782', 598),
  ('Preciso De Ti', 'AMÉM', 'G', 132, 'https://www.cifraclub.com.br/casa-worship/preciso-de-ti', 'https://m.letras.mus.br/casa-worship/preciso-de-ti/', 'ieyQpi1j78E', null, '2099409987', 357),
  ('Me Batiza Com Fogo (Acústico)', 'Carol Braga', null, 0, 'https://www.cifraclub.com.br/carol-braga/me-batiza-com-fogo-part-delino-marcal/principal.html#instrument=guitar&key=5', null, null, null, null, 565),
  ('Filho Amado', 'Laura Souguellis', 'E', 144, 'https://www.cifraclub.com.br/laura-souguellis/filho-amado', 'https://www.letras.mus.br/laura-souguellis/filho-amado/', 'WSlljnC9kjo', null, '1117436012', 630),
  ('Yeshua', 'UPPERROOM', 'C', 132, 'https://tabs.ultimate-guitar.com/tab/upperroom/yeshua-chords-4899025', null, 'fD7VWFbt96A', '0jEO23hlTtCADAjB7M45Vv', null, 596),
  ('Quero Descer', 'Raquel Mello', 'C', 70, 'https://www.cifraclub.com.br/raquel-mello/quero-descer', 'https://m.letras.mus.br/raquel-mello/1537891/', '54KoKyrqg-4', null, null, 288),
  ('Isaías 9 (Ao Vivo)', 'Carol Braga', 'B', 67, 'https://www.cifraclub.com.br/rodolfo-abrantes/isaias-9/principal.html#instrument=guitar&capo=0&key=2', 'https://www.letras.mus.br/carol-braga/isaias-9/', 'mSXgE_SS2y8', '7pDBInMbuT4CR8PYt9aUAX', null, 415),
  ('Poderoso Deus Eterno (Ao Vivo)', 'Davi Silva', 'G', 67, 'https://www.cifraclub.com.br/davi-silva/poderoso-deus-eterno', 'https://www.letras.mus.br/davi-silva/poderoso-deus-eterno/', 'koIgcP9bq_0', null, '1589590182', 582),
  ('Jesus Em Tua Presença (Ao Vivo)', 'MORADA', 'C', 71, 'https://m.cifraclub.com.br/ministerio-morada/jesus-em-tua-presenca/', 'https://m.letras.mus.br/ministerio-morada/jesus-em-tua-presenca/', 'aMpM68cb5MY', null, '963931722', 281),
  ('Sonda-me, Usa-me', 'Aline Barros', 'C', 124, 'https://m.cifraclub.com.br/aline-barros/sonda-me-usa-me/', 'https://m.letras.mus.br/aline-barros/1131959/', 'MzLBmGf1fSQ', null, '104305904', 397),
  ('Primeiro Amor', 'Carlinhos Felix', 'A', 131, 'https://cifraclub.com.br/carlinhos-felix/primeiro-amor/', 'https://m.letras.mus.br/rebanhao/48342/', 'BkClEfwVLw8', null, '1422719452', 303),
  ('Rompendo em Fé', 'Comunidade Evangélica Internacional da Zona Sul', 'D', 136, 'https://m.cifraclub.com.br/comunidade-da-zona-sul/rompendo-em-fe/', 'https://m.letras.mus.br/comunidade-da-zona-sul/83989/', 'pUxWGafvFQw', null, '93547506', 352),
  ('Meu Coração É Teu / Pra Te Adorar', 'Gabriela Rocha', 'D', 132, 'https://m.cifraclub.com.br/gabriela-rocha/meu-coracao--teu--pra-te-adorar-pot-pourri/', 'https://m.letras.mus.br/gabriela-rocha/meu-coracao-teu-pra-te-adorar-medley/', 'wmSSzDZUmSY', null, '547001012', 344),
  ('Eu e Minha Casa', 'Julliany Souza', 'F', 134, 'https://www.cifraclub.com.br/julliany-souza/eu-e-minha-casa-part-leo-brandao/', 'https://www.letras.mus.br/julliany-souza/eu-e-minha-casa-part-leo-brandao/', 'Rxzi3DSBs6Q', '0GD31r9na0U0TLJ3xO2Att', null, 360),
  ('Primeiro Amor', 'MORADA', 'A', 90, 'https://www.cifraclub.com.br/ministerio-morada/primeiro-amor#instrument=keyboard&left=false&tabs=false', 'https://m.letras.mus.br/ministerio-morada/primeiro-amor/', 'cvJ8OOAffWw', null, '1790555167', 310)
),

-- ─── Passo 1: inserir só o que ainda não existe ────────────────────────────
novas as (
  insert into public.songs
    (title, artist, song_key, bpm, cifra_url, letra_url, youtube_id, spotify_id, deezer_id, duracao_segundos, in_repertoire)
  select
    d.title, d.artist, coalesce(d.song_key, ''), coalesce(d.bpm, 0),
    d.cifra_url, d.letra_url,
    coalesce(d.youtube_id, ''), coalesce(d.spotify_id, ''),
    d.deezer_id, d.duracao_segundos, true
  from dados d
  where not exists (
    select 1 from public.songs s
     where lower(btrim(s.title))  = lower(btrim(d.title))
       and lower(btrim(s.artist)) = lower(btrim(d.artist))
  )
  returning 1
)

-- ─── Passo 2: completar buracos nas músicas que já existiam ─────────────────
-- Só preenche o que está vazio. Nada que você já cadastrou é sobrescrito.
-- (Este UPDATE enxerga o banco como ele estava antes do INSERT acima, então
--  ele mexe apenas nas músicas que já existiam — as recém-inseridas já vieram
--  completas.)
update public.songs s
   set cifra_url        = coalesce(nullif(s.cifra_url, ''), d.cifra_url),
       letra_url        = coalesce(nullif(s.letra_url, ''), d.letra_url),
       youtube_id       = case when coalesce(s.youtube_id, '') = '' then coalesce(d.youtube_id, '') else s.youtube_id end,
       spotify_id       = case when coalesce(s.spotify_id, '') = '' then coalesce(d.spotify_id, '') else s.spotify_id end,
       deezer_id        = coalesce(s.deezer_id, d.deezer_id),
       duracao_segundos = coalesce(s.duracao_segundos, d.duracao_segundos),
       song_key         = case when coalesce(s.song_key, '') = '' then coalesce(d.song_key, '') else s.song_key end,
       bpm              = case when coalesce(s.bpm, 0) = 0 then coalesce(d.bpm, 0) else s.bpm end
  from dados d
 where lower(btrim(s.title))  = lower(btrim(d.title))
   and lower(btrim(s.artist)) = lower(btrim(d.artist));


-- ─── Conferência (rode depois, separado, se quiser) ────────────────────────
select count(*)                                              as total_musicas,
       count(*) filter (where coalesce(cifra_url,'')  <> '') as com_cifra,
       count(*) filter (where coalesce(letra_url,'')  <> '') as com_letra,
       count(*) filter (where coalesce(youtube_id,'') <> '') as com_youtube,
       count(*) filter (where coalesce(spotify_id,'') <> '') as com_spotify,
       count(*) filter (where duracao_segundos is not null)  as com_duracao
  from public.songs;
