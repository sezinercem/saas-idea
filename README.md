# RecruitFlow

A React, TypeScript, Tailwind CSS, and Supabase foundation for a recruitment and workforce management SaaS application.

## Features

- Landing page with responsive navbar, hero, feature placeholders, pricing, and footer
- Supabase email/password login and signup flows
- Persistent auth session handling
- Protected dashboard and account routes
- Editable profile fields backed by a `profiles` table
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

Run the suggested schema in [supabase/schema.sql](./supabase/schema.sql) inside the Supabase SQL editor.

## Project structure

```text
src/
  components/
    layout/      App shell, nav, protected routes
    ui/          Reusable buttons, cards, inputs, alerts
  context/       Auth and theme providers
  hooks/         Shared app hooks
  lib/           Supabase client and utilities
  pages/         Route-level pages
  types/         Shared TypeScript types
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
