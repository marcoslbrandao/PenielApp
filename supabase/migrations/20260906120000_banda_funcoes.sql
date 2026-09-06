-- ============================================================================
-- Funções da banda: catálogo editável + quem exerce o quê
--
-- Até aqui os instrumentos eram OITO valores fixos no código
-- (`INSTRUMENTOS` em BandaScreen.tsx) e a escala guardava o slug ('teclado').
-- Isso impedia duas coisas que o ministério precisa: acrescentar uma função
-- nova sem publicar uma versão do app, e saber quem toca o quê ANTES de abrir
-- a escala — hoje só dá pra descobrir olhando culto por culto.
--
-- `banda_funcoes`      catálogo do ministério (nome + emoji + ordem).
-- `banda_membro_funcoes` N:N pessoa × função, com uma marcada como principal.
--
-- A escala continua guardando `instrumento text` (não `funcao_id`) de
-- propósito: são centenas de linhas históricas em culto_escala/ensaio_escala/
-- banda_time_membros, e trocar por FK obrigaria a inventar função pra cada
-- valor antigo. O texto passa a ser o NOME da função ('Teclado'), e o emoji é
-- buscado no catálogo por nome — se alguém renomear uma função, as linhas
-- antigas só perdem o emoji, nunca o dado.
-- ============================================================================

create table if not exists public.banda_funcoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) > 0 and char_length(nome) <= 40),
  emoji text not null default '🎵' check (char_length(emoji) <= 8),
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Sem duas funções com o mesmo nome, ignorando maiúsculas e espaços — senão
-- vira "Teclado" e "teclado" na mesma lista e ninguém sabe qual usar.
create unique index if not exists banda_funcoes_nome_unico
  on public.banda_funcoes (lower(trim(nome)));

create table if not exists public.banda_membro_funcoes (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.banda_membros(id) on delete cascade,
  funcao_id uuid not null references public.banda_funcoes(id) on delete cascade,
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  unique (membro_id, funcao_id)
);

create index if not exists banda_membro_funcoes_membro_idx
  on public.banda_membro_funcoes (membro_id);

-- ── Foto do integrante ──────────────────────────────────────────────────────
-- A lista de equipe precisa da foto, mas a policy de SELECT de `profiles` só
-- deixa cada um ver o próprio perfil — o mesmo motivo pelo qual `nome` já vive
-- denormalizado aqui. A foto segue o mesmo caminho, mantida em dia por gatilho.
alter table public.banda_membros add column if not exists avatar_url text;

update public.banda_membros m
set avatar_url = p.avatar_url
from public.profiles p
where p.id = m.profile_id and m.avatar_url is distinct from p.avatar_url;

create or replace function public.sync_banda_membro_do_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.banda_membros
     set nome = coalesce(new.full_name, nome),
         avatar_url = new.avatar_url
   where profile_id = new.id;
  return new;
end;
$$;

drop trigger if exists profiles_sync_banda_membro on public.profiles;
create trigger profiles_sync_banda_membro
  after update of full_name, avatar_url on public.profiles
  for each row execute function public.sync_banda_membro_do_perfil();

-- ── Catálogo inicial ────────────────────────────────────────────────────────
-- Os 8 instrumentos que já existiam no código vêm primeiro, na mesma ordem, pra
-- ninguém estranhar; o resto veio do que a banda já usa na prática. Tudo isso é
-- editável no app — inclusive os emojis, que são só um ponto de partida.
insert into public.banda_funcoes (nome, emoji, ordem) values
  ('Vocal',        '🎤', 10),
  ('Ministro',     '🎙️', 20),
  ('Violão',       '🪕', 30),
  ('Guitarra',     '🎸', 40),
  ('Baixo',        '🎸', 50),
  ('Bateria',      '🥁', 60),
  ('Teclado',      '🎹', 70),
  ('Outro',        '🎵', 80),
  ('Piano',        '🎹', 90),
  ('Violino',      '🎻', 100),
  ('Saxofone',     '🎷', 110),
  ('Flauta',       '🪈', 120),
  ('Acordeão',     '🪗', 130),
  ('Percussão',    '🪘', 140),
  ('Mesa de som',  '🎛️', 150),
  ('Projeção',     '📽️', 160)
on conflict do nothing;

-- ── Slugs antigos viram os nomes do catálogo ────────────────────────────────
-- Uma vez só: depois desta migração o app grava o nome direto.
do $$
declare
  v_de text;
  v_para text;
  v_mapa text[][] := array[
    array['vocal', 'Vocal'], array['ministro', 'Ministro'], array['violao', 'Violão'],
    array['guitarra', 'Guitarra'], array['baixo', 'Baixo'], array['bateria', 'Bateria'],
    array['teclado', 'Teclado'], array['outro', 'Outro']
  ];
  i int;
begin
  for i in 1 .. array_length(v_mapa, 1) loop
    v_de := v_mapa[i][1];
    v_para := v_mapa[i][2];
    update public.culto_escala       set instrumento = v_para where instrumento = v_de;
    update public.ensaio_escala      set instrumento = v_para where instrumento = v_de;
    update public.banda_time_membros set instrumento = v_para where instrumento = v_de;
  end loop;
end $$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Mesmo critério dos times e do resto da banda: quem está na banda vê e
-- gerencia. O app é que reserva os botões de criar/apagar pro admin.
alter table public.banda_funcoes enable row level security;
alter table public.banda_membro_funcoes enable row level security;

drop policy if exists "Banda vê as funções" on public.banda_funcoes;
create policy "Banda vê as funções"
  on public.banda_funcoes for select using (public.is_banda_membro());

drop policy if exists "Banda gerencia as funções" on public.banda_funcoes;
create policy "Banda gerencia as funções"
  on public.banda_funcoes for all
  using (public.is_banda_membro()) with check (public.is_banda_membro());

drop policy if exists "Banda vê as funções dos integrantes" on public.banda_membro_funcoes;
create policy "Banda vê as funções dos integrantes"
  on public.banda_membro_funcoes for select using (public.is_banda_membro());

drop policy if exists "Banda gerencia as funções dos integrantes" on public.banda_membro_funcoes;
create policy "Banda gerencia as funções dos integrantes"
  on public.banda_membro_funcoes for all
  using (public.is_banda_membro()) with check (public.is_banda_membro());

comment on table public.banda_funcoes is 'Catálogo de funções do ministério (Vocal, Teclado, Mesa de som...), editável no app.';
comment on table public.banda_membro_funcoes is 'Quais funções cada integrante exerce; `principal` marca a de sempre.';
comment on column public.banda_membros.avatar_url is 'Cópia de profiles.avatar_url, mantida pelo gatilho profiles_sync_banda_membro.';
