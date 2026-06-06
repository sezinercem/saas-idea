import { Download, FileText } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { useSchoolPortal } from "../../hooks/useSchoolPortal";
import { useToast } from "../../hooks/useToast";
import { formatCurrency, formatDate } from "../../lib/format";
import { listSchoolInvoices } from "../../lib/schoolPortal";
import { statusTone } from "../../lib/status";
import type { Invoice } from "../../types/operations";

export function SchoolInvoicesPage() {
  const { session } = useSchoolPortal();
  const { notify } = useToast();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      setRows((await listSchoolInvoices(session)) as Invoice[]);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load invoices.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify, session]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  const totals = useMemo(() => ({
    outstanding: rows.filter((row) => row.status === "Sent" || row.status === "Overdue").reduce((sum, row) => sum + Number(row.amount) + Number(row.vat), 0),
    paid: rows.filter((row) => row.status === "Paid").reduce((sum, row) => sum + Number(row.amount) + Number(row.vat), 0),
  }), [rows]);

  const downloadSummary = (invoice: Invoice) => {
    const text = [`Invoice summary`, `School: ${invoice.school_name}`, `Amount: ${formatCurrency(Number(invoice.amount) + Number(invoice.vat))}`, `Status: ${invoice.status}`, `Due: ${formatDate(invoice.due_date)}`].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${invoice.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Invoices</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Invoice portal</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">View current, paid, and outstanding invoices from your agency.</p>
      </div>
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Metric label="Current invoices" value={rows.length} />
        <Metric label="Outstanding" value={formatCurrency(totals.outstanding)} />
        <Metric label="Paid" value={formatCurrency(totals.paid)} />
      </section>
      <Card className="mt-8">
        {isLoading ? <Skeleton className="h-64 w-full" /> : rows.length ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((invoice) => (
              <div key={invoice.id} className="grid gap-3 py-4 lg:grid-cols-[1.2fr_130px_120px_120px] lg:items-center">
                <div><p className="font-semibold">{invoice.source_type}</p><p className="text-sm text-slate-500">Due {formatDate(invoice.due_date)}</p></div>
                <strong>{formatCurrency(Number(invoice.amount) + Number(invoice.vat))}</strong>
                <Badge tone={statusTone(invoice.status)}>{invoice.status}</Badge>
                <Button variant="outline" className="h-9 px-3" onClick={() => downloadSummary(invoice)}><Download className="size-4" />Summary</Button>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={FileText} title="No invoices" body="Invoices from your agency will appear here." />}
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <Card className="p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></Card>;
}
