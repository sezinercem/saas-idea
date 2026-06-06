-- School portal and school self-service booking management.

create extension if not exists pgcrypto;

create table if not exists public.school_users (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  role text not null default 'Cover Manager',
  portal_status text not null default 'Invited',
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz default now(),
  unique (school_id, auth_user_id)
);

create table if not exists public.school_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  school_id uuid not null references public.schools(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  email text not null,
  role text not null default 'Cover Manager',
  invited_by uuid references auth.users(id),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.school_contacts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role text not null default 'Cover Manager',
  created_at timestamptz default now()
);

create table if not exists public.timesheet_approval_history (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  school_user_id uuid references public.school_users(id) on delete set null,
  action text not null,
  notes text,
  created_at timestamptz default now()
);

alter table public.school_users enable row level security;
alter table public.school_invites enable row level security;
alter table public.school_contacts enable row level security;
alter table public.timesheet_approval_history enable row level security;

create index if not exists school_users_auth_idx on public.school_users(auth_user_id);
create index if not exists school_users_school_idx on public.school_users(school_id);
create index if not exists school_invites_school_idx on public.school_invites(school_id, created_at desc);
create index if not exists school_contacts_school_idx on public.school_contacts(school_id);
create index if not exists timesheet_approval_history_timesheet_idx on public.timesheet_approval_history(timesheet_id, created_at desc);

create or replace function public.user_school_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from public.school_users
  where auth_user_id = auth.uid()
    and portal_status = 'Active'
$$;

create or replace function public.user_school_agency_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select agency_id from public.school_users
  where auth_user_id = auth.uid()
    and portal_status = 'Active'
$$;

drop policy if exists "Agency users can manage school users" on public.school_users;
create policy "Agency users can manage school users" on public.school_users
for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));

drop policy if exists "School users can read own school user" on public.school_users;
create policy "School users can read own school user" on public.school_users
for select to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "Agency users can manage school invites" on public.school_invites;
create policy "Agency users can manage school invites" on public.school_invites
for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));

drop policy if exists "Agency users can manage school contacts" on public.school_contacts;
create policy "Agency users can manage school contacts" on public.school_contacts
for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));

drop policy if exists "School users can manage own contacts" on public.school_contacts;
create policy "School users can manage own contacts" on public.school_contacts
for all to authenticated
using (school_id in (select public.user_school_ids()))
with check (school_id in (select public.user_school_ids()) and agency_id in (select public.user_school_agency_ids()));

drop policy if exists "School users can read own school" on public.schools;
create policy "School users can read own school" on public.schools
for select to authenticated
using (id in (select public.user_school_ids()));

drop policy if exists "School users can read own booking requests" on public.booking_requests;
create policy "School users can read own booking requests" on public.booking_requests
for select to authenticated
using (school_id in (select public.user_school_ids()));

drop policy if exists "School users can create own booking requests" on public.booking_requests;
create policy "School users can create own booking requests" on public.booking_requests
for insert to authenticated
with check (school_id in (select public.user_school_ids()) and agency_id in (select public.user_school_agency_ids()));

drop policy if exists "School users can update own booking requests" on public.booking_requests;
create policy "School users can update own booking requests" on public.booking_requests
for update to authenticated
using (school_id in (select public.user_school_ids()))
with check (school_id in (select public.user_school_ids()) and agency_id in (select public.user_school_agency_ids()));

drop policy if exists "School users can read own booking matches" on public.booking_matches;
create policy "School users can read own booking matches" on public.booking_matches
for select to authenticated
using (exists (
  select 1 from public.booking_requests br
  where br.id = booking_matches.booking_request_id
    and br.school_id in (select public.user_school_ids())
));

drop policy if exists "School users can read own timesheets" on public.timesheets;
create policy "School users can read own timesheets" on public.timesheets
for select to authenticated
using (school_id in (select public.user_school_ids()));

drop policy if exists "School users can update own timesheets" on public.timesheets;
create policy "School users can update own timesheets" on public.timesheets
for update to authenticated
using (school_id in (select public.user_school_ids()))
with check (school_id in (select public.user_school_ids()) and agency_id in (select public.user_school_agency_ids()));

