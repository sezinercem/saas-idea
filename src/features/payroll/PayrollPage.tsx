import { Download, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../hooks/useToast";
import { formatCurrency, formatDate, fullName } from "../../lib/format";
import { listTimesheets, timesheetHours, updateTimesheetStatus } from "../../lib/operations";
import { statusTone } from "../../lib/status";
import type { Timesheet } from "../../types/operations";

export function PayrollPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState<Timesheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setRows((await listTimesheets()).filter((timesheet) => timesheet.status === "Approved" || timesheet.status === "Paid"));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load payroll.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  const totals = useMemo(() => {
    const hours = rows.reduce((sum, row) => sum + timesheetHours(row), 0);
    const gross = rows.reduce((sum, row) => sum + timesheetHours(row) * Number(row.pay_rate), 0);
    return { hours, gross, outstanding: rows.filter((row) => row.status === "Approved").length };
  }, [rows]);

  const exportCsv = () => {
    const header = ["Candidate", "School", "Date", "Hours", "Pay rate", "Gross pay", "Status"];
    const lines = rows.map((row) => [
      row.candidates ? fullName(row.candidates.first_name, row.candidates.last_name) : "Candidate",
      row.school_name,
      row.work_date,
      timesheetHours(row).toString(),
      row.pay_rate.toString(),
      (timesheetHours(row) * Number(row.pay_rate)).toFixed(2),
      row.status,
    ]);
    const csv = [header, ...lines].map((line) => line.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "payroll-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Payroll</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Payroll workspace</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Turn approved timesheets into payroll-ready reports.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="size-4" />Export CSV</Button>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Metric label="Approved timesheets" value={rows.length} />
        <Metric label="Payroll hours" value={totals.hours} />
        <Metric label="Gross pay" value={formatCurrency(totals.gross)} />
      </section>

      <Card className="mt-8">
        {isLoading ? <Skeleton className="h-64 w-full" /> : rows.length ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((row) => (
              <div key={row.id} className="grid gap-3 py-4 lg:grid-cols-[1.2fr_1fr_90px_120px_110px] lg:items-center">
                <div><p className="font-semibold">{row.candidates ? fullName(row.candidates.first_name, row.candidates.last_name) : "Candidate"}</p><p className="text-sm text-slate-500">{row.school_name} · {formatDate(row.work_date)}</p></div>
                <span className="text-sm text-slate-500">{timesheetHours(row)} hours @ {formatCurrency(row.pay_rate)}</span>
                <strong>{formatCurrency(timesheetHours(row) * Number(row.pay_rate))}</strong>
                <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                {row.status === "Approved" ? <Button className="h-9 px-3" onClick={async () => { await updateTimesheetStatus(row.id, "Paid"); await load(); }}>Mark paid</Button> : null}
              </div>
            ))}
          </div>
        ) : <EmptyState icon={WalletCards} title="No payroll ready" body="Approved timesheets will appear here for export." />}
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <Card className="p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></Card>;
}
