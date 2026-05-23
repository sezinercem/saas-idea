import { AlertTriangle, Bell, BriefcaseBusiness, CalendarDays, CheckCircle2, ClipboardCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { ButtonLink } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { usePortal } from "../../hooks/usePortal";
import { useToast } from "../../hooks/useToast";
import { formatDate, fullName } from "../../lib/format";
import { getPortalDashboard, subscribePortalUpdates } from "../../lib/portal";
import { statusTone } from "../../lib/status";
import type { PortalDashboardData } from "../../types/portal";

export function PortalDashboardPage() {
  const { session } = usePortal();
  const { notify } = useToast();
  const [data, setData] = useState<PortalDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setData(await getPortalDashboard(session));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load your portal.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify, session]);

  useEffect(() => {
    queueMicrotask(() => load());
    return subscribePortalUpdates(() => load());
  }, [load]);

  if (!session) return null;
  const readiness = data?.clearanceStatus === "Cleared" ? "Cleared for Work" : data?.clearanceStatus === "Pending Review" ? "Needs Review" : "Pending Compliance";

  return (
    <div>
      <p className="text-sm font-semibold uppercase text-brand-600 dark:text-brand-100">Candidate home</p>
      <h1 className="mt-2 text-3xl font-bold">Welcome, {fullName(session.candidate.first_name, session.candidate.last_name)}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">Complete safer recruitment checks to unlock jobs and day supply shifts from {session.agency.name}.</p>

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <ClipboardCheck className="size-5 text-brand-600" />
            <Badge tone={statusTone(data?.clearanceStatus)}>{data?.clearanceStatus || "Loading"}</Badge>
          </div>
          <p className="mt-4 text-sm text-slate-500">Compliance complete</p>
          {isLoading ? <Skeleton className="mt-2 h-10 w-24" /> : <p className="mt-2 text-3xl font-bold">{data?.completionPercent ?? 0}%</p>}
          <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-2 rounded-full bg-brand-600" style={{ width: `${data?.completionPercent ?? 0}%` }} />
          </div>
        </Card>
        <Card>
          <CheckCircle2 className="size-5 text-emerald-600" />
          <p className="mt-4 text-sm text-slate-500">Placement readiness</p>
          <p className="mt-2 text-xl font-bold">{readiness}</p>
          <p className="mt-2 text-sm text-slate-500">{data?.missingItems ?? 0} checks outstanding, {data?.expiringItems ?? 0} expiry risks</p>
        </Card>
        <Card>
          <AlertTriangle className="size-5 text-amber-600" />
          <p className="mt-4 text-sm text-slate-500">Onboarding checklist</p>
          <p className="mt-2 text-xl font-bold">{data?.clearanceStatus === "Cleared" ? "Ready to apply" : "Upload documents"}</p>
          <ButtonLink to="/portal/compliance" className="mt-4 h-9 px-3" variant="outline">Open checklist</ButtonLink>
        </Card>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Available opportunities</h2>
            <ButtonLink to="/portal/jobs" variant="ghost" className="h-9 px-2">View all</ButtonLink>
          </div>
          {isLoading ? <Skeleton className="mt-5 h-32 w-full" /> : data?.jobs.length || data?.shifts.length ? (
            <div className="mt-5 space-y-3">
              {data.jobs.map((job) => (
                <Opportunity key={job.id} icon={BriefcaseBusiness} title={job.job_title || "Teaching role"} meta={`${job.school_name || job.company_name || "School"} · ${job.job_type}`} />
              ))}
              {data.shifts.map((shift) => (
                <Opportunity key={shift.id} icon={CalendarDays} title={shift.shift_title} meta={`${shift.school_name} · ${formatDate(shift.shift_date)}`} />
              ))}
            </div>
          ) : <EmptyState icon={BriefcaseBusiness} title="No opportunities published" body="Your agency will publish suitable school work here." />}
        </Card>
        <Card className="lg:col-span-5">
          <div className="flex items-center gap-2"><Bell className="size-5 text-brand-600" /><h2 className="text-lg font-semibold">Notifications</h2></div>
          {isLoading ? <Skeleton className="mt-5 h-32 w-full" /> : data?.notifications.length ? (
            <div className="mt-5 space-y-3">
              {data.notifications.slice(0, 5).map((notification) => (
                <div key={notification.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-sm font-semibold">{notification.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{notification.body}</p>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Bell} title="No notifications" body="Clearance reviews and booking updates will appear here." />}
        </Card>
      </div>
    </div>
  );
}

function Opportunity({ icon: Icon, meta, title }: { icon: typeof BriefcaseBusiness; meta: string; title: string }) {
  return <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"><Icon className="mt-1 size-4 text-brand-600" /><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-slate-500">{meta}</p></div></div>;
}
