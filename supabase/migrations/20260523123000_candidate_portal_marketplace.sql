-- Education candidate portal and agency-scoped jobs / shift marketplace.
-- Run after 20260523090000_education_compliance_engine.sql.

create extension if not exists pgcrypto;

alter table public.agencies
  add column if not exists logo_url text,
  add column if not exists primary_colour text not null default '#1d4ed8';

alter table public.jobs
  add column if not exists job_type text not null default 'Long-Term'
    check (job_type in ('Permanent', 'Long-Term', 'Daily Supply', 'Short-Term')),
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists school_name text,
  add column if not exists subject text,
  add column if not exists year_group text,
  add column if not exists daily_rate text,
  add column if not exists shift_date date,
  add column if not exists vacancies integer not null default 1 check (vacancies >= 0),
  add column if not exists compliance_required boolean not null default true,
  add column if not exists published boolean not null default false;

alter table public.candidate_compliance
  add column if not exists verification_status text not null default 'Not Started'
    check (verification_status in ('Not Started', 'Queued', 'Checking', 'Needs Review', 'Verified', 'Warning')),
  add column if not exists verification_warnings jsonb not null default '[]'::jsonb,
  add column if not exists verified_at timestamptz;

-- Candidates/recruiters may upload or replace evidence, while review outcomes stay privileged.
create or replace function public.enforce_compliance_review_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.user_has_agency_role(new.agency_id, array['owner', 'admin', 'compliance']) then return new; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'Missing' or new.document_id is not null or new.expiry_date is not null
      or new.reviewed_by is not null or new.reviewed_at is not null or new.reviewer_notes is not null or new.rejection_reason is not null then
      raise exception 'Only reviewers can create assessed clearance items.';
    end if;
    return new;
  end if;
  if new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.reviewer_notes is distinct from old.reviewer_notes
    or new.rejection_reason is distinct from old.rejection_reason
    or new.expiry_date is distinct from old.expiry_date
    or (
      (new.verification_status is distinct from old.verification_status
        or new.verification_warnings is distinct from old.verification_warnings
        or new.verified_at is distinct from old.verified_at)
      and (new.status <> 'Pending Review' or new.document_id is null or new.verification_status <> 'Queued' or new.verification_warnings <> '[]'::jsonb or new.verified_at is not null)
    )
    or new.status not in ('Missing', 'Pending Review')
    or (old.status = 'Pending Review' and new.status = 'Pending Review' and new.document_id is not distinct from old.document_id)
    or (new.status = 'Missing' and new.document_id is not null) then
    raise exception 'Only owners, admins, or compliance users can review clearance items.';
  end if;
  return new;
end;
$$;

create table if not exists public.candidate_users (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references public.candidates(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  portal_status text not null default 'Invited'
    check (portal_status in ('Invited', 'Active', 'Suspended', 'Archived')),
  invited_at timestamptz,
  accepted_invite_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  unique (agency_id, candidate_id)
);

-- The raw invite secret is never stored; only its SHA-256 digest is retained.
create table if not exists public.portal_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  invited_by uuid references auth.users(id) on delete set null,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  shift_title text not null,
  school_name text not null,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  vacancies integer not null default 1 check (vacancies >= 0),
  booking_type text not null default 'Instant' check (booking_type in ('Instant', 'Approval Required')),
  status text not null default 'Open' check (status in ('Draft', 'Open', 'Filled', 'Closed', 'Cancelled')),
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  status text not null default 'Applied'
    check (status in ('Applied', 'Under Review', 'Interview Requested', 'Offered', 'Rejected', 'Withdrawn')),
  applied_at timestamptz not null default now(),
  notes text,
  unique (candidate_id, job_id)
);

