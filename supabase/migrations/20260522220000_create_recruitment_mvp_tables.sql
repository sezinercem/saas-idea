create extension if not exists pgcrypto;

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  status text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  company_name text,
  job_title text,
  location text,
  pay_rate text,
  status text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.placements (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  candidate_id uuid references public.candidates(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  start_date date,
  status text,
  created_at timestamptz default now()
);

alter table public.candidates enable row level security;
alter table public.jobs enable row level security;
alter table public.placements enable row level security;

create policy "Users can read their own candidates"
on public.candidates for select
to authenticated
using (auth.uid() = created_by);

create policy "Users can create their own candidates"
on public.candidates for insert
to authenticated
with check (auth.uid() = created_by);

create policy "Users can update their own candidates"
on public.candidates for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "Users can delete their own candidates"
on public.candidates for delete
to authenticated
using (auth.uid() = created_by);

create policy "Users can read their own jobs"
on public.jobs for select
to authenticated
using (auth.uid() = created_by);

create policy "Users can create their own jobs"
on public.jobs for insert
to authenticated
with check (auth.uid() = created_by);

create policy "Users can update their own jobs"
on public.jobs for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "Users can delete their own jobs"
on public.jobs for delete
to authenticated
using (auth.uid() = created_by);

create policy "Users can read their own placements"
on public.placements for select
to authenticated
using (auth.uid() = created_by);

create policy "Users can create their own placements"
on public.placements for insert
to authenticated
with check (auth.uid() = created_by);

create policy "Users can update their own placements"
on public.placements for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "Users can delete their own placements"
on public.placements for delete
to authenticated
using (auth.uid() = created_by);

create index if not exists candidates_created_by_idx on public.candidates(created_by);
create index if not exists jobs_created_by_idx on public.jobs(created_by);
create index if not exists placements_created_by_idx on public.placements(created_by);
create index if not exists placements_candidate_id_idx on public.placements(candidate_id);
create index if not exists placements_job_id_idx on public.placements(job_id);
