# RecruitFlow Education

A React, TypeScript, Tailwind CSS, and Supabase platform for education recruitment agencies and safer recruitment operations.

## Features

- Landing page with responsive navbar, hero, feature placeholders, pricing, and footer
- Supabase email/password login and signup flows
- Persistent auth session handling
- Protected dashboard and account routes
- Editable profile fields backed by a `profiles` table
- Candidate, job, and placement management
- Operations dashboard with pipeline, follow-up, school clearance, and placement widgets
- Education compliance centre for DBS, safeguarding, Right to Work, review queues, and expiry risk
- Candidate clearance checklist with private document uploads and approval workflow
- Placement guard with owner/admin recorded overrides for non-cleared candidates
- Agency-scoped candidate portal with secure invite acceptance and separate candidate navigation
- Candidate invite email delivery via Supabase Edge Function, resend support, and invite state tracking
- Candidate portal password recovery and reset pages
- Published education jobs, supply shifts, clearance-gated applications, and booking requests
- Candidate portal branding, notifications, and realtime booking/compliance refresh
- Resumable agency onboarding with progress tracking and no dashboard lockout
- Protected workspaces for compliance, follow-ups, and reports
- Multi-tenant agency and team architecture
- Activity logs, reusable notes, and document upload foundation
- Command palette search with Cmd/Ctrl+K
- Light and dark mode with persisted preference
- Reusable layout and UI components

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

Add your Supabase values to `.env`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Run the suggested schema in [supabase/schema.sql](./supabase/schema.sql), then run the MVP migration in
[supabase/migrations/20260522220000_create_recruitment_mvp_tables.sql](./supabase/migrations/20260522220000_create_recruitment_mvp_tables.sql)
inside the Supabase SQL editor. For the workflow dashboard upgrade, also run
[supabase/migrations/20260522233000_add_candidate_workflow_fields.sql](./supabase/migrations/20260522233000_add_candidate_workflow_fields.sql).
For the production architecture upgrade, run
[supabase/migrations/20260523003000_multi_tenant_recruitment_architecture.sql](./supabase/migrations/20260523003000_multi_tenant_recruitment_architecture.sql).
For education safer recruitment clearance, run
[supabase/migrations/20260523090000_education_compliance_engine.sql](./supabase/migrations/20260523090000_education_compliance_engine.sql).
For the candidate portal and school opportunity marketplace, run
[supabase/migrations/20260523123000_candidate_portal_marketplace.sql](./supabase/migrations/20260523123000_candidate_portal_marketplace.sql).
For resumable onboarding, invite delivery metadata, and verification workflow RPCs, run
[supabase/migrations/20260601100000_invite_delivery_onboarding_review_workflow.sql](./supabase/migrations/20260601100000_invite_delivery_onboarding_review_workflow.sql).

Deploy the Edge Functions after applying the migrations:

```bash
supabase functions deploy send-candidate-invite
supabase functions deploy verify-compliance-document
```

Set these function secrets in Supabase:

```bash
RESEND_API_KEY=your-resend-api-key
INVITE_FROM_EMAIL="RecruitFlow <your@email.com>"
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

If `RESEND_API_KEY` is not set, invite links are still created but email delivery is marked as skipped.

## Project structure

```text
src/
  components/
    layout/      App shell, nav, protected routes
    ui/          Reusable buttons, cards, inputs, alerts
    forms/       Reusable form controls
    feedback/    Toast notifications
  context/       Auth and theme providers
  features/
    auth/        Agency onboarding flow
    candidates/  Candidate list, detail, forms
    compliance/  Education clearance dashboard, checklist, and review flow
    dashboard/   Dashboard widgets/charts
    documents/   Supabase Storage document panels
    followups/   Follow-up workspace placeholder
    jobs/        Job list, detail, forms
    notes/       Reusable entity notes
    placements/  Placement list and creation form
    portal/      Candidate-only shell, onboarding, compliance and opportunities
    reports/     Reporting workspace placeholder
    shifts/      Recruiter supply shift and booking request operations
    team/        Team management
  hooks/         Shared app hooks
  lib/           Supabase client and utilities
  pages/         Route-level pages
  types/         Shared TypeScript types
```

## App routes

```text
/
/login
/signup
/onboarding
/dashboard
/candidates
/candidates/:id
/jobs
/jobs/:id
/placements
/shifts
/compliance
/compliance/review
/follow-ups
/reports
/team
/account
/portal/login
/portal/forgot-password
/portal/reset-password
/portal/accept?token=...
/portal
/portal/compliance
/portal/jobs
/portal/shifts
/portal/applications
/portal/bookings
/portal/documents
/portal/profile
```

## Supabase Storage

Create/use the private bucket named `recruitment-documents`. The multi-tenant migration creates the bucket and storage policies when permissions allow it. Uploaded files are stored under:

```text
{agency_id}/{entity_type}/{entity_id}/{file}
{agency_id}/candidates/{candidate_id}/{compliance_type_id}/{file_name}
```

The bucket remains private. Education clearance files are opened through short-lived signed URLs, and approval/rejection is restricted to owners, admins, and compliance members.

## Candidate portal workflow

1. A recruiter opens a candidate record and selects **Invite to Portal**.
2. The application creates a one-time invitation whose raw token is shown once; only its SHA-256 digest is stored in Supabase. The invite email function sends the link when configured.
3. The candidate opens the invitation link, creates an account with their invited email address, and becomes linked to that agency and candidate record.
4. The candidate uploads safer recruitment evidence through **My Compliance**.
5. Approved, unexpired required checks unlock applications and shift bookings. RLS enforces this clearance gate even for direct API requests.

Candidates are not agency members and cannot view recruiter screens, other candidates, or opportunities published by another agency.

## Realtime and verification

Supabase Realtime subscriptions refresh candidate compliance, bookings, and notifications. Candidate uploads are marked `Queued`, then the `verify-compliance-document` Edge Function records a conservative verification status and warnings. It never auto-approves high-risk or low-confidence documents; owners, admins, and compliance users must still approve or reject documents from `/compliance/review`.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
