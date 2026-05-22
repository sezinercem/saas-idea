import { CalendarDays, FileCheck2, UserCheck, UsersRound } from "lucide-react";
import { Card } from "../components/ui/Card";
import { useAuth } from "../hooks/useAuth";

const stats = [
  { label: "Candidates", value: "128", change: "+12 this week", icon: UsersRound },
  { label: "Placements", value: "34", change: "8 starting soon", icon: UserCheck },
  { label: "Compliance", value: "91%", change: "5 checks pending", icon: FileCheck2 },
  { label: "Bookings", value: "72", change: "18 confirmed today", icon: CalendarDays },
];

export function DashboardPage() {
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || user?.email;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Welcome back, {displayName}</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            Your signed-in user is {user?.email}. Operational CRM modules are intentionally placeholders for now.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center justify-between gap-4">
              <span className="flex size-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100">
                <stat.icon className="size-5" />
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">Placeholder</span>
            </div>
            <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{stat.change}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <h2 className="text-xl font-semibold">Next build area</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          This foundation is ready for future candidate records, placement workflows, compliance documents, and booking
          schedules once the core data model is defined.
        </p>
      </Card>
    </div>
  );
}