create table if not exists public.shift_bookings (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  booking_status text not null default 'Pending'
    check (booking_status in ('Pending', 'Approved', 'Rejected', 'Cancelled', 'Completed')),
  booked_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique (candidate_id, shift_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  recipient_candidate_user_id uuid references public.candidate_users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (recipient_user_id is not null or recipient_candidate_user_id is not null)
);

create or replace function public.protect_candidate_portal_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.auth_user_id is not null and (tg_op = 'INSERT' or new.auth_user_id is distinct from old.auth_user_id)
     and new.auth_user_id <> auth.uid() then
    raise exception 'Candidate accounts can only be linked during candidate invitation acceptance.';
  end if;
  return new;
end;
$$;

drop trigger if exists candidate_portal_identity_guard on public.candidate_users;
create trigger candidate_portal_identity_guard before insert or update on public.candidate_users
for each row execute function public.protect_candidate_portal_identity();

create index if not exists candidate_users_auth_idx on public.candidate_users(auth_user_id);
create index if not exists portal_invites_candidate_idx on public.portal_invites(candidate_id, expires_at desc);
create index if not exists jobs_portal_marketplace_idx on public.jobs(agency_id, published, status, created_at desc);
create index if not exists shifts_marketplace_idx on public.shifts(agency_id, published, status, shift_date);
create index if not exists job_applications_candidate_idx on public.job_applications(candidate_id, applied_at desc);
create index if not exists shift_bookings_candidate_idx on public.shift_bookings(candidate_id, booked_at desc);
create index if not exists notifications_candidate_idx on public.notifications(recipient_candidate_user_id, created_at desc);

create or replace function public.current_candidate_user()
returns public.candidate_users
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.candidate_users
  where auth_user_id = auth.uid()
    and portal_status = 'Active'
  limit 1
$$;

create or replace function public.current_candidate_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select candidate_id from public.current_candidate_user()
$$;

create or replace function public.current_candidate_agency_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select agency_id from public.current_candidate_user()
$$;

create or replace function public.candidate_is_cleared(target_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.candidate_users portal
    where portal.auth_user_id = auth.uid()
      and portal.portal_status = 'Active'
      and portal.candidate_id = target_candidate_id
  )
  and exists (
    select 1
    from public.compliance_types type
    where type.agency_id = public.current_candidate_agency_id()
      and type.required
  )
  and not exists (
    select 1
    from public.compliance_types type
    left join public.candidate_compliance item
      on item.candidate_id = target_candidate_id
      and item.compliance_type_id = type.id
    where type.agency_id = public.current_candidate_agency_id()
      and type.required
      and (
        item.id is null
        or item.status <> 'Approved'
        or (item.expiry_date is not null and item.expiry_date < current_date)
      )
  )
$$;

-- Staff create an invite record from a client-generated random secret; only the hash is sent to SQL.
create or replace function public.create_portal_invite(
  target_candidate_id uuid,
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
  invitation_id uuid;
begin
  select agency_id into target_agency_id from public.candidates where id = target_candidate_id;
  if target_agency_id is null or not public.user_has_agency_role(target_agency_id, array['owner', 'admin', 'recruiter']) then
    raise exception 'Only agency recruitment staff can invite this candidate.';
  end if;
  if invite_expires_at <= now() then
    raise exception 'Invitation expiry must be in the future.';
  end if;

  insert into public.candidate_users (candidate_id, agency_id, portal_status, invited_at)
  values (target_candidate_id, target_agency_id, 'Invited', now())
  on conflict (candidate_id) do update
    set portal_status = case when public.candidate_users.portal_status = 'Active' then 'Active' else 'Invited' end,
        invited_at = now();

  insert into public.portal_invites (token_hash, expires_at, invited_by, agency_id, candidate_id)
  values (invite_token_hash, invite_expires_at, auth.uid(), target_agency_id, target_candidate_id)
  returning id into invitation_id;
  return invitation_id;
end;
$$;

create or replace function public.portal_invite_preview(raw_token text)
returns table (agency_name text, candidate_first_name text, primary_colour text, logo_url text, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select a.name, c.first_name, a.primary_colour, a.logo_url, i.expires_at
  from public.portal_invites i
  join public.agencies a on a.id = i.agency_id
  join public.candidates c on c.id = i.candidate_id
  where i.token_hash = encode(digest(raw_token, 'sha256'), 'hex')
    and i.used_at is null
    and i.expires_at > now()
  limit 1
$$;

create or replace function public.accept_portal_invite(raw_token text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invitation public.portal_invites;
  candidate_email text;
  portal_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in before accepting an invitation.';
  end if;
  select * into invitation
  from public.portal_invites
  where token_hash = encode(digest(raw_token, 'sha256'), 'hex')
    and used_at is null
    and expires_at > now()
  for update;
  if invitation.id is null then
    raise exception 'This invitation is invalid or has expired.';
  end if;

  if exists (select 1 from public.agency_members where user_id = auth.uid()) then
    raise exception 'A staff account cannot be activated as a candidate portal account.';
  end if;

  select lower(email) into candidate_email from public.candidates where id = invitation.candidate_id;
  if candidate_email is null or candidate_email <> lower((select email from auth.users where id = auth.uid())) then
    raise exception 'Sign in using the email address invited by your agency.';
  end if;

  update public.candidate_users
  set auth_user_id = auth.uid(), portal_status = 'Active', accepted_invite_at = now(), last_login_at = now()
  where candidate_id = invitation.candidate_id
  returning id into portal_id;

  update public.portal_invites set used_at = now() where id = invitation.id;
  insert into public.notifications (agency_id, recipient_candidate_user_id, type, title, body)
  values (invitation.agency_id, portal_id, 'welcome', 'Welcome to your candidate portal', 'Complete your safer recruitment checks to unlock school opportunities.');
  return portal_id;
end;
$$;

-- Invited candidates are auth users, but must never receive an agency owner workspace.
create or replace function public.create_default_agency_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  agency_id uuid;
  agency_name text;
  agency_slug text;
begin
  if coalesce((new.raw_user_meta_data ->> 'candidate_portal')::boolean, false) then
    insert into public.profiles (id, email, full_name, company_name)
    values (new.id, new.email, '', '')
    on conflict (id) do nothing;
    return new;
  end if;

  agency_name := coalesce(new.raw_user_meta_data ->> 'company_name', split_part(new.email, '@', 1) || ' Agency');
  agency_slug := lower(regexp_replace(agency_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(new.id::text, 1, 8);
  insert into public.agencies (name, slug) values (agency_name, agency_slug) returning id into agency_id;
  insert into public.agency_members (agency_id, user_id, role) values (agency_id, new.id, 'owner');
  insert into public.profiles (id, email, full_name, company_name)
  values (new.id, new.email, '', agency_name)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.enforce_candidate_application_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.user_has_agency_role(new.agency_id, array['owner', 'admin', 'recruiter']) then return new; end if;
  if tg_op = 'UPDATE' and old.candidate_id = public.current_candidate_id()
     and new.status = 'Withdrawn'
     and new.candidate_id = old.candidate_id and new.agency_id = old.agency_id and new.job_id = old.job_id then
    return new;
  end if;
  raise exception 'Candidates may only withdraw their own application.';
end;
$$;

drop trigger if exists candidate_application_update_guard on public.job_applications;
create trigger candidate_application_update_guard before update on public.job_applications
for each row execute function public.enforce_candidate_application_changes();

create or replace function public.enforce_candidate_booking_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.user_has_agency_role(new.agency_id, array['owner', 'admin', 'recruiter']) then return new; end if;
  if tg_op = 'UPDATE' and old.candidate_id = public.current_candidate_id()
     and new.booking_status = 'Cancelled'
     and new.cancelled_at is not null
     and new.candidate_id = old.candidate_id and new.agency_id = old.agency_id and new.shift_id = old.shift_id then
    return new;
  end if;
  raise exception 'Candidates may only cancel their own booking.';
end;
$$;

drop trigger if exists candidate_booking_update_guard on public.shift_bookings;
create trigger candidate_booking_update_guard before update on public.shift_bookings
for each row execute function public.enforce_candidate_booking_changes();

create or replace function public.enforce_candidate_notification_read_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.user_has_agency_role(new.agency_id, array['owner', 'admin', 'recruiter', 'compliance']) then return new; end if;
  if new.agency_id = old.agency_id
     and new.recipient_user_id is not distinct from old.recipient_user_id
     and new.recipient_candidate_user_id is not distinct from old.recipient_candidate_user_id
     and new.type = old.type and new.title = old.title and new.body = old.body then
    return new;
  end if;
  raise exception 'Candidates may only mark their notifications as read.';
end;
$$;

drop trigger if exists candidate_notification_read_guard on public.notifications;
create trigger candidate_notification_read_guard before update on public.notifications
for each row execute function public.enforce_candidate_notification_read_only();

create or replace function public.reserve_shift_vacancy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_booking_status text;
begin
  if not public.user_has_agency_role(new.agency_id, array['owner', 'admin', 'recruiter']) then
    select case when booking_type = 'Instant' then 'Approved' else 'Pending' end
      into expected_booking_status
    from public.shifts
    where id = new.shift_id;
    new.booking_status := expected_booking_status;
  end if;
  update public.shifts
  set vacancies = vacancies - 1,
      status = case when vacancies - 1 = 0 then 'Filled' else status end
  where id = new.shift_id and vacancies > 0 and status = 'Open';
  if not found then raise exception 'This shift no longer has an available vacancy.'; end if;
  return new;
end;
$$;

drop trigger if exists shift_booking_reserve_vacancy on public.shift_bookings;
create trigger shift_booking_reserve_vacancy before insert on public.shift_bookings
for each row execute function public.reserve_shift_vacancy();

create or replace function public.release_shift_vacancy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.booking_status in ('Rejected', 'Cancelled') and old.booking_status not in ('Rejected', 'Cancelled') then
    update public.shifts
    set vacancies = vacancies + 1,
        status = case when status = 'Filled' then 'Open' else status end
    where id = new.shift_id;
  end if;
  return new;
end;
$$;

drop trigger if exists shift_booking_release_vacancy on public.shift_bookings;
create trigger shift_booking_release_vacancy after update on public.shift_bookings
for each row execute function public.release_shift_vacancy();

create or replace function public.notify_candidate_clearance_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare portal_id uuid;
declare item_name text;
begin
  if new.status not in ('Approved', 'Rejected') or new.status is not distinct from old.status then return new; end if;
  select id into portal_id from public.candidate_users where candidate_id = new.candidate_id and portal_status = 'Active';
  if portal_id is null then return new; end if;
  select name into item_name from public.compliance_types where id = new.compliance_type_id;
  insert into public.notifications (agency_id, recipient_candidate_user_id, type, title, body)
  values (
    new.agency_id, portal_id, 'compliance_' || lower(new.status),
    case when new.status = 'Approved' then 'Compliance approved' else 'Document needs replacement' end,
    coalesce(item_name, 'Clearance item') || case when new.status = 'Approved' then ' has been approved.' else ' requires another document upload.' end
  );
  return new;
end;
$$;

drop trigger if exists notify_candidate_clearance_update on public.candidate_compliance;
create trigger notify_candidate_clearance_update after update on public.candidate_compliance
for each row execute function public.notify_candidate_clearance_decision();

create or replace function public.notify_new_published_shift()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.published and new.status = 'Open' and (tg_op = 'INSERT' or not coalesce(old.published, false)) then
    insert into public.notifications (agency_id, recipient_candidate_user_id, type, title, body)
    select new.agency_id, portal.id, 'new_shift', 'New school shift available', new.shift_title || ' at ' || new.school_name || ' is now available.'
    from public.candidate_users portal
    where portal.agency_id = new.agency_id and portal.portal_status = 'Active';
  end if;
  return new;
end;
$$;

drop trigger if exists notify_candidate_new_shift on public.shifts;
create trigger notify_candidate_new_shift after insert or update on public.shifts
for each row execute function public.notify_new_published_shift();

create or replace function public.notify_booking_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare portal_id uuid;
begin
  if new.booking_status is not distinct from old.booking_status then return new; end if;
  select id into portal_id from public.candidate_users where candidate_id = new.candidate_id and portal_status = 'Active';
  if portal_id is not null then
    insert into public.notifications (agency_id, recipient_candidate_user_id, type, title, body)
    values (new.agency_id, portal_id, 'booking_' || lower(new.booking_status), 'Booking ' || lower(new.booking_status), 'Your school shift booking status has changed.');
  end if;
  return new;
end;
$$;

drop trigger if exists notify_candidate_booking_update on public.shift_bookings;
create trigger notify_candidate_booking_update after update on public.shift_bookings
for each row execute function public.notify_booking_decision();

create or replace function public.notify_application_interview()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare portal_id uuid;
begin
  if new.status = 'Interview Requested' and new.status is distinct from old.status then
    select id into portal_id from public.candidate_users where candidate_id = new.candidate_id and portal_status = 'Active';
    if portal_id is not null then
      insert into public.notifications (agency_id, recipient_candidate_user_id, type, title, body)
      values (new.agency_id, portal_id, 'interview_requested', 'Interview requested', 'Your agency has requested an interview for a school opportunity.');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_candidate_application_update on public.job_applications;
create trigger notify_candidate_application_update after update on public.job_applications
for each row execute function public.notify_application_interview();

alter table public.candidate_users enable row level security;
alter table public.portal_invites enable row level security;
alter table public.shifts enable row level security;
alter table public.job_applications enable row level security;
alter table public.shift_bookings enable row level security;
alter table public.notifications enable row level security;

create policy "Staff can manage agency portal users" on public.candidate_users for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));
create policy "Candidates can read own portal account" on public.candidate_users for select to authenticated
using (auth_user_id = auth.uid());

create policy "Staff can read agency invites" on public.portal_invites for select to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));

create policy "Candidates can read assigned agency branding" on public.agencies for select to authenticated
using (id = public.current_candidate_agency_id());
create policy "Candidates can read own candidate record" on public.candidates for select to authenticated
using (id = public.current_candidate_id() and agency_id = public.current_candidate_agency_id());
create policy "Candidates can read own compliance types" on public.compliance_types for select to authenticated
using (agency_id = public.current_candidate_agency_id());
create policy "Candidates can read own clearance items" on public.candidate_compliance for select to authenticated
using (candidate_id = public.current_candidate_id() and agency_id = public.current_candidate_agency_id());
create policy "Candidates can submit own clearance evidence" on public.candidate_compliance for update to authenticated
using (candidate_id = public.current_candidate_id() and agency_id = public.current_candidate_agency_id())
with check (candidate_id = public.current_candidate_id() and agency_id = public.current_candidate_agency_id());
create policy "Candidates can create own document records" on public.documents for insert to authenticated
with check (agency_id = public.current_candidate_agency_id() and entity_type = 'candidate' and entity_id = public.current_candidate_id());
create policy "Candidates can read own document records" on public.documents for select to authenticated
using (agency_id = public.current_candidate_agency_id() and entity_type = 'candidate' and entity_id = public.current_candidate_id());
create policy "Candidates can log own portal activity" on public.activity_logs for insert to authenticated
with check (agency_id = public.current_candidate_agency_id() and entity_type = 'candidate' and entity_id = public.current_candidate_id());

create policy "Candidates can read published agency jobs" on public.jobs for select to authenticated
using (agency_id = public.current_candidate_agency_id() and published and status = 'Open');
create policy "Candidates can read own applied jobs" on public.jobs for select to authenticated
using (
  agency_id = public.current_candidate_agency_id()
  and exists (
    select 1 from public.job_applications application
    where application.job_id = jobs.id and application.candidate_id = public.current_candidate_id()
  )
);
create policy "Staff can manage shifts" on public.shifts for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));
create policy "Candidates can read published agency shifts" on public.shifts for select to authenticated
using (agency_id = public.current_candidate_agency_id() and published and status = 'Open');
create policy "Candidates can read own booked shifts" on public.shifts for select to authenticated
using (
  agency_id = public.current_candidate_agency_id()
  and exists (
    select 1 from public.shift_bookings booking
    where booking.shift_id = shifts.id and booking.candidate_id = public.current_candidate_id()
  )
);

