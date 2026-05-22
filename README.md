# RecruitFlow

A React, TypeScript, Tailwind CSS, and Supabase foundation for a recruitment and workforce management SaaS application.

## Features

- Landing page with responsive navbar, hero, feature placeholders, pricing, and footer
- Supabase email/password login and signup flows
- Persistent auth session handling
- Protected dashboard and account routes
- Editable profile fields backed by a `profiles` table
- Candidate, job, and placement management
- Operations dashboard with pipeline, follow-up, compliance, and placement widgets
- Protected placeholder workspaces for compliance, follow-ups, and reports
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
    candidates/  Candidate list, detail, forms
    jobs/        Job list, detail, forms
    placements/  Placement list and creation form
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
/dashboard
/candidates
/candidates/:id
/jobs
/jobs/:id
/placements
/compliance
/follow-ups
/reports
/account
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
