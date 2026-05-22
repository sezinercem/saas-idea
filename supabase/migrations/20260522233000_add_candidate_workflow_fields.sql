alter table public.candidates
add column if not exists next_follow_up_date date,
add column if not exists follow_up_reason text,
add column if not exists right_to_work_status text,
add column if not exists compliance_status text,
add column if not exists compliance_expiry_date date;

update public.candidates
set status = case
  when status is null or status = '' then 'New'
  when status = 'Screening' then 'Contacted'
  when status = 'Inactive' then 'Archived'
  else status
end;

update public.jobs
set status = case
  when status is null or status = '' then 'Open'
  when status = 'Active' then 'Open'
  when status = 'Paused' then 'Interviewing'
  else status
end;

create index if not exists candidates_next_follow_up_date_idx on public.candidates(created_by, next_follow_up_date);
create index if not exists candidates_compliance_expiry_date_idx on public.candidates(created_by, compliance_expiry_date);
create index if not exists candidates_status_idx on public.candidates(created_by, status);
create index if not exists jobs_status_idx on public.jobs(created_by, status);
