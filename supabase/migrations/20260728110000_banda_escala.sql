-- ============================================================================
-- Escala da Banda: quem toca o quê em cada culto/ensaio
--
-- `banda_membros`: diretório dos integrantes da banda, com nome já
-- denormalizado. Necessário porque a policy de SELECT de `profiles` só
-- libera o próprio usuário ver o próprio nome (auth.uid() = id) — sem essa
-- tabela, um líder não conseguiria nem listar quem mais está na banda pra
-- escalar. É preenchida sozinha: sempre que alguém resgata o código de
-- acesso da banda (`use_banda_code`), a função grava o nome aqui também.
--
-- `culto_escala` / `ensaio_escala`: uma linha por pessoa+instrumento num
-- culto ou ensaio específico (ex: "Ana — Teclado", "Lucas — Baixo"). Mesma
-- pessoa pode aparecer mais de uma vez no mesmo evento com instrumentos
-- diferentes (ex: também faz backing vocal), mas não duas vezes com o
-- mesmo instrumento.
-- ============================================================================

create table if not exists public.banda_membros (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

alter table public.banda_membros enable row level security;

drop policy if exists "Banda vê o diretório de membros" on public.banda_membros;
create policy "Banda vê o diretório de membros"
  on public.banda_membros for select
  using (public.is_banda_membro());

-- Backfill: quem já tem banda_acesso hoje entra no diretório automaticamente.
insert into public.banda_membros (profile_id, nome)
select p.id, p.full_name
from public.profiles p
where p.banda_acesso = true
on conflict (profile_id) do nothing;

-- Dali em diante, resgatar o código já grava no diretório também.
create or replace function public.use_banda_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row invite_codes%rowtype;
  v_user_id uuid := auth.uid();
  v_nome text;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Você precisa estar logado.');
  end if;

  select * into v_row from invite_codes
    where code = upper(trim(p_code)) and tipo = 'banda'
    for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Código inválido.');
  end if;

  if v_row.is_used then
    return jsonb_build_object('success', false, 'error', 'Este código já foi utilizado.');
  end if;

  if v_row.expires_at is not null and v_row.expires_at < now() then
    return jsonb_build_object('success', false, 'error', 'Este código expirou.');
  end if;

  update invite_codes set is_used = true, used_by = v_user_id, used_at = now() where id = v_row.id;
  update profiles set banda_acesso = true where id = v_user_id;

  select full_name into v_nome from profiles where id = v_user_id;
  insert into public.banda_membros (profile_id, nome)
  values (v_user_id, coalesce(v_nome, 'Sem nome'))
  on conflict (profile_id) do update set nome = excluded.nome;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.use_banda_code(text) to authenticated;


create table if not exists public.culto_escala (
  id uuid primary key default gen_random_uuid(),
  culto_id uuid not null references public.cultos(id) on delete cascade,
  membro_id uuid not null references public.banda_membros(id) on delete cascade,
  instrumento text not null,
  created_at timestamptz not null default now(),
  unique (culto_id, membro_id, instrumento)
);

create table if not exists public.ensaio_escala (
  id uuid primary key default gen_random_uuid(),
  ensaio_id uuid not null references public.ensaios(id) on delete cascade,
  membro_id uuid not null references public.banda_membros(id) on delete cascade,
  instrumento text not null,
  created_at timestamptz not null default now(),
  unique (ensaio_id, membro_id, instrumento)
);

create index if not exists culto_escala_culto_idx on public.culto_escala (culto_id);
create index if not exists ensaio_escala_ensaio_idx on public.ensaio_escala (ensaio_id);

alter table public.culto_escala enable row level security;
alter table public.ensaio_escala enable row level security;

drop policy if exists "Banda vê a escala do culto" on public.culto_escala;
create policy "Banda vê a escala do culto"
  on public.culto_escala for select
  using (public.is_banda_membro());

drop policy if exists "Banda gerencia a escala do culto" on public.culto_escala;
create policy "Banda gerencia a escala do culto"
  on public.culto_escala for all
  using (public.is_banda_membro())
  with check (public.is_banda_membro());

drop policy if exists "Banda vê a escala do ensaio" on public.ensaio_escala;
create policy "Banda vê a escala do ensaio"
  on public.ensaio_escala for select
  using (public.is_banda_membro());

drop policy if exists "Banda gerencia a escala do ensaio" on public.ensaio_escala;
create policy "Banda gerencia a escala do ensaio"
  on public.ensaio_escala for all
  using (public.is_banda_membro())
  with check (public.is_banda_membro());
