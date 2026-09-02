-- ============================================================================
-- Remover as músicas de teste — as que já estavam no app antes da importação
--
-- REGRA: sai tudo que NÃO veio da exportação do LouveApp (comparando título +
-- artista). Isso resolve de quebra os 2 títulos que estavam repetidos de
-- verdade: "A Bênção" (Gabriel Guedes, do teste) e "Quão Grande é o Meu Deus"
-- (Chris Tomlin, do teste).
--
-- NÃO mexe nos 4 títulos que aparecem duas vezes mas são músicas DIFERENTES,
-- e que vieram as duas do próprio LouveApp:
--   • Isaías 9 (Ao Vivo) — Adoração Central  e  Carol Braga
--   • Primeiro Amor — Carlinhos Felix  e  MORADA
--   • Preciso de Ti — Diante Do Trono  e  AMÉM
--   • Jesus Te Entronizamos (Ao Vivo) — Marcos Góes  e  André Santos Ministério Herança
-- Apagar um lado desses seria perder repertório de verdade.
--
-- TRAVA DE SEGURANÇA: uma música que esteja em algum culto ou ensaio NÃO é
-- apagada — a chave estrangeira é ON DELETE CASCADE, e ela sumiria do setlist
-- junto, sem aviso. Essas aparecem no resultado como MANTIDA, pra você decidir.
--
-- O resultado lista exatamente o que saiu e o que ficou.
-- ============================================================================

