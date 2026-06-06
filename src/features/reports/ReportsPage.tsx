import { BarChart3 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../hooks/useToast";
import { formatCurrency } from "../../lib/format";
import { getComplianceDashboard } from "../../lib/compliance";
import { getOperationsDashboard, listBookingRequests, listInvoices, listTimesheets, timesheetHours } from "../../lib/operations";
import { listCandidates, listPlacements } from "../../lib/recruitment";
import { useAgency } from "../../hooks/useAgency";

type ReportData = {
  operations: Awaited<ReturnType<typeof getOperationsDashboard>>;
  schoolUsage: Record<string, number>;
  candidateUtilisation: number;
  fillRate: number;
  revenue: number;
  complianceRisks: number;
  placements: number;
};

export function ReportsPage() {
  const { agency } = useAgency();
  const { notify } = useToast();
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [operations, bookings, invoices, timesheets, candidates, placements, compliance] = await Promise.all([
        getOperationsDashboard(),
        listBookingRequests(),
        listInvoices(),
        listTimesheets(),
        listCandidates(),
        listPlacements(),
        agency ? getComplianceDashboard(agency.id) : Promise.resolve(null),
      ]);
      setData({
        operations,
        schoolUsage: bookings.reduce<Record<string, number>>((acc, booking) => {
          acc[booking.school_name] = (acc[booking.school_name] ?? 0) + 1;
          return acc;
        }, {}),
        candidateUtilisation: candidates.length ? Math.round((timesheets.reduce((sum, row) => sum + timesheetHours(row), 0) / candidates.length) * 10) / 10 : 0,
        fillRate: operations.fillRate,
        revenue: invoices.reduce((sum, invoice) => sum + Number(invoice.amount) + Number(invoice.vat), 0),
        complianceRisks: compliance?.nonCompliant ?? 0,
        placements: placements.length,
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load reports.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [agency, notify]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Reports</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Operational reporting</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">Track school usage, candidate utilisation, fill rate, revenue, compliance, and placements.</p>
      </div>

      {isLoading ? <Skeleton className="mt-8 h-72 w-full" /> : data ? (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Metric label="School usage" value={Object.values(data.schoolUsage).reduce((sum, count) => sum + count, 0)} />
            <Metric label="Candidate utilisation" value={`${data.candidateUtilisation}h`} />
            <Metric label="Fill rate" value={`${data.fillRate}%`} />
            <Metric label="Revenue" value={formatCurrency(data.revenue)} />
            <Metric label="Compliance risks" value={data.complianceRisks} />
            <Metric label="Placements" value={data.placements} />
          </section>
          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <ReportCard title="School usage" rows={data.schoolUsage} />
            <Card>
              <div className="flex items-center gap-2"><BarChart3 className="size-5 text-brand-600" /><h2 className="text-lg font-semibold">Revenue dashboard</h2></div>
              <div className="mt-5 grid gap-3">
                <Line label="Revenue this month" value={formatCurrency(data.operations.revenueThisMonth)} />
                <Line label="Revenue this year" value={formatCurrency(data.operations.revenueThisYear)} />
                <Line label="Outstanding invoices" value={formatCurrency(data.operations.outstandingInvoices)} />
                <Line label="Payroll liability" value={formatCurrency(data.operations.payrollLiability)} />
                <Line label="Gross margin" value={`${data.operations.grossMargin}%`} />
              </div>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <Card className="p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></Card>;
}

function ReportCard({ rows, title }: { rows: Record<string, number>; title: string }) {
  const entries = Object.entries(rows).sort((a, b) => b[1] - a[1]);
  return (
    <Card>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-5 space-y-3">
        {entries.length ? entries.map(([label, value]) => <Line key={label} label={label} value={value} />) : <p className="text-sm text-slate-500">No report data yet.</p>}
      </div>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: number | string }) {
  return <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950"><span>{label}</span><strong>{value}</strong></div>;
}
