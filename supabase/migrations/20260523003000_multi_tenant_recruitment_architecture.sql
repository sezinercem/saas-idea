-- Multi-tenant recruitment SaaS foundation.
-- Run after the previous profiles, candidates, jobs, placements, and workflow migrations.

create extension if not exists pgcrypto;

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  recruitment_niche text,
  team_size text,
  onboarding_complete boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists public.agency_members (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'recruiter' check (role in ('owner', 'admin', 'recruiter', 'compliance')),
  created_at timestamptz default now(),
  unique (agency_id, user_id)
);

alter table public.candidates add column if not exists agency_id uuid references public.agencies(id) on delete cascade;
alter table public.jobs add column if not exists agency_id uuid references public.agencies(id) on delete cascade;
alter table public.placements add column if not exists agency_id uuid references public.agencies(id) on delete cascade;

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  file_name text not null,
  file_path text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.compliance_types (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete cascade,
  name text not null,
  description text,
  default_required boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.candidate_compliance (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  compliance_type_id uuid references public.compliance_types(id) on delete set null,
  status text not null default 'Missing',
  expiry_date date,
  document_id uuid references public.documents(id) on delete set null,
  created_at timestamptz default now()
);

-- Helper functions used by RLS policies.
create or replace function public.user_agency_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select agency_id from public.agency_members where user_id = auth.uid()
$$;

create or replace function public.user_has_agency_role(target_agency_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agency_members
    where agency_id = target_agency_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  )
$$;

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
  agency_name := coalesce(new.raw_user_meta_data ->> 'company_name', split_part(new.email, '@', 1) || ' Agency');
  agency_slug := lower(regexp_replace(agency_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(new.id::text, 1, 8);

  insert into public.agencies (name, slug)
  values (agency_name, agency_slug)
  returning id into agency_id;

  insert into public.agency_members (agency_id, user_id, role)
  values (agency_id, new.id, 'owner');

  insert into public.profiles (id, email, full_name, company_name)
  values (new.id, new.email, '', agency_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_default_agency_on_signup on auth.users;
create trigger create_default_agency_on_signup
after insert on auth.users
for each row execute function public.create_default_agency_for_user();

-- Backfill one agency per existing user so current MVP records still work.
insert into public.agencies (name, slug, onboarding_complete)
select
  coalesce(nullif(company_name, ''), split_part(email, '@', 1) || ' Agency'),
  lower(regexp_replace(coalesce(nullif(company_name, ''), split_part(email, '@', 1) || ' Agency'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 8),
  true
from public.profiles
on conflict (slug) do nothing;

insert into public.agency_members (agency_id, user_id, role)
select a.id, p.id, 'owner'
from public.profiles p
join public.agencies a
  on a.slug = lower(regexp_replace(coalesce(nullif(p.company_name, ''), split_part(p.email, '@', 1) || ' Agency'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(p.id::text, 1, 8)
on conflict (agency_id, user_id) do nothing;

update public.candidates c
set agency_id = m.agency_id
from public.agency_members m
where c.created_by = m.user_id
  and c.agency_id is null;

update public.jobs j
set agency_id = m.agency_id
from public.agency_members m
where j.created_by = m.user_id
  and j.agency_id is null;

update public.placements p
set agency_id = coalesce(c.agency_id, j.agency_id, m.agency_id)
from public.agency_members m
left join public.candidates c on c.id = p.candidate_id
left join public.jobs j on j.id = p.job_id
where p.created_by = m.user_id
  and p.agency_id is null;

alter table public.agencies enable row level security;
alter table public.agency_members enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notes enable row level security;
alter table public.documents enable row level security;
alter table public.compliance_types enable row level security;
alter table public.candidate_compliance enable row level security;

drop policy if exists "Users can read their agencies" on public.agencies;
create policy "Users can read their agencies"
on public.agencies for select to authenticated
using (id in (select public.user_agency_ids()));

drop policy if exists "Owners and admins can update agencies" on public.agencies;
create policy "Owners and admins can update agencies"
on public.agencies for update to authenticated
using (public.user_has_agency_role(id, array['owner', 'admin']))
with check (public.user_has_agency_role(id, array['owner', 'admin']));

drop policy if exists "Users can read agency members" on public.agency_members;
create policy "Users can read agency members"
on public.agency_members for select to authenticated
using (agency_id in (select public.user_agency_ids()));

drop policy if exists "Owners and admins can manage agency members" on public.agency_members;
create policy "Owners and admins can manage agency members"
on public.agency_members for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin']));

drop policy if exists "Users can read agency candidates" on public.candidates;
drop policy if exists "Users can create agency candidates" on public.candidates;
drop policy if exists "Users can update agency candidates" on public.candidates;
drop policy if exists "Users can delete agency candidates" on public.candidates;
drop policy if exists "Users can read their own candidates" on public.candidates;
drop policy if exists "Users can create their own candidates" on public.candidates;
drop policy if exists "Users can update their own candidates" on public.candidates;
drop policy if exists "Users can delete their own candidates" on public.candidates;
create policy "Users can read agency candidates"
on public.candidates for select to authenticated
using (agency_id in (select public.user_agency_ids()));
create policy "Recruiters can create agency candidates"
on public.candidates for insert to authenticated
with check (agency_id in (select public.user_agency_ids()) and public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));
create policy "Recruiters can update agency candidates"
on public.candidates for update to authenticated
using (agency_id in (select public.user_agency_ids()) and public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']))
with check (agency_id in (select public.user_agency_ids()) and public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));
create policy "Owners and admins can delete agency candidates"
on public.candidates for delete to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin']));

drop policy if exists "Users can read agency jobs" on public.jobs;
drop policy if exists "Users can create agency jobs" on public.jobs;
drop policy if exists "Users can update agency jobs" on public.jobs;
drop policy if exists "Users can delete agency jobs" on public.jobs;
drop policy if exists "Users can read their own jobs" on public.jobs;
drop policy if exists "Users can create their own jobs" on public.jobs;
drop policy if exists "Users can update their own jobs" on public.jobs;
drop policy if exists "Users can delete their own jobs" on public.jobs;
create policy "Users can read agency jobs"
on public.jobs for select to authenticated
using (agency_id in (select public.user_agency_ids()));
create policy "Recruiters can create agency jobs"
on public.jobs for insert to authenticated
with check (agency_id in (select public.user_agency_ids()) and public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));
create policy "Recruiters can update agency jobs"
on public.jobs for update to authenticated
using (agency_id in (select public.user_agency_ids()) and public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']))
with check (agency_id in (select public.user_agency_ids()) and public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));
create policy "Owners and admins can delete agency jobs"
on public.jobs for delete to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin']));

drop policy if exists "Users can read agency placements" on public.placements;
drop policy if exists "Users can create agency placements" on public.placements;
drop policy if exists "Users can update agency placements" on public.placements;
drop policy if exists "Users can delete agency placements" on public.placements;
drop policy if exists "Users can read their own placements" on public.placements;
drop policy if exists "Users can create their own placements" on public.placements;
drop policy if exists "Users can update their own placements" on public.placements;
drop policy if exists "Users can delete their own placements" on public.placements;
create policy "Users can read agency placements"
on public.placements for select to authenticated
using (agency_id in (select public.user_agency_ids()));
create policy "Recruiters can create agency placements"
on public.placements for insert to authenticated
with check (agency_id in (select public.user_agency_ids()) and public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));
create policy "Recruiters can update agency placements"
on public.placements for update to authenticated
using (agency_id in (select public.user_agency_ids()) and public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']))
with check (agency_id in (select public.user_agency_ids()) and public.user_has_agency_role(agency_id, array['owner', 'admin', 'recruiter']));
create policy "Owners and admins can delete agency placements"
on public.placements for delete to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin']));

drop policy if exists "Users can read agency activity" on public.activity_logs;
drop policy if exists "Users can create agency activity" on public.activity_logs;
create policy "Users can read agency activity" on public.activity_logs
for select to authenticated using (agency_id in (select public.user_agency_ids()));
create policy "Users can create agency activity" on public.activity_logs
for insert to authenticated with check (agency_id in (select public.user_agency_ids()));

drop policy if exists "Users can read agency notes" on public.notes;
drop policy if exists "Users can create agency notes" on public.notes;
drop policy if exists "Owners and admins can delete agency notes" on public.notes;
create policy "Users can read agency notes" on public.notes
for select to authenticated using (agency_id in (select public.user_agency_ids()));
create policy "Users can create agency notes" on public.notes
for insert to authenticated with check (agency_id in (select public.user_agency_ids()));
create policy "Owners and admins can delete agency notes" on public.notes
for delete to authenticated using (public.user_has_agency_role(agency_id, array['owner', 'admin']));

drop policy if exists "Users can read agency documents" on public.documents;
drop policy if exists "Users can create agency documents" on public.documents;
drop policy if exists "Owners admins compliance can delete agency documents" on public.documents;
create policy "Users can read agency documents" on public.documents
for select to authenticated using (agency_id in (select public.user_agency_ids()));
create policy "Users can create agency documents" on public.documents
for insert to authenticated with check (agency_id in (select public.user_agency_ids()));
create policy "Owners admins compliance can delete agency documents" on public.documents
for delete to authenticated using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'compliance']));

drop policy if exists "Users can read agency compliance types" on public.compliance_types;
drop policy if exists "Owners admins compliance can manage compliance types" on public.compliance_types;
create policy "Users can read agency compliance types" on public.compliance_types
for select to authenticated using (agency_id is null or agency_id in (select public.user_agency_ids()));
create policy "Owners admins compliance can manage compliance types" on public.compliance_types
for all to authenticated
using (agency_id is not null and public.user_has_agency_role(agency_id, array['owner', 'admin', 'compliance']))
with check (agency_id is not null and public.user_has_agency_role(agency_id, array['owner', 'admin', 'compliance']));

drop policy if exists "Users can read candidate compliance" on public.candidate_compliance;
drop policy if exists "Owners admins compliance can manage candidate compliance" on public.candidate_compliance;
create policy "Users can read candidate compliance" on public.candidate_compliance
for select to authenticated using (agency_id in (select public.user_agency_ids()));
create policy "Owners admins compliance can manage candidate compliance" on public.candidate_compliance
for all to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'compliance']))
with check (public.user_has_agency_role(agency_id, array['owner', 'admin', 'compliance']));

insert into public.compliance_types (agency_id, name, description)
select null, type_name, type_description
from (
  values
    ('Passport', 'Identity document tracking'),
    ('Right to Work', 'Right-to-work verification'),
    ('Certifications', 'Professional certification checks'),
    ('Licences', 'Licence and permit checks')
) as defaults(type_name, type_description)
where not exists (
  select 1 from public.compliance_types where agency_id is null and name = defaults.type_name
);

create index if not exists agencies_slug_idx on public.agencies(slug);
create index if not exists agency_members_user_id_idx on public.agency_members(user_id);
create index if not exists agency_members_agency_id_idx on public.agency_members(agency_id);
create index if not exists candidates_agency_id_idx on public.candidates(agency_id);
create index if not exists jobs_agency_id_idx on public.jobs(agency_id);
create index if not exists placements_agency_id_idx on public.placements(agency_id);
create index if not exists activity_logs_agency_created_idx on public.activity_logs(agency_id, created_at desc);
create index if not exists notes_entity_idx on public.notes(agency_id, entity_type, entity_id, created_at desc);
create index if not exists documents_entity_idx on public.documents(agency_id, entity_type, entity_id, created_at desc);
create index if not exists candidate_compliance_candidate_idx on public.candidate_compliance(candidate_id);

insert into storage.buckets (id, name, public)
values ('recruitment-documents', 'recruitment-documents', false)
on conflict (id) do nothing;

drop policy if exists "Agency users can read recruitment documents" on storage.objects;
create policy "Agency users can read recruitment documents"
on storage.objects for select to authenticated
using (bucket_id = 'recruitment-documents' and (storage.foldername(name))[1]::uuid in (select public.user_agency_ids()));

drop policy if exists "Agency users can upload recruitment documents" on storage.objects;
create policy "Agency users can upload recruitment documents"
on storage.objects for insert to authenticated
with check (bucket_id = 'recruitment-documents' and (storage.foldername(name))[1]::uuid in (select public.user_agency_ids()));

drop policy if exists "Agency admins can delete recruitment documents" on storage.objects;
create policy "Agency admins can delete recruitment documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'recruitment-documents'
  and public.user_has_agency_role((storage.foldername(name))[1]::uuid, array['owner', 'admin', 'compliance'])
);