drop policy if exists "School users can read own invoices" on public.invoices;
create policy "School users can read own invoices" on public.invoices
for select to authenticated
using (school_id in (select public.user_school_ids()));

drop policy if exists "Agency users can read timesheet approval history" on public.timesheet_approval_history;
create policy "Agency users can read timesheet approval history" on public.timesheet_approval_history
for select to authenticated
using (agency_id in (select public.user_agency_ids()));

drop policy if exists "School users can manage own timesheet approval history" on public.timesheet_approval_history;
create policy "School users can manage own timesheet approval history" on public.timesheet_approval_history
for all to authenticated
using (school_id in (select public.user_school_ids()))
with check (school_id in (select public.user_school_ids()) and agency_id in (select public.user_school_agency_ids()));

create or replace function public.create_school_invite(
  target_school_id uuid,
  target_email text,
  target_role text,
  invite_token_hash text,
  invite_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_agency_id uuid;
  invite_id uuid;
begin
  select agency_id into target_agency_id from public.schools where id = target_school_id;
  if target_agency_id is null then
    raise exception 'School not found';
  end if;
  if not public.user_has_agency_role(target_agency_id, array['owner', 'admin', 'recruiter']) then
    raise exception 'Not allowed';
  end if;

  insert into public.school_invites (token_hash, school_id, agency_id, email, role, invited_by, expires_at)
  values (invite_token_hash, target_school_id, target_agency_id, target_email, target_role, auth.uid(), invite_expires_at)
  returning id into invite_id;

  insert into public.school_users (school_id, agency_id, auth_user_id, role, portal_status, invited_at)
  values (target_school_id, target_agency_id, null, target_role, 'Invited', now());

  return invite_id;
end;
$$;

create or replace function public.school_invite_preview(raw_token text)
returns table (school_name text, agency_name text, email text, role text, expires_at timestamptz, invite_state text)
language sql
stable
security definer
set search_path = public
as $$
  select s.name, a.name, i.email, i.role, i.expires_at,
    case
      when i.used_at is not null then 'Used'
      when i.expires_at < now() then 'Expired'
      else 'Valid'
    end as invite_state
  from public.school_invites i
  join public.schools s on s.id = i.school_id
  join public.agencies a on a.id = i.agency_id
  where i.token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex')
  limit 1
$$;

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

  update public.school_invites set used_at = now() where id = invite_row.id;

  update public.school_users
  set auth_user_id = auth.uid(), portal_status = 'Active', accepted_at = now()
  where school_id = invite_row.school_id
    and agency_id = invite_row.agency_id
    and auth_user_id is null
    and portal_status = 'Invited'
  returning id into school_user_id;

  if school_user_id is null then
    insert into public.school_users (school_id, agency_id, auth_user_id, role, portal_status, invited_at, accepted_at)
    values (invite_row.school_id, invite_row.agency_id, auth.uid(), invite_row.role, 'Active', invite_row.created_at, now())
    returning id into school_user_id;
  end if;

  return school_user_id;
end;
$$;

create or replace function public.school_candidate_profiles()
returns table (
  candidate_id uuid,
  first_name text,
  last_name text,
  role text,
  compliance_cleared boolean,
  experience_summary text,
  availability text
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct
    c.id,
    c.first_name,
    c.last_name,
    coalesce(c.status, 'Candidate') as role,
    coalesce(c.compliance_status = 'Complete', false) as compliance_cleared,
    coalesce(nullif(c.notes, ''), 'Education supply candidate assigned to your school booking.') as experience_summary,
    coalesce(a.status || ' · ' || a.day_part, 'Availability not confirmed') as availability
  from public.candidates c
  join public.booking_matches bm on bm.candidate_id = c.id and bm.status in ('Confirmed', 'Contacted', 'Suggested')
  join public.booking_requests br on br.id = bm.booking_request_id
  left join public.candidate_availability a
    on a.candidate_id = c.id
    and a.start_date <= br.request_date
    and a.end_date >= br.request_date
  where br.school_id in (select public.user_school_ids())
$$;
