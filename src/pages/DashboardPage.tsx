import { Activity, BriefcaseBusiness, CalendarCheck, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ButtonLink } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { formatDate } from "../lib/format";
import { getDashboardMetrics } from "../lib/recruitment";

type DashboardMetrics = Awaited<ReturnType<typeof getDashboardMetrics>>;

const statConfig = [
  { label: "Total Candidates", key: "totalCandidates", icon: UsersRound, href: "/candidates" },
  { label: "Active Jobs", key: "activeJobs", icon: BriefcaseBusiness, href: "/jobs" },
  { label: "Placements", key: "placements", icon: CalendarCheck, href: "/placements" },
] as const;

export function DashboardPage() {
  const { user, profile } = useAuth();
  const { notify } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const displayName = profile?.full_name || user?.email;

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      setMetrics(await getDashboardMetrics());
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load dashboard.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    queueMicrotask(() => {
      loadMetrics();
    });
  }, [loadMetrics]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Welcome back, {displayName}</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">A live view of your recruitment workflow foundation.</p>
        </div>
        <ButtonLink to="/candidates">Add candidate</ButtonLink>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {statConfig.map((stat) => (
          <Card key={stat.key}>
            <div className="flex items-center justify-between gap-4">
              <span className="flex size-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100">
                <stat.icon className="size-5" />
              </span>
              <ButtonLink to={stat.href} variant="ghost" className="h-9 px-3">
                View
              </ButtonLink>
            </div>
            <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
            {isLoading ? <Skeleton className="mt-3 h-9 w-20" /> : <p className="mt-2 text-3xl font-bold">{metrics?.[stat.key] ?? 0}</p>}
          </Card>
        ))}
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="size-5 text-brand-600 dark:text-brand-100" />
          <h2 className="text-xl font-semibold">Recent Activity</h2>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : metrics?.recentActivity.length ? (
          <Card className="divide-y divide-slate-200 p-0 dark:divide-slate-800">
            {metrics.recentActivity.map((activity) => (
              <div key={`${activity.type}-${activity.id}`} className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{activity.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{activity.type}</p>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(activity.created_at)}</p>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon={Activity}
            title="No recent activity"
            body="Add candidates, jobs, or placements and this dashboard will start showing live operational activity."
            action={<ButtonLink to="/candidates">Add candidate</ButtonLink>}
          />
        )}
      </section>
    </div>
  );
}
