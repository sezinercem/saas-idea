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
    reports/     Reporting workspace placeholder
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
/compliance
/follow-ups
/reports
/team
/account
```

## Supabase Storage

Create/use the private bucket named `recruitment-documents`. The multi-tenant migration creates the bucket and storage policies when permissions allow it. Uploaded files are stored under:

```text
{agency_id}/{entity_type}/{entity_id}/{file}
{agency_id}/candidates/{candidate_id}/{compliance_type_id}/{file_name}
```

The bucket remains private. Education clearance files are opened through short-lived signed URLs, and approval/rejection is restricted to owners, admins, and compliance members.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
