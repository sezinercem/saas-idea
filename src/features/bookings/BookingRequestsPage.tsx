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
import { useAgency } from "../../hooks/useAgency";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { confirmBookingMatch, createBookingRequest, listBookingMatches, listBookingRequests, updateBookingRequest } from "../../lib/operations";
import { formatDate, fullName } from "../../lib/format";
import { statusTone } from "../../lib/status";
import type { BookingMatch, BookingRequest, BookingRequestInput } from "../../types/operations";

const roles = ["Teacher", "Teaching Assistant", "Cover Supervisor", "SEN Support"];
const urgencies = ["Low", "Normal", "Urgent"];
const statuses = ["Open", "Partially Filled", "Filled", "Cancelled"];

export function BookingRequestsPage() {
  const { agency } = useAgency();
  const { user } = useAuth();
  const { notify } = useToast();
  const [rows, setRows] = useState<BookingRequest[]>([]);
  const [matches, setMatches] = useState<Record<string, BookingMatch[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const requestRows = await listBookingRequests();
      setRows(requestRows);
      if (agency) {
        const matchPairs = await Promise.all(requestRows.slice(0, 8).map(async (request) => [request.id, await listBookingMatches(agency.id, request)] as const));
        setMatches(Object.fromEntries(matchPairs));
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load booking requests.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [agency, notify]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  const save = async (input: BookingRequestInput) => {
    if (!agency) return;
    await createBookingRequest(agency.id, user?.id, input);
    notify("Booking request created.", "success");
    setIsOpen(false);
    await load();
  };

  const confirm = async (request: BookingRequest, match: BookingMatch) => {
    if (!agency) return;
    await confirmBookingMatch(agency.id, request.id, match);
    notify("Candidate confirmed for booking request.", "success");
    await load();
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">School Demand</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Booking requests</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Capture school cover requests and move them into fulfilment.</p>
        </div>
        <Button onClick={() => setIsOpen(true)}><Plus className="size-4" />Create request</Button>
      </div>

      <Card className="mt-8">
        {isLoading ? <Skeleton className="h-60 w-full" /> : rows.length ? (
          <div className="space-y-4">
            {rows.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{request.school_name}</h2>
                      <Badge tone={statusTone(request.urgency)}>{request.urgency}</Badge>
                      <Badge tone={statusTone(request.status)}>{request.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{request.role_required} · {formatDate(request.request_date)} · {request.subject || "Any subject"} · {request.year_group || "Any year"}</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{request.notes || "No additional notes."}</p>
                  </div>
                  <Select
                    label="Status"
                    value={request.status}
                    options={statuses.map((value) => ({ label: value, value }))}
                    onChange={async (event) => {
                      await updateBookingRequest(request.id, { status: event.target.value as BookingRequest["status"] });
                      await load();
                    }}
                  />
                </div>
                <div className="mt-5">
                  <p className="text-sm font-semibold">Best Matches</p>
                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    {(matches[request.id] ?? []).slice(0, 3).map((match) => (
                      <div key={match.candidate_id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{match.candidates ? fullName(match.candidates.first_name, match.candidates.last_name) : "Candidate"}</p>
                            <p className="mt-1 text-xs text-slate-500">{match.reason}</p>
                          </div>
                          <Badge tone={match.score >= 70 ? "green" : match.score >= 45 ? "amber" : "slate"}>{match.score}</Badge>
                        </div>
                        <Button className="mt-3 h-9 px-3" onClick={() => confirm(request, match)}>Confirm</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={ClipboardList} title="No booking requests" body="Create a school request to start matching available supply staff." action={<Button onClick={() => setIsOpen(true)}>Create request</Button>} />}
      </Card>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create school booking request" size="lg">
        <BookingRequestForm onCancel={() => setIsOpen(false)} onSubmit={save} />
      </Modal>
    </div>
  );
}

function BookingRequestForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (input: BookingRequestInput) => Promise<void> }) {
  const [form, setForm] = useState<BookingRequestInput>({
    school_id: null,
    school_name: "",
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
        <Input label="School" value={form.school_name} onChange={(event) => setForm({ ...form, school_name: event.target.value })} />
        <Select label="Role" value={form.role_required} options={roles.map((value) => ({ label: value, value }))} onChange={(event) => setForm({ ...form, role_required: event.target.value as BookingRequestInput["role_required"] })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Date" type="date" value={form.request_date} onChange={(event) => setForm({ ...form, request_date: event.target.value })} />
        <Input label="Start time" type="time" value={form.start_time ?? ""} onChange={(event) => setForm({ ...form, start_time: event.target.value })} />
        <Input label="End time" type="time" value={form.end_time ?? ""} onChange={(event) => setForm({ ...form, end_time: event.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Subject" value={form.subject ?? ""} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
        <Input label="Year group" value={form.year_group ?? ""} onChange={(event) => setForm({ ...form, year_group: event.target.value })} />
        <Select label="Urgency" value={form.urgency} options={urgencies.map((value) => ({ label: value, value }))} onChange={(event) => setForm({ ...form, urgency: event.target.value as BookingRequestInput["urgency"] })} />
      </div>
      <Textarea label="Notes" value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      <div className="flex justify-end gap-3"><Button variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving || !form.school_name}>{saving ? "Saving..." : "Create request"}</Button></div>
    </form>
  );
}
