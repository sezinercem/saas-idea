-- Recruiter operations: team invitations, profile visibility for team lists, and notification helpers.

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'recruiter', 'compliance')),
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Expired', 'Revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists team_invites_agency_idx on public.team_invites(agency_id, created_at desc);
create index if not exists team_invites_email_idx on public.team_invites(lower(email));

alter table public.team_invites enable row level security;

drop policy if exists "Agency admins can manage team invites" on public.team_invites;
create policy "Agency admins can manage team invites"
on public.team_invites for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin']));

drop policy if exists "Agency members can read teammate profiles" on public.profiles;
create policy "Agency members can read teammate profiles"
on public.profiles for select to authenticated
using (
  exists (
    select 1
    from public.agency_members viewer
    join public.agency_members teammate on teammate.agency_id = viewer.agency_id
    where viewer.user_id = auth.uid()
      and teammate.user_id = profiles.id
  )
);

create or replace function public.create_team_invite(
  target_agency_id uuid,
  target_email text,
  target_role text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_id uuid;
begin
  if target_role not in ('admin', 'recruiter', 'compliance') then
    raise exception 'Unsupported team role.';
  end if;

  if not public.user_has_agency_role(target_agency_id, array['owner', 'admin']) then
    raise exception 'Only owners and admins may invite team members.';
  end if;

  insert into public.team_invites (agency_id, email, role, invited_by, last_sent_at)
  values (target_agency_id, lower(trim(target_email)), target_role, auth.uid(), now())
  returning id into invite_id;

  insert into public.activity_logs (agency_id, user_id, entity_type, entity_id, action, metadata)
  values (target_agency_id, auth.uid(), 'team', invite_id, 'team.invite_created', jsonb_build_object('email', lower(trim(target_email)), 'role', target_role));

  insert into public.notifications (agency_id, recipient_user_id, type, title, body)
  select target_agency_id, m.user_id, 'team_invitation', 'Team invitation created', lower(trim(target_email)) || ' was invited as ' || target_role
  from public.agency_members m
  where m.agency_id = target_agency_id and m.role in ('owner', 'admin');

  return invite_id;
end;
$$;
