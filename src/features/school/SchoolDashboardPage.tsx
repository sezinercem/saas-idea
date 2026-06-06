import { CalendarCheck, ClipboardList, FileText, PoundSterling } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { useSchoolPortal } from "../../hooks/useSchoolPortal";
import { useToast } from "../../hooks/useToast";
import { formatCurrency, formatDate } from "../../lib/format";
import { getSchoolDashboard } from "../../lib/schoolPortal";
import { statusTone } from "../../lib/status";

type DashboardData = Awaited<ReturnType<typeof getSchoolDashboard>>;

export function SchoolDashboardPage() {
  const { session } = useSchoolPortal();
  const { notify } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      setData(await getSchoolDashboard(session));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load school dashboard.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify, session]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  return (
    <div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">School Operations</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Welcome, {session?.school.name}</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">Request staff, track cover, approve timesheets, and review invoices.</p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <Metric icon={CalendarCheck} label="Fill rate" value={`${data?.fillRate ?? 0}%`} loading={isLoading} />
        <Metric icon={ClipboardList} label="Booking volume" value={data?.bookingVolume ?? 0} loading={isLoading} />
        <Metric icon={CalendarCheck} label="Avg fulfilment" value={data?.averageFulfilmentTime ?? "No data"} loading={isLoading} />
        <Metric icon={PoundSterling} label="Monthly spend" value={formatCurrency(data?.monthlySpend ?? 0)} loading={isLoading} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Today's bookings" loading={isLoading}>
          {data?.todaysBookings.length ? data.todaysBookings.map((request) => (
            <Line key={request.id} title={request.role_required} meta={`${request.subject || "Any subject"} · ${request.start_time ?? ""}`} status={request.workflow_stage} />
          )) : <EmptyState icon={CalendarCheck} title="No bookings today" body="Today's cover bookings will appear here." />}
        </Panel>
        <Panel title="Open requests" loading={isLoading}>
          {data?.openRequests.length ? data.openRequests.slice(0, 5).map((request) => (
            <Line key={request.id} title={request.role_required} meta={formatDate(request.request_date)} status={request.status} />
          )) : <EmptyState icon={ClipboardList} title="No open requests" body="New cover requests will appear here." />}
        </Panel>
        <Panel title="Pending approvals" loading={isLoading}>
          {data?.pendingApprovals.length ? data.pendingApprovals.slice(0, 5).map((timesheet) => (
            <Line key={timesheet.id} title={timesheet.school_name} meta={formatDate(timesheet.work_date)} status={timesheet.status} />
          )) : <EmptyState icon={CalendarCheck} title="No timesheets pending" body="Submitted timesheets will appear here." />}
        </Panel>
        <Panel title="Recent invoices" loading={isLoading}>
          {data?.recentInvoices.length ? data.recentInvoices.map((invoice) => (
            <Line key={invoice.id} title={invoice.school_name} meta={`${formatCurrency(Number(invoice.amount) + Number(invoice.vat))} · due ${formatDate(invoice.due_date)}`} status={invoice.status} />
          )) : <EmptyState icon={FileText} title="No invoices yet" body="Invoices from your agency will appear here." />}
        </Panel>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, loading, value }: { icon: typeof CalendarCheck; label: string; loading: boolean; value: number | string }) {
  return (
    <Card className="p-5">
      <Icon className="size-5 text-brand-600" />
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      {loading ? <Skeleton className="mt-2 h-8 w-20" /> : <p className="mt-2 text-2xl font-bold">{value}</p>}
    </Card>
  );
}

function Panel({ children, loading, title }: { children: React.ReactNode; loading: boolean; title: string }) {
  return <Card><h2 className="text-lg font-semibold">{title}</h2><div className="mt-5">{loading ? <Skeleton className="h-40 w-full" /> : children}</div></Card>;
}

function Line({ meta, status, title }: { meta: string; status: string; title: string }) {
  return <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-slate-500">{meta}</p></div><Badge tone={statusTone(status)}>{status}</Badge></div>;
}
