-- ============================================================================
-- Bug: quem entra pelo código de convite não aparece em "Membros" (Admin)
--
-- `use_invite_code` só promovia `profiles.role` pra 'membro' — nunca criava
-- (nem vinculava) uma linha em `public.members`, que é o diretório separado
-- que a tela Membros/estatísticas/escalas realmente lê. Resultado: a pessoa
-- via "sou membro" no próprio app, mas o admin não via ela em lugar nenhum.
-- Isso já tinha sido até previsto no comentário da migração
-- 20260723113000_members_profile_link.sql ("...ou futuramente de forma
-- automática quando alguém resgatar um convite...") mas nunca foi feito.
--
-- Esta migração:
-- 1. Corrige `use_invite_code` daqui pra frente: ao resgatar um convite,
--    tenta achar um cadastro do diretório já existente com o mesmo e-mail
--    (ex: admin cadastrou a pessoa antes de mandar o convite) e vincula; se
--    não achar, cria uma linha nova no diretório já vinculada ao perfil.
-- 2. Faz um backfill único: qualquer perfil que já é membro/líder/admin mas
--    ainda não tem nenhuma linha em `members` ganha uma agora — resolve o
--    caso já acontecido, não só os próximos.
-- ============================================================================

create or replace function public.use_invite_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invite_codes%rowtype;
  v_user_id uuid := auth.uid();
  v_full_name text;
  v_email text;
  v_primeiro_nome text;
  v_existing_id uuid;
begin
  select * into v_invite
  from public.invite_codes
  where code = upper(p_code)
    and is_used = false
    and (expires_at is null or expires_at > now());

  if not found then
    return json_build_object('success', false, 'error', 'Código inválido ou expirado.');
  end if;

  update public.invite_codes
  set is_used = true, used_by = v_user_id, used_at = now()
  where id = v_invite.id;

  update public.profiles
  set role = 'membro'
  where id = v_user_id;

  -- Já existe uma linha do diretório vinculada a esse perfil? Nada a fazer.
  select id into v_existing_id from public.members where profile_id = v_user_id;

  if v_existing_id is null then
    select p.full_name, u.email into v_full_name, v_email
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = v_user_id;

    -- Tenta casar com um cadastro já existente no diretório pelo e-mail
    -- (comum quando o admin cadastra a pessoa manualmente antes de mandar
    -- o convite pra ela se logar no app).
    select id into v_existing_id from public.members
    where profile_id is null and email is not null and lower(email) = lower(v_email)
    limit 1;

    if v_existing_id is not null then
      update public.members set profile_id = v_user_id where id = v_existing_id;
    else
      v_primeiro_nome := split_part(coalesce(v_full_name, 'Membro'), ' ', 1);
      insert into public.members (nome, sobrenome, email, status, profile_id, membro_desde)
      values (
        v_primeiro_nome,
        trim(substring(coalesce(v_full_name, '') from length(v_primeiro_nome) + 1)),
        v_email,
        'membro',
        v_user_id,
        current_date
      );
    end if;
  end if;

  return json_build_object('success', true);
end;
$$;

grant execute on function public.use_invite_code(text) to authenticated;


-- ─── Backfill: corrige quem já resgatou convite antes desse fix ───────────

-- 1) Linka cadastros do diretório já existentes (feitos manualmente pelo
--    admin antes do convite) com o perfil, casando pelo e-mail.
update public.members m
set profile_id = p.id
from public.profiles p
join auth.users u on u.id = p.id
where m.profile_id is null
  and m.email is not null
  and lower(m.email) = lower(u.email)
  and p.role in ('membro', 'lider', 'admin');

-- 2) Cria uma linha no diretório pra quem já é membro/líder/admin mas ainda
--    não tem cadastro nenhum (nem foi linkado no passo acima).
insert into public.members (nome, sobrenome, email, status, profile_id, membro_desde)
select
  split_part(coalesce(p.full_name, 'Membro'), ' ', 1),
  trim(substring(coalesce(p.full_name, '') from length(split_part(coalesce(p.full_name, 'Membro'), ' ', 1)) + 1)),
  u.email,
  case when p.role in ('admin', 'lider') then 'lider' else 'membro' end,
  p.id,
  current_date
from public.profiles p
join auth.users u on u.id = p.id
where p.role in ('membro', 'lider', 'admin')
  and not exists (select 1 from public.members m where m.profile_id = p.id);
