import { ClipboardList, Plus } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Select } from "../../components/forms/Select";
import { Textarea } from "../../components/forms/Textarea";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { useSchoolPortal } from "../../hooks/useSchoolPortal";
import { useToast } from "../../hooks/useToast";
import { formatDate } from "../../lib/format";
import { createSchoolBookingRequest, listSchoolBookingRequests } from "../../lib/schoolPortal";
import { statusTone } from "../../lib/status";
import type { BookingRequest, SchoolBookingRequestInput } from "../../types/operations";

const roles = ["Teacher", "Teaching Assistant", "Cover Supervisor", "SEN Support"];
const urgencies = ["Low", "Normal", "Urgent"];

export function SchoolRequestsPage() {
  const { session } = useSchoolPortal();
  const { notify } = useToast();
  const [rows, setRows] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      setRows(await listSchoolBookingRequests(session));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load booking requests.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify, session]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  const save = async (input: SchoolBookingRequestInput) => {
    if (!session) return;
    await createSchoolBookingRequest(session, input);
    notify("Booking request submitted.", "success");
    setIsOpen(false);
    await load();
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Cover Requests</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Request supply staff</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Create teacher, TA, cover supervisor, and SEN support requests.</p>
        </div>
        <Button onClick={() => setIsOpen(true)}><Plus className="size-4" />New request</Button>
      </div>

      <Card className="mt-8">
        {isLoading ? <Skeleton className="h-56 w-full" /> : rows.length ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((request) => (
              <div key={request.id} className="grid gap-3 py-4 lg:grid-cols-[1.2fr_120px_130px_130px] lg:items-center">
                <div><p className="font-semibold">{request.role_required}</p><p className="text-sm text-slate-500">{formatDate(request.request_date)} · {request.subject || "Any subject"} · {request.year_group || "Any year"}</p></div>
                <Badge tone={statusTone(request.urgency)}>{request.urgency}</Badge>
                <Badge tone={statusTone(request.status)}>{request.status}</Badge>
                <Badge tone={statusTone(request.workflow_stage)}>{request.workflow_stage}</Badge>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={ClipboardList} title="No requests yet" body="Create a cover request and your agency will start matching candidates." action={<Button onClick={() => setIsOpen(true)}>Create request</Button>} />}
      </Card>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create booking request" size="lg">
        <RequestForm onCancel={() => setIsOpen(false)} onSubmit={save} />
      </Modal>
    </div>
  );
}

function RequestForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (input: SchoolBookingRequestInput) => Promise<void> }) {
  const [form, setForm] = useState<SchoolBookingRequestInput>({
    role_required: "Teacher",
    request_date: new Date().toISOString().slice(0, 10),
    start_time: "08:30",
    end_time: "15:30",
    subject: "",
    year_group: "",
    notes: "",
    urgency: "Normal",
    status: "Open",
    workflow_stage: "New Requests",
    vacancies: 1,
  });
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Role" value={form.role_required} options={roles.map((value) => ({ label: value, value }))} onChange={(event) => setForm({ ...form, role_required: event.target.value as SchoolBookingRequestInput["role_required"] })} />
        <Select label="Urgency" value={form.urgency} options={urgencies.map((value) => ({ label: value, value }))} onChange={(event) => setForm({ ...form, urgency: event.target.value as SchoolBookingRequestInput["urgency"] })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Date" type="date" value={form.request_date} onChange={(event) => setForm({ ...form, request_date: event.target.value })} />
        <Input label="Start" type="time" value={form.start_time ?? ""} onChange={(event) => setForm({ ...form, start_time: event.target.value })} />
        <Input label="End" type="time" value={form.end_time ?? ""} onChange={(event) => setForm({ ...form, end_time: event.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Subject" value={form.subject ?? ""} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
        <Input label="Year group" value={form.year_group ?? ""} onChange={(event) => setForm({ ...form, year_group: event.target.value })} />
      </div>
      <Textarea label="Notes" value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      <div className="flex justify-end gap-3"><Button variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Sending..." : "Submit request"}</Button></div>
    </form>
  );
}
