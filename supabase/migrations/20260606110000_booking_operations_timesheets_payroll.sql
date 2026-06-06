-- Booking operations, availability, timesheets, payroll and invoicing foundation.
-- This migration extends the existing multi-tenant agency model. It is intentionally
-- operational but compact: agencies own records, candidates only see their own portal records.

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  location text,
  contact_name text,
  contact_email text,
  created_at timestamptz default now()
);

create table if not exists public.candidate_availability (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  status text not null default 'Available',
  day_part text not null default 'Full Day',
  start_date date not null,
  end_date date not null,
  role_preference text,
  location_preference text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  school_name text not null,
  role_required text not null,
  request_date date not null,
  start_time time,
  end_time time,
  subject text,
  year_group text,
  notes text,
  urgency text not null default 'Normal',
  status text not null default 'Open',
  workflow_stage text not null default 'New Requests',
  vacancies integer not null default 1,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.booking_matches (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  booking_request_id uuid not null references public.booking_requests(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  score integer not null default 0,
  reason text,
  status text not null default 'Suggested',
  created_at timestamptz default now(),
  unique (booking_request_id, candidate_id)
);

create table if not exists public.timesheets (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  candidate_id uuid references public.candidates(id) on delete set null,
  school_id uuid references public.schools(id) on delete set null,
  school_name text not null,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 0,
  notes text,
  status text not null default 'Draft',
  pay_rate numeric(10,2) not null default 0,
  charge_rate numeric(10,2) not null default 0,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  school_name text not null,
  source_type text not null default 'Timesheet',
  source_id uuid,
  status text not null default 'Draft',
  amount numeric(12,2) not null default 0,
  vat numeric(12,2) not null default 0,
  due_date date,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.school_feedback (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  school_name text not null,
  reliability integer not null check (reliability between 1 and 5),
  professionalism integer not null check (professionalism between 1 and 5),
  classroom_management integer not null check (classroom_management between 1 and 5),
  comments text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.schools enable row level security;
alter table public.candidate_availability enable row level security;
alter table public.booking_requests enable row level security;
alter table public.booking_matches enable row level security;
alter table public.timesheets enable row level security;
alter table public.invoices enable row level security;
alter table public.school_feedback enable row level security;

create index if not exists schools_agency_idx on public.schools(agency_id, name);
create index if not exists availability_agency_date_idx on public.candidate_availability(agency_id, start_date, end_date);
create index if not exists availability_candidate_idx on public.candidate_availability(candidate_id, start_date desc);
create index if not exists booking_requests_agency_status_idx on public.booking_requests(agency_id, status, request_date);
create index if not exists booking_matches_request_idx on public.booking_matches(booking_request_id, score desc);
create index if not exists timesheets_agency_status_idx on public.timesheets(agency_id, status, work_date desc);
create index if not exists invoices_agency_status_idx on public.invoices(agency_id, status, due_date);
create index if not exists feedback_candidate_idx on public.school_feedback(candidate_id, created_at desc);

drop policy if exists "Agency users can read schools" on public.schools;
create policy "Agency users can read schools" on public.schools
for select to authenticated using (agency_id in (select public.user_agency_ids()));

drop policy if exists "Recruiters can manage schools" on public.schools;
create policy "Recruiters can manage schools" on public.schools
for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));

drop policy if exists "Agency users can read availability" on public.candidate_availability;
create policy "Agency users can read availability" on public.candidate_availability
for select to authenticated using (agency_id in (select public.user_agency_ids()));

drop policy if exists "Recruiters can manage availability" on public.candidate_availability;
create policy "Recruiters can manage availability" on public.candidate_availability
for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));

drop policy if exists "Candidates can manage own availability" on public.candidate_availability;
create policy "Candidates can manage own availability" on public.candidate_availability
for all to authenticated
using (exists (
  select 1 from public.candidate_users cu
  where cu.candidate_id = candidate_availability.candidate_id
    and cu.agency_id = candidate_availability.agency_id
    and cu.auth_user_id = auth.uid()
    and cu.portal_status = 'Active'
))
with check (exists (
  select 1 from public.candidate_users cu
  where cu.candidate_id = candidate_availability.candidate_id
    and cu.agency_id = candidate_availability.agency_id
    and cu.auth_user_id = auth.uid()
    and cu.portal_status = 'Active'
));

drop policy if exists "Agency users can read booking requests" on public.booking_requests;
create policy "Agency users can read booking requests" on public.booking_requests
for select to authenticated using (agency_id in (select public.user_agency_ids()));

drop policy if exists "Recruiters can manage booking requests" on public.booking_requests;
create policy "Recruiters can manage booking requests" on public.booking_requests
for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));

drop policy if exists "Agency users can read booking matches" on public.booking_matches;
create policy "Agency users can read booking matches" on public.booking_matches
for select to authenticated using (agency_id in (select public.user_agency_ids()));

drop policy if exists "Recruiters can manage booking matches" on public.booking_matches;
create policy "Recruiters can manage booking matches" on public.booking_matches
for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));

drop policy if exists "Agency users can read timesheets" on public.timesheets;
create policy "Agency users can read timesheets" on public.timesheets
for select to authenticated using (agency_id in (select public.user_agency_ids()));

drop policy if exists "Recruiters can manage timesheets" on public.timesheets;
create policy "Recruiters can manage timesheets" on public.timesheets
for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));

drop policy if exists "Candidates can manage own timesheets" on public.timesheets;
create policy "Candidates can manage own timesheets" on public.timesheets
for all to authenticated
using (exists (
  select 1 from public.candidate_users cu
  where cu.candidate_id = timesheets.candidate_id
    and cu.agency_id = timesheets.agency_id
    and cu.auth_user_id = auth.uid()
    and cu.portal_status = 'Active'
))
with check (exists (
  select 1 from public.candidate_users cu
  where cu.candidate_id = timesheets.candidate_id
    and cu.agency_id = timesheets.agency_id
    and cu.auth_user_id = auth.uid()
    and cu.portal_status = 'Active'
));

drop policy if exists "Agency users can read invoices" on public.invoices;
create policy "Agency users can read invoices" on public.invoices
for select to authenticated using (agency_id in (select public.user_agency_ids()));

drop policy if exists "Owners admins can manage invoices" on public.invoices;
create policy "Owners admins can manage invoices" on public.invoices
for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin']));

drop policy if exists "Agency users can read school feedback" on public.school_feedback;
create policy "Agency users can read school feedback" on public.school_feedback
for select to authenticated using (agency_id in (select public.user_agency_ids()));

drop policy if exists "Recruiters can manage school feedback" on public.school_feedback;
create policy "Recruiters can manage school feedback" on public.school_feedback
for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));
