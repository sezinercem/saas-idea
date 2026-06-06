-- Fix school invite acceptance when a school has multiple pending invites.
-- The previous function could update more than one placeholder school_user row
-- because pending invited users have auth_user_id = null. This version activates
-- a single pending row for the accepted invite, then falls back to creating one.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.accept_school_invite(raw_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.school_invites%rowtype;
  school_user_id uuid;
begin
  select * into invite_row
  from public.school_invites
  where token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex')
  limit 1;

  if invite_row.id is null then
    raise exception 'Invite not found';
  end if;
  if invite_row.used_at is not null then
    raise exception 'Invite already used';
  end if;
  if invite_row.expires_at < now() then
    raise exception 'Invite expired';
  end if;

  update public.school_invites
  set used_at = now()
  where id = invite_row.id;

  update public.school_users
  set
    auth_user_id = auth.uid(),
    role = invite_row.role,
    portal_status = 'Active',
    accepted_at = now()
  where id = (
    select id
    from public.school_users
    where school_id = invite_row.school_id
      and agency_id = invite_row.agency_id
      and auth_user_id is null
      and portal_status = 'Invited'
    order by invited_at nulls last, created_at
    limit 1
  )
  returning id into school_user_id;

  if school_user_id is null then
    insert into public.school_users (school_id, agency_id, auth_user_id, role, portal_status, invited_at, accepted_at)
    values (invite_row.school_id, invite_row.agency_id, auth.uid(), invite_row.role, 'Active', invite_row.created_at, now())
    returning id into school_user_id;
  end if;

  return school_user_id;
end;
$$;