with importadas (title, artist) as (
  values
  ('Sobre as Águas'::text, 'Trazendo a Arca'::text),
  ('Me Atraiu (Ao Vivo)', 'Gabriela Rocha'),
  ('Reina em Mim', 'Ministério Vineyard'),
  ('O Cordeiro e o Leão (Ao Vivo)', 'Drops INA'),
  ('Lindo És + Só Quero Ver Você (Ao Vivo)', 'Juliano Son'),
  ('Só Tu És Santo (Ao Vivo)', 'MORADA'),
  ('Essência da Adoração', 'David Quinlan'),
  ('Era Eu', 'Casa Worship'),
  ('Nada Além do Sangue (Ao Vivo)', 'Fernandinho'),
  ('Ousado Amor', 'fhop music'),
  ('Que Ele Cresça', 'Deigma Marques'),
  ('Atos 2', 'Gabriela Rocha'),
  ('Com Alegria (Ao Vivo)', 'Nani Azevedo'),
  ('A Ele a Glória / Porque Ele vive (Live 2020)', 'Gabriela Rocha'),
  ('Todavia Me Alegrarei (Ao Vivo)', 'Samuel Messias'),
  ('Bondade De Deus', 'Pedras Vivas'),
  ('Teu Amor Não Falha (Ao Vivo)', 'Nivea Soares'),
  ('Vitorioso És (Ao Vivo)', 'fhop music'),
  ('Eu Vou Construir (Ao Vivo)', 'ELESDOIS'),
  ('Eu Me Rendo', 'Renascer Praise'),
  ('Grandes Coisas (Ao Vivo)', 'Fernandinho'),
  ('Rei do Meu Coração (Ao Vivo)', 'Be One Music'),
  ('Maravilhosa Graça', 'Drops INA'),
  ('Santo Espírito', 'Laura Souguellis'),
  ('Tú Vives Entre os Querubins', 'Hemily Tatila'),
  ('Creio Que Tu És a Cura', 'Gabriela Rocha'),
  ('Te Agradeço (Ao Vivo)', 'Diante Do Trono'),
  ('A Bênção', 'Gabriel Guedes de Almeida'),
  ('O Amor de Deus (Logo Eu) (Ao Vivo)', 'Rachel Novaes'),
  ('Digno é o Senhor (Worthy Is The Lamb) (Ao Vivo)', 'Aline Barros'),
  ('Toma o Teu Lugar', 'Diante Do Trono'),
  ('Caminho no Deserto', 'Marcio Couth'),
  ('Vinho e Pão (Ao Vivo)', 'Ipalpha'),
  ('Pra Sempre (Ao Vivo)', 'Ministério Avivah'),
  ('Quebrantado', 'Ministério Vineyard'),
  ('Jesus Te Entronizamos (Ao Vivo)', 'Marcos Góes'),
  ('Teu Santo Nome (Ao Vivo)', 'Gabriela Rocha'),
  ('Caminho no Deserto (Ao Vivo)', 'Marcio Couth'),
  ('Agnus Dei', 'David Quinlan'),
  ('Ao Erguermos as Mãos', 'Aline Barros'),
  ('Santo Pra Sempre (Ao Vivo)', 'Gabriel Guedes de Almeida'),
  ('Quão Grande é o Meu Deus', 'Soraya Moraes'),
  ('Meu Respirar (Ao Vivo)', 'Ministério Vineyard'),
  ('Maravilhoso (feat. Pra. Ludmila Ferber)', 'Ministério Koinonya de Louvor'),
  ('Que Ele Cresça (Ao Vivo)', 'Nivea Soares'),
  ('Oferta de Amor (Acústico)', 'Louvor e Adoração Vida'),
  ('Grande é o Senhor (Acústico Ao Vivo)', 'Adhemar De Campos'),
  ('Rei Dos Reis', 'Hillsong Em Português'),
  ('Vem Esta é a Hora', 'Ministério Vineyard'),
  ('Oh, Quão Lindo Esse Nome É (Acústico)', 'Ana Nóbrega'),
  ('Aclame ao Senhor (Ao Vivo)', 'Diante Do Trono'),
  ('Eu Te Louvarei Meu Bom Jesus (Live)', 'Ronaldo Bezerra'),
  ('Santo, Santo (Ao Vivo)', 'Renascer Praise'),
  ('Cantai (Ao Vivo)', 'Marcos Góes'),
  ('Tu és + Águas Purificadoras (Ao vivo)', 'fhop music'),
  ('Meu Prazer / Não Há Deus Maior / Maravilhoso / Maior é Jesus', 'MORADA'),
  ('Meu Prazer (feat. Marcio Pereira & Pra. Ludmila Ferber)', 'Ministério Koinonya de Louvor'),
  ('Nosso Deus é Soberano (Gravado na Deezer, São Paulo)', 'Aline Barros'),
  ('Gratidão (Ao Vivo)', 'fhop music'),
  ('Te Louvarei (Ao Vivo)', 'Trazendo a Arca'),
  ('Descerá Sobre Ti', 'Comunidade de Nilópolis'),
  ('Vento Do Espírito', 'Comunidade de Nilópolis'),
  ('Ao Único (Ao Vivo)', 'Marcos Góes'),
  ('Vem Me Buscar (Ao Vivo)', 'Jefferson & Suellen'),
  ('Teu Reino (Ao Vivo)', 'Cristo Vivo'),
  ('Não Mais Escravos', 'Nivea Soares'),
  ('A Tua Mesa Cura (Ao Vivo)', 'Thamires Garcia'),
  ('Vitória no Deserto', 'Aline Barros'),
  ('Glorioso Dia (Ao Vivo)', 'Arieta Magrini'),
  ('Seja Adorado', 'Ministério Sarando a Terra Ferida'),
  ('Se Não For Pra Te Adorar (Ao Vivo)', 'Fernandinho'),
  ('Digno de Glória', 'Geração Fiel'),
  ('Poderoso Deus (Ao Vivo)', 'Soraya Moraes'),
  ('Deus Proverá', 'Gabriela Gomes'),
  ('Jesus Te Entronizamos (Ao Vivo)', 'André Santos Ministério Herança'),
  ('Exaltado (Ao Vivo)', 'Diante Do Trono'),
  ('Preciso de Ti', 'Diante Do Trono'),
  ('Estamos de Pé (Ao Vivo)', 'Marcus Salles'),
  ('Algo Novo (feat. Lukas Agustinho) (Ao Vivo)', 'Kemuel'),
  ('Vim para Adorar-Te', 'Ministério Adoração & Adoradores'),
  ('Senhor, Te Quero (Ao Vivo)', 'Ministério Vineyard'),
  ('Me Derramar (Ao Vivo)', 'Ministério Vineyard'),
  ('É Ele', 'Drops INA'),
  ('Pode Morar Aqui', 'Theo Rubia'),
  ('Quero Conhecer Jesus', 'Alessandro Vilas Boas'),
  ('Águas Purificadoras (Ao Vivo)', 'Diante Do Trono'),
  ('Há Poder (Ao Vivo)', 'fhop music'),
  ('A Casa É Sua', 'Casa Worship'),
  ('É Tudo Sobre Você (Ao Vivo)', 'MORADA'),
  ('Vida Aos Sepulcros (Ao Vivo)', 'Gabriela Rocha'),
  ('Vou Seguir com Fé', 'Kleber Lucas'),
  ('Corpo e Família (Ao Vivo)', 'Daniel Souza'),
  ('Canção do Apocalipse (Ao Vivo)', 'Diante Do Trono'),
  ('Consagração / Louvor ao Rei (Ao Vivo)', 'Aline Barros'),
  ('Canção Ao Cordeiro (Ao Vivo)', 'Israel Salazar'),
  ('Quando Ele Vem (Live)', 'André Aquino'),
  ('Escape', 'Renascer Praise'),
  ('Eu Posso Ouvir os Anjos (Ao Vivo)', 'Clamor Pelas Nações'),
  ('Abra os Olhos do Meu Coração', 'David Quinlan'),
  ('Poderoso Deus', 'Antonio Cirilo'),
  ('Primeira Essência (Ao Vivo)', 'Felipe Rodrigues'),
  ('Sinto Fluir (Ao Vivo)', 'Marcelo Markes'),
  ('Aleluia (Hallelujah)', 'Gabriela Rocha'),
  ('Que Se Abram os Céus (Ao Vivo)', 'Nivea Soares'),
  ('A Promessa Nasceu', 'Aline Barros'),
  ('Messias (Ao Vivo)', 'Bruna Karla'),
  ('Eu Também (100 Bilhões X) [So Will I (100 Bilion X)]', 'Ministério Mergulhar'),
  ('Isaías 9 (Ao Vivo)', 'Adoração Central'),
  ('Ruja o Leão / Que Se Abram Os Céus (Ao Vivo)', 'Isaías Saad'),
  ('Alto Preço (Ao Vivo)', 'Asaph Borba'),
  ('Faz Chover', 'Trazendo a Arca'),
  ('Eu Navegarei', 'Gabriela Rocha'),
  ('Em Fervente Oração', 'Vigília dos Asafes'),
  ('Autoridade e Poder', 'Marcos Góes'),
  ('Me Leva Onde Eu Possa Ouvir Tua Voz (Ao Vivo)', 'Amilcar Sampaio'),
  ('O Mover do Espírito', 'Ludmila Ferber'),
  ('Digno de Tudo + Te Exaltamos (Ao Vivo)', 'Nivea Soares'),
  ('Emanuel (Ao Vivo)', 'Rachel Novaes'),
  ('Clamo Jesus', 'Marcelo Markes'),
  ('Quem É Esse? (Ao Vivo)', 'Julliany Souza'),
  ('Em Teus Braços', 'Laura Souguellis'),
  ('Lindo Momento (Ao Vivo)', 'Julliany Souza'),
  ('Nada Mais', 'David Quinlan'),
  ('Essência da Adoração + Nada Mais', 'Amor em Movimento'),
  ('Ele Vem / A Cidade Santa (Ao Vivo)', 'Julia Vitória'),
  ('Tu És Deus (A Ele) (Ao Vivo)', 'O Canto das Igrejas'),
  ('Medley Te Agradeço (Ao Vivo)', 'Diante Do Trono'),
  ('Aliança (feat. Bené Gomes & Asaph Borba)', 'Ministério Koinonya de Louvor'),
  ('Digno É o Senhor', 'Felipe Rodrigues'),
  ('Toda Terra (Ao Vivo)', 'Gabriela Rocha'),
  ('Nada mais (Ao Vivo)', 'fhop music'),
  ('Cordeiro e Leão (Ao Vivo)', 'Jefferson & Suellen'),
  ('Eu Só Quero Tua Presença (feat. Léo Brandão) (Ao Vivo)', 'Theo Rubia'),
  ('Preciso De Ti', 'AMÉM'),
  ('Me Batiza Com Fogo (Acústico)', 'Carol Braga'),
  ('Filho Amado', 'Laura Souguellis'),
  ('Yeshua', 'UPPERROOM'),
  ('Quero Descer', 'Raquel Mello'),
  ('Isaías 9 (Ao Vivo)', 'Carol Braga'),
  ('Poderoso Deus Eterno (Ao Vivo)', 'Davi Silva'),
  ('Jesus Em Tua Presença (Ao Vivo)', 'MORADA'),
  ('Sonda-me, Usa-me', 'Aline Barros'),
  ('Primeiro Amor', 'Carlinhos Felix'),
  ('Rompendo em Fé', 'Comunidade Evangélica Internacional da Zona Sul'),
  ('Meu Coração É Teu / Pra Te Adorar', 'Gabriela Rocha'),
  ('Eu e Minha Casa', 'Julliany Souza'),
  ('Primeiro Amor', 'MORADA')
),

-- Tudo que não veio do LouveApp, com a contagem de usos em setlists
alvos as (
  select s.id, s.title, s.artist,
         (select count(*) from public.culto_songs  cs where cs.song_id = s.id)
       + (select count(*) from public.ensaio_songs es where es.song_id = s.id) as usos
    from public.songs s
   where not exists (
     select 1 from importadas i
      where lower(btrim(i.title))  = lower(btrim(s.title))
        and lower(btrim(i.artist)) = lower(btrim(s.artist))
   )
),

removidas as (
  delete from public.songs s
   using alvos a
   where s.id = a.id
     and a.usos = 0
  returning s.title, s.artist
)

select 'REMOVIDA'                  as situacao, r.title, r.artist, 0 as em_setlists
  from removidas r
union all
select 'MANTIDA (está em setlist)' as situacao, a.title, a.artist, a.usos
  from alvos a
 where a.usos > 0
 order by 1, 2;
