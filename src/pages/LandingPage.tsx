import { ArrowRight, Building2, CalendarDays, CheckCircle2, FileCheck2, GraduationCap, UsersRound } from "lucide-react";
import { LandingNav } from "../components/layout/LandingNav";
import { ButtonLink } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

const features = [
  {
    title: "Education candidate pipeline",
    body: "Track teachers and support staff from registration through school placement readiness.",
    icon: UsersRound,
  },
  {
    title: "School placement visibility",
    body: "Track upcoming school placements, live assignments, and clearance gating from one dashboard.",
    icon: CheckCircle2,
  },
  {
    title: "Safer recruitment clearance",
    body: "Review Enhanced DBS, safeguarding and Right to Work checks with expiry alerts and audit history.",
    icon: FileCheck2,
  },
  {
    title: "Supply coordination",
    body: "A focused foundation for education bookings and availability workflows as your agency grows.",
    icon: CalendarDays,
  },
];

const loginOptions = [
  {
    title: "Recruiter workspace",
    body: "Agency owners, admins, recruiters, and compliance teams manage the full operating system here.",
    href: "/login",
    cta: "Recruiter login",
    icon: UsersRound,
  },
  {
    title: "School portal",
    body: "Schools request cover, track bookings, approve timesheets, and view invoices. Access is created by the agency.",
    href: "/school/login",
    cta: "School login",
    icon: Building2,
  },
  {
    title: "Candidate portal",
    body: "Candidates complete compliance and view agency-only jobs or shifts after accepting an agency invite.",
    href: "/portal/login",
    cta: "Candidate login",
    icon: GraduationCap,
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <LandingNav />
      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
            <div>
              <p className="mb-5 inline-flex rounded-full border border-blue-200 bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-brand-100">
                Built for education recruitment agencies
              </p>
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
                Clear candidates for confident school placements.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                RecruitFlow brings education candidate pipelines, safer recruitment checks, and placement readiness into one operational workspace.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink to="/signup" className="h-12 px-5">
                  Start Free Trial
                  <ArrowRight className="size-4" />
                </ButtonLink>
                <ButtonLink to="/school/login" variant="outline" className="h-12 px-5">
                  School Login
                </ButtonLink>
                <ButtonLink to="/portal/login" variant="outline" className="h-12 px-5">
                  Candidate Login
                </ButtonLink>
              </div>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Schools and candidates use invite-only access issued by their agency.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
              <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-semibold">Today&apos;s clearance pulse</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Education operations snapshot</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                    Live ready
                  </span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Candidates", "128"],
                    ["Placements", "34"],
                    ["School placements", "72"],
                    ["Cleared", "91%"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                      <p className="mt-2 text-2xl font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="login-options" className="border-b border-slate-200 bg-slate-100/70 py-20 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Choose your login</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Separate portals for agencies, schools, and candidates.</h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300">
                RecruitFlow keeps each agency isolated. Schools and candidates only enter through an agency-issued invite or access code, so they never see another agency&apos;s jobs, bookings, documents, or data.
              </p>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {loginOptions.map((option) => (
                <Card key={option.title}>
                  <option.icon className="size-7 text-brand-600 dark:text-brand-100" />
                  <h3 className="mt-5 text-xl font-semibold">{option.title}</h3>
                  <p className="mt-3 min-h-20 text-sm leading-6 text-slate-600 dark:text-slate-300">{option.body}</p>
                  <ButtonLink to={option.href} className="mt-6 w-full">
                    {option.cta}
                    <ArrowRight className="size-4" />
                  </ButtonLink>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">
              Safer recruitment first
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Clearance control for school staffing teams.</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title}>
                <feature.icon className="size-6 text-brand-600 dark:text-brand-100" />
                <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{feature.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="pricing" className="border-y border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Pricing</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Simple starter pricing for education agencies.</h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300">
                Pricing is intentionally lightweight while the platform foundation is being built.
              </p>
            </div>
            <Card className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-brand-600 dark:text-brand-100">Starter</p>
                <p className="mt-2 text-4xl font-bold">$49</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">per workspace, placeholder plan</p>
              </div>
              <ButtonLink to="/signup">Start Free Trial</ButtonLink>
            </Card>
          </div>
        </section>
      </main>
      <footer className="bg-slate-950 px-4 py-8 text-slate-300 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-white">RecruitFlow</p>
          <p className="text-sm">Safer recruitment operations for education agencies.</p>
        </div>
      </footer>
    </div>
  );
}