create policy "Staff can manage agency applications" on public.job_applications for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));
create policy "Candidates can read own applications" on public.job_applications for select to authenticated
using (candidate_id = public.current_candidate_id() and agency_id = public.current_candidate_agency_id());
create policy "Cleared candidates can apply for agency jobs" on public.job_applications for insert to authenticated
with check (
  candidate_id = public.current_candidate_id()
  and agency_id = public.current_candidate_agency_id()
  and public.candidate_is_cleared(candidate_id)
  and status = 'Applied'
  and exists (select 1 from public.jobs j where j.id = job_id and j.agency_id = agency_id and j.published and j.status = 'Open')
);
create policy "Candidates can withdraw own applications" on public.job_applications for update to authenticated
using (candidate_id = public.current_candidate_id() and agency_id = public.current_candidate_agency_id())
with check (candidate_id = public.current_candidate_id() and agency_id = public.current_candidate_agency_id());

create policy "Staff can manage agency bookings" on public.shift_bookings for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));
create policy "Candidates can read own bookings" on public.shift_bookings for select to authenticated
using (candidate_id = public.current_candidate_id() and agency_id = public.current_candidate_agency_id());
create policy "Cleared candidates can book agency shifts" on public.shift_bookings for insert to authenticated
with check (
  candidate_id = public.current_candidate_id()
  and agency_id = public.current_candidate_agency_id()
  and public.candidate_is_cleared(candidate_id)
  and exists (select 1 from public.shifts s where s.id = shift_id and s.agency_id = agency_id and s.published and s.status = 'Open' and s.vacancies > 0)
);
create policy "Candidates can cancel own bookings" on public.shift_bookings for update to authenticated
using (candidate_id = public.current_candidate_id() and agency_id = public.current_candidate_agency_id())
with check (candidate_id = public.current_candidate_id() and agency_id = public.current_candidate_agency_id());

