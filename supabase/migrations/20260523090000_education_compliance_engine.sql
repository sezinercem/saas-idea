-- Education safer recruitment compliance engine.
-- Run after the multi-tenant recruitment architecture migration.

alter table public.compliance_types
  add column if not exists required boolean not null default true,
  add column if not exists requires_expiry_date boolean not null default false,
  add column if not exists requires_document_upload boolean not null default true,
  add column if not exists sort_order integer not null default 0;

alter table public.candidate_compliance
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewer_notes text,
  add column if not exists rejection_reason text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.placements
  add column if not exists compliance_override boolean not null default false,
  add column if not exists compliance_override_reason text,
  add column if not exists compliance_override_by uuid references auth.users(id) on delete set null,
  add column if not exists compliance_override_at timestamptz;

create unique index if not exists candidate_compliance_item_unique_idx
  on public.candidate_compliance(candidate_id, compliance_type_id);

create or replace function public.set_candidate_compliance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists candidate_compliance_set_updated_at on public.candidate_compliance;
create trigger candidate_compliance_set_updated_at
before update on public.candidate_compliance
for each row execute function public.set_candidate_compliance_updated_at();

create or replace function public.seed_education_compliance_types(target_agency_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.compliance_types (
    agency_id, name, description, default_required, required,
    requires_expiry_date, requires_document_upload, sort_order
  )
  select target_agency_id, item.name, item.description, item.required, item.required,
         item.requires_expiry, item.requires_upload, item.sort_order
  from (
    values
      ('Right to Work', 'Evidence that the candidate is permitted to work in the UK.', true, true, true, 10),
      ('Enhanced DBS', 'Enhanced Disclosure and Barring Service certificate for regulated school work.', true, false, true, 20),
      ('DBS Update Service', 'Online DBS Update Service subscription check and outcome.', true, true, false, 30),
      ('Safeguarding Training', 'Current safeguarding and child protection training certificate.', true, true, true, 40),
      ('Teaching Qualification', 'Teaching qualification or role-appropriate qualification evidence.', true, false, true, 50),
      ('References', 'Safer recruitment references received and verified.', true, false, true, 60),
      ('Photo ID', 'Photographic identity verification document.', true, true, true, 70),
      ('Proof of Address', 'Recent evidence of residential address.', true, false, true, 80),
      ('Overseas Police Check', 'Overseas criminal record check where applicable.', false, true, true, 90),
      ('Medical Fitness Declaration', 'Declaration confirming fitness to work in education settings.', true, true, true, 100)
  ) as item(name, description, required, requires_expiry, requires_upload, sort_order)
  where not exists (
    select 1 from public.compliance_types existing
    where existing.agency_id = target_agency_id and existing.name = item.name
  );
end;
$$;

create or replace function public.seed_education_compliance_for_new_agency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_education_compliance_types(new.id);
  return new;
end;
$$;

drop trigger if exists agency_seed_education_compliance_types on public.agencies;
create trigger agency_seed_education_compliance_types
after insert on public.agencies
for each row execute function public.seed_education_compliance_for_new_agency();

select public.seed_education_compliance_types(id) from public.agencies;

create or replace function public.create_candidate_clearance_checklist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.candidate_compliance (agency_id, candidate_id, compliance_type_id, status)
  select new.agency_id, new.id, type.id, 'Missing'
  from public.compliance_types type
  where type.agency_id = new.agency_id
  on conflict (candidate_id, compliance_type_id) do nothing;
  return new;
end;
$$;

drop trigger if exists candidate_create_clearance_checklist on public.candidates;
create trigger candidate_create_clearance_checklist
after insert on public.candidates
for each row
when (new.agency_id is not null)
execute function public.create_candidate_clearance_checklist();

insert into public.candidate_compliance (agency_id, candidate_id, compliance_type_id, status)
select candidate.agency_id, candidate.id, type.id, 'Missing'
from public.candidates candidate
join public.compliance_types type on type.agency_id = candidate.agency_id
where candidate.agency_id is not null
on conflict (candidate_id, compliance_type_id) do nothing;

create or replace function public.enforce_compliance_review_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.user_has_agency_role(new.agency_id, array['owner', 'admin', 'compliance']) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'Missing'
      or new.document_id is not null
      or new.expiry_date is not null
      or new.reviewed_by is not null
      or new.reviewed_at is not null
      or new.reviewer_notes is not null
      or new.rejection_reason is not null then
      raise exception 'Only reviewers can create assessed clearance items.';
    end if;
    return new;
  end if;

  if new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.reviewer_notes is distinct from old.reviewer_notes
    or new.rejection_reason is distinct from old.rejection_reason
    or new.expiry_date is distinct from old.expiry_date
    or new.status not in ('Missing', 'Pending Review')
    or (new.status = 'Pending Review' and new.document_id is not distinct from old.document_id)
    or (new.status = 'Missing' and new.document_id is not null) then
    raise exception 'Only owners, admins, or compliance users can review clearance items.';
  end if;
  return new;
end;
$$;

drop trigger if exists candidate_compliance_require_reviewer on public.candidate_compliance;
create trigger candidate_compliance_require_reviewer
before insert or update on public.candidate_compliance
for each row execute function public.enforce_compliance_review_permissions();

drop policy if exists "Owners admins compliance can manage candidate compliance" on public.candidate_compliance;
drop policy if exists "Agency members can create candidate compliance" on public.candidate_compliance;
drop policy if exists "Agency members can update candidate compliance uploads" on public.candidate_compliance;
drop policy if exists "Reviewers can delete candidate compliance" on public.candidate_compliance;

create policy "Agency members can create candidate compliance"
on public.candidate_compliance for insert to authenticated
with check (agency_id in (select public.user_agency_ids()));

create policy "Agency members can update candidate compliance uploads"
on public.candidate_compliance for update to authenticated
using (agency_id in (select public.user_agency_ids()))
with check (agency_id in (select public.user_agency_ids()));

create policy "Reviewers can delete candidate compliance"
on public.candidate_compliance for delete to authenticated
using (public.user_has_agency_role(agency_id, array['owner', 'admin', 'compliance']));

drop policy if exists "Agency users can update recruitment documents" on storage.objects;
create policy "Agency users can update recruitment documents"
on storage.objects for update to authenticated
using (bucket_id = 'recruitment-documents' and (storage.foldername(name))[1]::uuid in (select public.user_agency_ids()))
with check (bucket_id = 'recruitment-documents' and (storage.foldername(name))[1]::uuid in (select public.user_agency_ids()));

create index if not exists candidate_compliance_agency_status_idx
  on public.candidate_compliance(agency_id, status, expiry_date);
