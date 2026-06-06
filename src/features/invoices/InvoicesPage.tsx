import { FileText, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Select } from "../../components/forms/Select";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAgency } from "../../hooks/useAgency";
import { useToast } from "../../hooks/useToast";
import { formatCurrency, formatDate } from "../../lib/format";
import { createInvoice, listInvoices } from "../../lib/operations";
import { statusTone } from "../../lib/status";
import type { Invoice, InvoiceInput } from "../../types/operations";

const statuses = ["Draft", "Sent", "Paid", "Overdue"];
const sourceTypes = ["Placement", "Supply Booking", "Timesheet"];

export function InvoicesPage() {
  const { agency } = useAgency();
  const { notify } = useToast();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setRows(await listInvoices());
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load invoices.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  const totals = useMemo(() => ({
    outstanding: rows.filter((row) => row.status === "Sent" || row.status === "Overdue").reduce((sum, row) => sum + Number(row.amount) + Number(row.vat), 0),
    overdue: rows.filter((row) => row.status === "Overdue").length,
    paid: rows.filter((row) => row.status === "Paid").reduce((sum, row) => sum + Number(row.amount) + Number(row.vat), 0),
  }), [rows]);

  const save = async (input: InvoiceInput) => {
    if (!agency) return;
    await createInvoice(agency.id, input);
    notify("Invoice created.", "success");
    setIsOpen(false);
    await load();
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Billing</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Invoice workspace</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Generate and track invoices from placements, supply bookings, and approved timesheets.</p>
        </div>
        <Button onClick={() => setIsOpen(true)}><Plus className="size-4" />Create invoice</Button>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Metric label="Outstanding" value={formatCurrency(totals.outstanding)} />
        <Metric label="Overdue invoices" value={totals.overdue} />
        <Metric label="Paid revenue" value={formatCurrency(totals.paid)} />
      </section>

      <Card className="mt-8">
        {isLoading ? <Skeleton className="h-64 w-full" /> : rows.length ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((invoice) => (
              <div key={invoice.id} className="grid gap-3 py-4 lg:grid-cols-[1.2fr_130px_120px_110px_110px] lg:items-center">
                <div><p className="font-semibold">{invoice.school_name}</p><p className="text-sm text-slate-500">{invoice.source_type} · due {formatDate(invoice.due_date)}</p></div>
                <strong>{formatCurrency(Number(invoice.amount) + Number(invoice.vat))}</strong>
                <span className="text-sm text-slate-500">VAT {formatCurrency(invoice.vat)}</span>
                <Badge tone={statusTone(invoice.status)}>{invoice.status}</Badge>
                <span className="text-sm text-slate-500">{formatDate(invoice.created_at)}</span>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={FileText} title="No invoices yet" body="Create invoices once placements or timesheets are ready to bill." />}
      </Card>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create invoice" size="lg">
        <InvoiceForm onCancel={() => setIsOpen(false)} onSubmit={save} />
      </Modal>
    </div>
  );
}

function InvoiceForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (input: InvoiceInput) => Promise<void> }) {
  const [form, setForm] = useState<InvoiceInput>(() => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    return {
      school_id: null,
      school_name: "",
      source_type: "Timesheet",
      source_id: null,
      status: "Draft",
      amount: 0,
      vat: 0,
      due_date: dueDate.toISOString().slice(0, 10),
    };
  });
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <Input label="School" value={form.school_name} onChange={(event) => setForm({ ...form, school_name: event.target.value })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Source" value={form.source_type} options={sourceTypes.map((value) => ({ label: value, value }))} onChange={(event) => setForm({ ...form, source_type: event.target.value as InvoiceInput["source_type"] })} />
        <Select label="Status" value={form.status} options={statuses.map((value) => ({ label: value, value }))} onChange={(event) => setForm({ ...form, status: event.target.value as InvoiceInput["status"] })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Amount" type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} />
        <Input label="VAT" type="number" value={form.vat} onChange={(event) => setForm({ ...form, vat: Number(event.target.value) })} />
        <Input label="Due date" type="date" value={form.due_date ?? ""} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
      </div>
      <div className="flex justify-end gap-3"><Button variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving || !form.school_name}>{saving ? "Saving..." : "Create invoice"}</Button></div>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <Card className="p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></Card>;
}
