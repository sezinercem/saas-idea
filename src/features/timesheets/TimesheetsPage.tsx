import { Clock3, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Select } from "../../components/forms/Select";
import { Textarea } from "../../components/forms/Textarea";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAgency } from "../../hooks/useAgency";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { formatDate, fullName } from "../../lib/format";
import { createTimesheet, listTimesheets, timesheetHours, updateTimesheetStatus } from "../../lib/operations";
import { listCandidates } from "../../lib/recruitment";
import { statusTone } from "../../lib/status";
import type { Timesheet, TimesheetInput } from "../../types/operations";
import type { Candidate } from "../../types/recruitment";

export function TimesheetsPage() {
  const { agency } = useAgency();
  const { user } = useAuth();
  const { notify } = useToast();
  const [rows, setRows] = useState<Timesheet[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [timesheetRows, candidateRows] = await Promise.all([listTimesheets(), listCandidates()]);
      setRows(timesheetRows);
      setCandidates(candidateRows);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load timesheets.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  const save = async (input: TimesheetInput) => {
    if (!agency) return;
    await createTimesheet(agency.id, input);
    notify("Timesheet created.", "success");
    setIsOpen(false);
    await load();
  };

  const decide = async (timesheet: Timesheet, status: "Approved" | "Rejected") => {
    await updateTimesheetStatus(timesheet.id, status, user?.id, status === "Rejected" ? "Rejected by school reviewer." : undefined);
    notify(`Timesheet ${status.toLowerCase()}.`, "success");
    await load();
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Timesheets</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">School timesheet approval</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Review supply hours, approve school work, and prepare payroll.</p>
        </div>
        <Button onClick={() => setIsOpen(true)}><Plus className="size-4" />Add timesheet</Button>
      </div>

      <Card className="mt-8">
        {isLoading ? <Skeleton className="h-64 w-full" /> : rows.length ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((timesheet) => (
              <div key={timesheet.id} className="grid gap-3 py-4 lg:grid-cols-[1.2fr_1fr_90px_110px_160px] lg:items-center">
                <div>
                  <p className="font-semibold">{timesheet.candidates ? fullName(timesheet.candidates.first_name, timesheet.candidates.last_name) : "Candidate"}</p>
                  <p className="text-sm text-slate-500">{timesheet.school_name} · {formatDate(timesheet.work_date)}</p>
                </div>
                <span className="text-sm text-slate-500">{timesheet.start_time} to {timesheet.end_time} · {timesheet.break_minutes}m break</span>
                <span className="font-semibold">{timesheetHours(timesheet)}h</span>
                <Badge tone={statusTone(timesheet.status)}>{timesheet.status}</Badge>
                <div className="flex gap-2">
                  {timesheet.status === "Submitted" ? <>
                    <Button className="h-9 px-3" onClick={() => decide(timesheet, "Approved")}>Approve</Button>
                    <Button variant="outline" className="h-9 px-3" onClick={() => decide(timesheet, "Rejected")}>Reject</Button>
                  </> : null}
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={Clock3} title="No timesheets yet" body="Submitted candidate timesheets will appear here for school approval." />}
      </Card>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add timesheet" size="lg">
        <TimesheetForm candidates={candidates} onCancel={() => setIsOpen(false)} onSubmit={save} />
      </Modal>
    </div>
  );
}

function TimesheetForm({ candidates, onCancel, onSubmit }: { candidates: Candidate[]; onCancel: () => void; onSubmit: (input: TimesheetInput) => Promise<void> }) {
  const [form, setForm] = useState<TimesheetInput>({
    candidate_id: candidates[0]?.id ?? null,
    school_id: null,
    school_name: "",
    work_date: new Date().toISOString().slice(0, 10),
    start_time: "08:30",
    end_time: "15:30",
    break_minutes: 30,
    notes: "",
    status: "Submitted",
    pay_rate: 120,
    charge_rate: 180,
  });
  const [saving, setSaving] = useState(false);
  const candidateOptions = useMemo(() => candidates.map((candidate) => ({ label: fullName(candidate.first_name, candidate.last_name), value: candidate.id })), [candidates]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Candidate" value={form.candidate_id ?? ""} options={candidateOptions} onChange={(event) => setForm({ ...form, candidate_id: event.target.value })} />
        <Input label="School" value={form.school_name} onChange={(event) => setForm({ ...form, school_name: event.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Input label="Date" type="date" value={form.work_date} onChange={(event) => setForm({ ...form, work_date: event.target.value })} />
        <Input label="Start" type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} />
        <Input label="End" type="time" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} />
        <Input label="Break minutes" type="number" value={form.break_minutes} onChange={(event) => setForm({ ...form, break_minutes: Number(event.target.value) })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Pay rate" type="number" value={form.pay_rate} onChange={(event) => setForm({ ...form, pay_rate: Number(event.target.value) })} />
        <Input label="Charge rate" type="number" value={form.charge_rate} onChange={(event) => setForm({ ...form, charge_rate: Number(event.target.value) })} />
      </div>
      <Textarea label="Notes" value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      <div className="flex justify-end gap-3"><Button variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving || !form.school_name}>{saving ? "Saving..." : "Submit timesheet"}</Button></div>
    </form>
  );
}