create policy "Staff can manage notifications" on public.notifications for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter', 'compliance']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter', 'compliance']));
create policy "Candidates can read own notifications" on public.notifications for select to authenticated
using (recipient_candidate_user_id = (select id from public.current_candidate_user()));
create policy "Candidates can mark own notifications read" on public.notifications for update to authenticated
using (recipient_candidate_user_id = (select id from public.current_candidate_user()))
with check (recipient_candidate_user_id = (select id from public.current_candidate_user()));

create policy "Candidates can upload own recruitment documents" on storage.objects for insert to authenticated
with check (
  bucket_id = 'recruitment-documents'
  and (storage.foldername(name))[1]::uuid = public.current_candidate_agency_id()
  and (storage.foldername(name))[2] = 'candidates'
  and (storage.foldername(name))[3]::uuid = public.current_candidate_id()
);
create policy "Candidates can update own recruitment documents" on storage.objects for update to authenticated
using (
  bucket_id = 'recruitment-documents'
  and (storage.foldername(name))[1]::uuid = public.current_candidate_agency_id()
  and (storage.foldername(name))[2] = 'candidates'
  and (storage.foldername(name))[3]::uuid = public.current_candidate_id()
)
with check (
  bucket_id = 'recruitment-documents'
  and (storage.foldername(name))[1]::uuid = public.current_candidate_agency_id()
  and (storage.foldername(name))[2] = 'candidates'
  and (storage.foldername(name))[3]::uuid = public.current_candidate_id()
);
create policy "Candidates can read own recruitment documents" on storage.objects for select to authenticated
using (
  bucket_id = 'recruitment-documents'
  and (storage.foldername(name))[1]::uuid = public.current_candidate_agency_id()
  and (storage.foldername(name))[2] = 'candidates'
  and (storage.foldername(name))[3]::uuid = public.current_candidate_id()
);

-- Tables are eligible for client subscriptions; RLS still scopes delivered rows.
do $$
begin
  alter publication supabase_realtime add table public.candidate_compliance;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.shift_bookings;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
