-- Resumable agency onboarding, invite delivery metadata, and compliance verification workflow.

create extension if not exists pgcrypto;

alter table public.agencies
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_step text not null default 'Profile Setup'
    check (onboarding_step in ('Profile Setup', 'Agency Setup', 'Preferences', 'Compliance Settings', 'Completed')),
  add column if not exists onboarding_completed_at timestamptz;

update public.agencies
set onboarding_completed = coalesce(onboarding_completed, onboarding_complete, false),
    onboarding_step = case when coalesce(onboarding_complete, false) then 'Completed' else onboarding_step end,
    onboarding_completed_at = case
      when coalesce(onboarding_complete, false) and onboarding_completed_at is null then now()
      else onboarding_completed_at
    end;

alter table public.portal_invites
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_delivery_status text not null default 'Pending'
    check (email_delivery_status in ('Pending', 'Sent', 'Failed', 'Skipped')),
  add column if not exists email_error text;

create index if not exists portal_invites_agency_created_idx on public.portal_invites(agency_id, created_at desc);

-- Keep old and new onboarding flags in sync for existing code paths and older deployments.
create or replace function public.sync_agency_onboarding_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.onboarding_completed then
    new.onboarding_complete := true;
    new.onboarding_step := 'Completed';
    new.onboarding_completed_at := coalesce(new.onboarding_completed_at, now());
  elsif new.onboarding_complete then
    new.onboarding_completed := true;
    new.onboarding_step := 'Completed';
    new.onboarding_completed_at := coalesce(new.onboarding_completed_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists agency_onboarding_state_sync on public.agencies;
create trigger agency_onboarding_state_sync before insert or update on public.agencies
for each row execute function public.sync_agency_onboarding_state();

create or replace function public.mark_portal_invite_delivery(
  invite_id uuid,
  delivery_status text,
  delivery_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if delivery_status not in ('Sent', 'Failed', 'Skipped') then
    raise exception 'Unsupported invite delivery status.';
  end if;

  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    and not public.user_has_agency_role(
      (select agency_id from public.portal_invites where id = invite_id),
      array['owner', 'admin', 'recruiter']
    ) then
    raise exception 'Only agency staff may update invite delivery status.';
  end if;

  update public.portal_invites
  set email_delivery_status = delivery_status,
      email_sent_at = case when delivery_status = 'Sent' then now() else email_sent_at end,
      email_error = delivery_error
  where id = invite_id;
end;
$$;

create or replace function public.mark_compliance_verification(
  target_item_id uuid,
  new_verification_status text,
  warnings jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.candidate_compliance;
begin
  select * into item from public.candidate_compliance where id = target_item_id;
  if item.id is null then raise exception 'Compliance item not found.'; end if;

  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    and not public.user_has_agency_role(item.agency_id, array['owner', 'admin', 'compliance']) then
    raise exception 'Only compliance reviewers may update verification results.';
  end if;

  if new_verification_status not in ('Checking', 'Needs Review', 'Verified', 'Warning') then
    raise exception 'Unsupported verification status.';
  end if;

  update public.candidate_compliance
  set verification_status = new_verification_status,
      verification_warnings = coalesce(warnings, '[]'::jsonb),
      verified_at = now(),
      status = case
        when new_verification_status in ('Needs Review', 'Warning') then 'Pending Review'
        else status
      end
  where id = target_item_id;
end;
$$;

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
  candidate public.candidates;
  existing_user public.candidate_users;
  invite_id uuid;
begin
  select * into candidate from public.candidates where id = target_candidate_id;
  if candidate.id is null then raise exception 'Candidate not found.'; end if;
  if not public.user_has_agency_role(candidate.agency_id, array['owner', 'admin', 'recruiter']) then
    raise exception 'Only agency staff may invite candidates.';
  end if;
  if candidate.email is null or length(trim(candidate.email)) = 0 then
    raise exception 'Candidate must have an email address before inviting them.';
  end if;

  select * into existing_user from public.candidate_users where candidate_id = candidate.id;
  if existing_user.id is not null and existing_user.portal_status = 'Active' then
    raise exception 'Candidate already has active portal access.';
  end if;

  insert into public.candidate_users (candidate_id, agency_id, portal_status, invited_at)
  values (candidate.id, candidate.agency_id, 'Invited', now())
  on conflict (candidate_id) do update
    set portal_status = case when public.candidate_users.portal_status = 'Active' then public.candidate_users.portal_status else 'Invited' end,
        invited_at = now()
  returning id into invite_id;

  insert into public.portal_invites (token_hash, expires_at, invited_by, agency_id, candidate_id, email_delivery_status)
  values (invite_token_hash, invite_expires_at, auth.uid(), candidate.agency_id, candidate.id, 'Pending')
  returning id into invite_id;

  insert into public.activity_logs (agency_id, user_id, entity_type, entity_id, action, metadata)
  values (candidate.agency_id, auth.uid(), 'candidate', candidate.id, 'portal.invite_created', jsonb_build_object('expires_at', invite_expires_at));

  return invite_id;
end;
$$;

create or replace function public.portal_invite_preview(raw_token text)
returns table (
  agency_name text,
  candidate_first_name text,
  primary_colour text,
  logo_url text,
  expires_at timestamptz,
  invite_state text
)
language sql
security definer
set search_path = public
as $$
  select a.name,
         c.first_name,
         a.primary_colour,
         a.logo_url,
         i.expires_at,
         case
           when i.used_at is not null then 'Used'
           when i.expires_at <= now() then 'Expired'
           else 'Valid'
         end as invite_state
  from public.portal_invites i
  join public.agencies a on a.id = i.agency_id
  join public.candidates c on c.id = i.candidate_id
  where i.token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex')
  limit 1;
$$;
