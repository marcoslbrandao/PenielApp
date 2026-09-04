-- ============================================================================
-- Versículo do dia: sai do código e vai pro banco.
--
-- Antes a lista vivia num array fixo em `lib/versiculoDoDia.ts`, e a rotação
-- era calculada no aparelho a partir da data LOCAL dele. Duas consequências:
-- quem estava em outro fuso via um versículo diferente do resto da igreja, e
-- o servidor não tinha como saber qual era o versículo do dia — logo, não
-- dava pra notificar.
--
-- Agora a lista é uma tabela, o índice do dia é calculado do mesmo jeito nos
-- dois lados (app e servidor), e a virada é às 5h do Reino Unido para todo
-- mundo, onde quer que esteja. A notificação sai às 7h do Reino Unido, com
-- duas horas de folga para nunca falar de um versículo que ainda não virou.
--
-- De quebra, o Admin passa a poder editar versículos sem precisar de OTA.
-- ============================================================================

create table if not exists public.versiculos (
  id uuid primary key default gen_random_uuid(),
  -- Posição na rotação. É o que define a ordem — não usar created_at, que
  -- mudaria a sequência inteira se alguém recadastrar um versículo.
  ordem int not null,
  ref text not null,
  pt text not null,
  en text not null,
  es text not null,
  fr text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists versiculos_ordem_key on public.versiculos (ordem);

alter table public.versiculos enable row level security;

drop policy if exists "Qualquer um vê os versículos" on public.versiculos;
create policy "Qualquer um vê os versículos"
  on public.versiculos for select using (true);

drop policy if exists "Admin gerencia os versículos" on public.versiculos;
create policy "Admin gerencia os versículos"
  on public.versiculos for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- Idioma do aparelho, pra notificação sair na língua de cada pessoa.
-- Nulo = português (idioma principal da igreja).
alter table public.push_tokens
  add column if not exists idioma text;

-- ── Índice do dia ───────────────────────────────────────────────────────────
-- Mesma conta que o app faz: hora do Reino Unido menos 5 horas, dia do ano,
-- módulo a quantidade de versículos ativos. `Europe/London` cuida do horário
-- de verão sozinho.
create or replace function public.versiculo_indice_do_dia()
returns int
language sql
stable
as $$
  select floor(
    extract(epoch from ((now() at time zone 'Europe/London') - interval '5 hours'))
    / 86400
  )::bigint::int;
$$;

-- Hora atual no Reino Unido (0-23). A Edge Function do push consulta isto
-- para só disparar quando são 7h em Londres: o cron do Postgres roda em UTC,
-- e o horário de verão britânico faria a notificação escorregar uma hora
-- duas vezes por ano se o horário fosse fixado em UTC.
create or replace function public.hora_do_reino_unido()
returns int
language sql
stable
as $$
  select extract(hour from (now() at time zone 'Europe/London'))::int;
$$;

create or replace function public.versiculo_do_dia()
returns setof public.versiculos
language plpgsql
stable
as $$
declare n int;
begin
  select count(*) into n from public.versiculos where ativo;
  if n = 0 then return; end if;
  return query
    select * from public.versiculos
     where ativo
     order by ordem
     offset (((public.versiculo_indice_do_dia() % n) + n) % n)
     limit 1;
end;
$$;

insert into public.versiculos (ordem, ref, pt, en, es, fr) values
  (0, 'Jeremias 29:11', 'Porque eu sei os planos que tenho para vocês, diz o Senhor, planos de prosperidade e não de calamidade, para dar a vocês esperança e um futuro.', 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.', 'Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.', 'Car je connais les projets que j''ai formés sur vous, dit l''Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l''espérance.'),
  (1, 'Filipenses 4:13', 'Tudo posso naquele que me fortalece.', 'I can do all things through Christ which strengtheneth me.', 'Todo lo puedo en Cristo que me fortalece.', 'Je puis tout par celui qui me fortifie.'),
  (2, 'Salmos 23:1', 'O Senhor é o meu pastor; de nada terei falta.', 'The LORD is my shepherd; I shall not want.', 'Jehová es mi pastor; nada me faltará.', 'L’Éternel est mon berger: je ne manquerai de rien.'),
  (3, 'Salmos 37:5', 'Entrega o teu caminho ao Senhor; confia nele, e o mais ele fará.', 'Commit thy way unto the LORD; trust also in him; and he shall bring it to pass.', 'Encomienda a Jehová tu camino, y confía en él; y él hará.', 'Recommande ton sort à l’Éternel, mets en lui ta confiance, et il agira.'),
  (4, 'Isaías 41:10', 'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a destra da minha justiça.', 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.', 'No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia.', 'Ne crains rien, car je suis avec toi; ne promène pas des regards inquiets, car je suis ton Dieu; je te fortifie, je viens à ton secours, je te soutiens de ma droite triomphante.'),
  (5, 'João 3:16', 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.', 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.', 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.', 'Car Dieu a tant aimé le monde qu’il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu’il ait la vie éternelle.'),
  (6, 'Eclesiastes 3:1', 'Tudo tem o seu tempo determinado, e há tempo para todo propósito debaixo do céu.', 'To every thing there is a season, and a time to every purpose under the heaven.', 'Todo tiene su tiempo, y todo lo que se quiere debajo del cielo tiene su hora.', 'Il y a un temps pour toute chose, et un temps pour toute affaire sous les cieux.'),
  (7, 'Provérbios 3:5', 'Confia no Senhor de todo o teu coração e não te apoies no teu próprio entendimento.', 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.', 'Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.', 'Confie-toi en l’Éternel de tout ton cœur, et ne t’appuie pas sur ta sagesse.'),
  (8, 'Deuteronômio 31:6', 'Sede fortes e corajosos; não temais, nem vos atemorizeis diante deles, porque o Senhor teu Deus é o que vai contigo; não te deixará, nem te desamparará.', 'Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.', 'Esforzaos y cobrad ánimo; no temáis, ni tengáis miedo de ellos: que Jehová tu Dios es el que va contigo; no te dejará ni te desamparará.', 'Fortifiez-vous et ayez du courage! Ne craignez point et ne soyez point effrayés devant eux; car l’Éternel, ton Dieu, marchera lui-même avec toi, il ne te délaissera point, il ne t’abandonnera point.'),
  (9, 'Filipenses 4:4', 'Alegrai-vos sempre no Senhor; outra vez digo, alegrai-vos.', 'Rejoice in the Lord alway: and again I say, Rejoice.', 'Regocijaos en el Señor siempre. Otra vez digo: Regocijaos.', 'Réjouissez-vous toujours dans le Seigneur; je le répète, réjouissez-vous.'),
  (10, 'Salmos 27:1', 'O Senhor é a minha luz e a minha salvação; a quem temerei?', 'The LORD is my light and my salvation; whom shall I fear?', 'Jehová es mi luz y mi salvación; ¿de quién temeré?', 'L’Éternel est ma lumière et mon salut: de qui aurais-je crainte?'),
  (11, 'Mateus 11:28', 'Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.', 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.', 'Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.', 'Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos.'),
  (12, 'Mateus 6:33', 'Buscai primeiro o Reino de Deus, e a sua justiça, e todas essas coisas vos serão acrescentadas.', 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.', 'Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.', 'Cherchez premièrement le royaume et la justice de Dieu; et toutes ces choses vous seront données par-dessus.'),
  (13, '2 Coríntios 5:17', 'Portanto, se alguém está em Cristo, é nova criatura; as coisas antigas já passaram; eis que tudo se fez novo.', 'Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.', 'De modo que si alguno está en Cristo, nueva criatura es; las cosas viejas pasaron; he aquí todas son hechas nuevas.', 'Si quelqu’un est en Christ, il est une nouvelle création. Les choses anciennes sont passées; voici, toutes choses sont devenues nouvelles.'),
  (14, 'Filipenses 4:6', 'Não andeis ansiosos por coisa alguma; em tudo, porém, sejam conhecidas, diante de Deus, as vossas petições, pela oração e súplicas, com ações de graças.', 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.', 'Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias.', 'Ne vous inquiétez de rien; mais en toute chose faites connaître vos besoins à Dieu par des prières et des supplications, avec des actions de grâces.'),
  (15, 'Números 6:24-25', 'O Senhor te abençoe, e te guarde; o Senhor faça resplandecer o seu rosto sobre ti, e tenha misericórdia de ti.', 'The LORD bless thee, and keep thee: The LORD make his face shine upon thee, and be gracious unto thee.', 'Jehová te bendiga, y te guarde: Jehová haga resplandecer su rostro sobre ti, y tenga de ti misericordia.', 'Que l’Éternel te bénisse, et qu’il te garde! Que l’Éternel fasse luire sa face sur toi, et qu’il t’accorde sa grâce!'),
  (16, 'Salmos 31:24', 'Sejam fortes e corajosos, todos vocês que esperam no Senhor.', 'Be of good courage, and he shall strengthen your heart, all ye that hope in the LORD.', 'Esforzaos todos vosotros los que esperáis en Jehová, y tome aliento vuestro corazón.', 'Fortifiez-vous et que votre cœur s’affermisse, vous tous qui espérez en l’Éternel!'),
  (17, 'João 8:32', 'E conhecereis a verdade, e a verdade vos libertará.', 'And ye shall know the truth, and the truth shall make you free.', 'Y conoceréis la verdad, y la verdad os hará libres.', 'vous connaîtrez la vérité, et la vérité vous affranchira.'),
  (18, '1 Pedro 5:7', 'Lancem sobre ele toda a sua ansiedade, porque ele tem cuidado de vocês.', 'Casting all your care upon him; for he careth for you.', 'Echando toda vuestra ansiedad sobre él, porque él tiene cuidado de vosotros.', 'et déchargez-vous sur lui de tous vos soucis, car lui-même prend soin de vous.'),
  (19, 'Lucas 1:37', 'Pois, com Deus, nada é impossível.', 'For with God nothing shall be impossible.', 'Porque no hay nada imposible para Dios.', 'car rien n’est impossible à Dieu.'),
  (20, '1 Coríntios 13:4', 'O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha.', 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up.', 'El amor es sufrido, es benigno; el amor no tiene envidia, el amor no es jactancioso, no se envanece.', 'La charité est patiente, elle est pleine de bonté; la charité n’est point envieuse; la charité ne se vante point, elle ne s’enfle point d’orgueil.'),
  (21, 'Salmos 46:10', 'Aquietai-vos, e sabei que eu sou Deus.', 'Be still, and know that I am God.', 'Estad quietos, y conoced que yo soy Dios.', 'Arrêtez, et sachez que je suis Dieu.'),
  (22, 'Mateus 6:34', 'Portanto, não andem ansiosos pelo dia de amanhã, pois o amanhã trará as suas próprias ansiedades. Basta a cada dia o seu próprio mal.', 'Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself. Sufficient unto the day is the evil thereof.', 'Así que, no os afanéis por el día de mañana, que el día de mañana traerá su afán. Basta a cada día su propio mal.', 'Ne vous inquiétez donc pas du lendemain; car le lendemain aura soin de lui-même. A chaque jour suffit sa peine.'),
  (23, '2 Coríntios 9:15', 'Graças a Deus pelo seu dom inefável!', 'Thanks be unto God for his unspeakable gift.', 'Gracias a Dios por su don inefable.', 'Grâces soient rendues à Dieu pour son don ineffable!'),
  (24, 'Salmos 23:4', 'Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo.', 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.', 'Aunque ande en valle de sombra de muerte, no temeré mal alguno, porque tú estarás conmigo.', 'Quand je marche dans la vallée de l’ombre de la mort, je ne crains aucun mal, car tu es avec moi.'),
  (25, 'Isaías 40:31', 'Mas os que esperam no Senhor renovarão as suas forças, subirão com asas como águias.', 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.', 'Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas; correrán, y no se cansarán; caminarán, y no se fatigarán.', 'mais ceux qui se confient en l’Éternel renouvellent leur force. Ils prennent le vol comme les aigles; ils courent, et ne se lassent point, ils marchent, et ne se fatiguent point.'),
  (26, 'Salmos 118:24', 'Este é o dia que o Senhor fez; regozijemo-nos e alegremo-nos nele.', 'This is the day which the LORD hath made; we will rejoice and be glad in it.', 'Este es el día que hizo Jehová; nos gozaremos y alegraremos en él.', 'C’est ici la journée que l’Éternel a faite: qu’elle soit pour nous un sujet d’allégresse et de joie!'),
  (27, 'Neemias 8:10', 'A alegria do Senhor é a força de vocês.', 'The joy of the LORD is your strength.', 'El gozo de Jehová es vuestra fuerza.', 'la joie de l’Éternel sera votre force.'),
  (28, 'Romanos 8:31', 'Se Deus é por nós, quem será contra nós?', 'If God be for us, who can be against us?', 'Si Dios es por nosotros, ¿quién contra nosotros?', 'Si Dieu est pour nous, qui sera contre nous?'),
  (29, 'Salmos 139:23', 'Examina-me, ó Deus, e conhece o meu coração; prova-me, e conhece os meus pensamentos.', 'Search me, O God, and know my heart: try me, and know my thoughts.', 'Examíname, oh Dios, y conoce mi corazón; pruébame y conoce mis pensamientos.', 'Sonde-moi, ô Dieu, et connais mon cœur! Éprouve-moi, et connais mes pensées!'),
  (30, 'Salmos 143:10', 'Ensina-me a fazer a tua vontade, pois tu és o meu Deus; guie-me o teu bom Espírito por terreno plano.', 'Teach me to do thy will; for thou art my God: thy spirit is good; lead me into the land of uprightness.', 'Enséñame a hacer tu voluntad, porque tú eres mi Dios; tu buen espíritu me guíe a tierra de rectitud.', 'Enseigne-moi à faire ta volonté! Car tu es mon Dieu. Que ton bon esprit me conduise sur la voie droite!'),
  (31, 'Salmos 145:18', 'Perto está o Senhor de todos os que o invocam, de todos os que o invocam em verdade.', 'The LORD is nigh unto all them that call upon him, to all that call upon him in truth.', 'Cercano está Jehová a todos los que le invocan, a todos los que le invocan de veras.', 'L’Éternel est près de tous ceux qui l’invoquent, de tous ceux qui l’invoquent avec sincérité.'),
  (32, 'Naum 1:7', 'O Senhor é bom, um refúgio no tempo da angústia; ele protege aqueles que nele confiam.', 'The LORD is good, a strong hold in the day of trouble; and he knoweth them that trust in him.', 'Bueno es Jehová para fortaleza en el día de la angustia; y conoce a los que en él confían.', 'L’Éternel est bon, il est un refuge au jour de la détresse; il connaît ceux qui se confient en lui.'),
  (33, 'Isaías 40:29', 'Ele dá força ao cansado e multiplica o vigor daquele que não tem forças.', 'He giveth power to the faint; and to them that have no might he increaseth strength.', 'Él da esfuerzo al cansado, y multiplica las fuerzas al que no tiene ningunas.', 'Il donne de la force à celui qui est fatigué, et il augmente la vigueur de celui qui tombe en défaillance.'),
  (34, 'Salmos 37:4', 'Deleita-te também no Senhor, e ele te concederá o que deseja o teu coração.', 'Delight thyself also in the LORD; and he shall give thee the desires of thine heart.', 'Deléitate asimismo en Jehová, y él te concederá las peticiones de tu corazón.', 'Fais de l’Éternel tes délices, et il te donnera ce que ton cœur désire.'),
  (35, 'Salmos 103:2', 'Bendiga, ó minha alma, ao Senhor, e não esqueça nenhum dos seus benefícios.', 'Bless the LORD, O my soul, and forget not all his benefits.', 'Bendice, alma mía, a Jehová, y no olvides ninguno de sus beneficios.', 'Bénis l’Éternel, ô mon âme, et n’oublie aucun de ses bienfaits!'),
  (36, 'Lucas 1:37', 'Porque para Deus nada é impossível.', 'For with God nothing shall be impossible.', 'Porque no hay nada imposible para Dios.', 'car rien n’est impossible à Dieu.'),
  (37, 'Efésios 5:2', 'Cristo, que nos amou e a si mesmo se entregou por nós.', 'Christ also loved us, and gave himself for us.', 'Cristo nos amó, y se entregó a sí mismo por nosotros.', 'Christ nous a aimés, et s’est livré lui-même pour nous.'),
  (38, 'Efésios 4:24', 'Portanto, revistam-se da nova natureza, criada para ser semelhante a Deus em justiça e em santidade provenientes da verdade.', 'And that ye put on the new man, which after God is created in righteousness and true holiness.', 'y vestíos del nuevo hombre, creado según Dios en la justicia y santidad de la verdad.', 'et à revêtir l’homme nouveau, créé selon Dieu dans une justice et une sainteté que produit la vérité.'),
  (39, 'Salmos 128:1', 'Feliz aquele que teme ao Senhor e anda nos seus caminhos.', 'Blessed is every one that feareth the LORD; that walketh in his ways.', 'Bienaventurado todo aquel que teme a Jehová, que anda en sus caminos.', 'Heureux tout homme qui craint l’Éternel, qui marche dans ses voies!'),
  (40, 'Salmos 34:8', 'Provai e vede que o Senhor é bom; feliz é o homem que nele se refugia.', 'O taste and see that the LORD is good: blessed is the man that trusteth in him.', 'Gustad, y ved que es bueno Jehová: Bienaventurado el hombre que confía en él.', 'Sentez et voyez combien l’Éternel est bon! Heureux l’homme qui cherche en lui son refuge!'),
  (41, 'Romanos 12:2', 'Não vos amoldeis a este mundo, mas transformai-vos pela renovação da vossa mente.', 'And be not conformed to this world: but be ye transformed by the renewing of your mind.', 'No os conforméis a este siglo, sino transformaos por medio de la renovación de vuestro entendimiento.', 'Ne vous conformez pas au siècle présent, mais soyez transformés par le renouvellement de l’intelligence.'),
  (42, 'Salmos 138:8', 'O Senhor cumprirá o seu propósito em mim; a tua benignidade, Senhor, é para sempre.', 'The LORD will perfect that which concerneth me: thy mercy, O LORD, endureth for ever.', 'Jehová cumplirá su propósito en mí; tu misericordia, oh Jehová, es para siempre.', 'L’Éternel agira en ma faveur. Éternel, ta bonté dure toujours.'),
  (43, 'Eclesiastes 4:6', 'Mais vale um punhado de descanso do que dois punhados de trabalho, com fadiga e aflição de espírito.', 'Better is an handful with quietness, than both the hands full with travail and vexation of spirit.', 'Mejor es un puño lleno con descanso, que ambos puños llenos con trabajo y aflicción de espíritu.', 'Mieux vaut une main pleine avec repos, que les deux mains pleines avec travail et poursuite du vent.'),
  (44, 'Salmos 103:13', 'Assim como o pai se compadece de seus filhos, também o Senhor se compadece daqueles que o temem.', 'Like as a father pitieth his children, so the LORD pitieth them that fear him.', 'Como el padre se compadece de los hijos, se compadece Jehová de los que le temen.', 'Comme un père a compassion de ses enfants, l’Éternel a compassion de ceux qui le craignent.'),
  (45, '2 Coríntios 12:9', 'A minha graça é suficiente para você, pois o meu poder se aperfeiçoa na fraqueza.', 'My grace is sufficient for thee: for my strength is made perfect in weakness.', 'Bástate mi gracia; porque mi poder se perfecciona en la debilidad.', 'Ma grâce te suffit, car ma puissance s’accomplit dans la faiblesse.'),
  (46, 'Hebreus 13:9', 'Não vos deixem levar por nenhuma espécie de ensinos estranhos, pois é bom que o coração seja fortalecido pela graça.', 'Be not carried about with divers and strange doctrines. For it is a good thing that the heart be established with grace.', 'No os dejéis llevar de doctrinas diversas y extrañas; porque buena cosa es que el corazón sea afirmado por la gracia.', 'Ne vous laissez pas entraîner par des doctrines diverses et étrangères; car il est bon que le cœur soit affermi par la grâce.'),
  (47, 'Hebreus 4:12', 'A palavra de Deus é viva e eficaz, e mais cortante do que qualquer espada de dois gumes.', 'For the word of God is quick, and powerful, and sharper than any twoedged sword.', 'Porque la palabra de Dios es viva y eficaz, y más cortante que toda espada de dos filos.', 'Car la parole de Dieu est vivante et efficace, plus tranchante qu’aucune épée à deux tranchants.'),
  (48, 'Salmos 119:105', 'A tua palavra é lâmpada para os meus pés e luz para o meu caminho.', 'Thy word is a lamp unto my feet, and a light unto my path.', 'Lámpara es a mis pies tu palabra, y lumbrera a mi camino.', 'Ta parole est une lampe à mes pieds, et une lumière sur mon sentier.'),
  (49, '2 Timóteo 3:16', 'Toda a Escritura é inspirada por Deus e útil para o ensino, para a repreensão, para a correção e para a instrução na justiça.', 'All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness.', 'Toda la Escritura es inspirada por Dios, y útil para enseñar, para redargüir, para corregir, para instruir en justicia.', 'Toute Écriture est inspirée de Dieu, et utile pour enseigner, pour convaincre, pour corriger, pour instruire dans la justice.')
on conflict (ordem) do nothing;
