import type { LucideIcon } from "lucide-react";
import { BarChart3, CalendarClock, FileCheck2 } from "lucide-react";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";

const pages: Record<string, { body: string; icon: LucideIcon; title: string }> = {
  compliance: {
    title: "Compliance workspace",
    body: "Document uploads, right-to-work checks, expiry reminders, and audit views will live here soon.",
    icon: FileCheck2,
  },
  followups: {
    title: "Follow-ups workspace",
    body: "A focused queue for candidate calls, reminders, and next actions is planned for this area.",
    icon: CalendarClock,
  },
  reports: {
    title: "Reports workspace",
    body: "Operational reporting for pipeline health, placements, compliance, and booking performance is coming soon.",
    icon: BarChart3,
  },
};

export function PlaceholderPage({ type }: { type: keyof typeof pages }) {
  const page = pages[type];

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Coming soon</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{page.title}</h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">{page.body}</p>
      <div className="mt-8">
        <EmptyState icon={page.icon} title={page.title} body={page.body} />
      </div>
      <Card className="mt-6">
        <h2 className="text-lg font-semibold">Planned foundation</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          This page is protected and wired into navigation so the product shape is ready without adding unfinished workflow complexity.
        </p>
      </Card>
    </div>
  );
}
