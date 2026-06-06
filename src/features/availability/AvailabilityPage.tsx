import { CalendarDays, Plus, Trash2 } from "lucide-react";
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
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { formatDate, fullName } from "../../lib/format";
import { createAvailability, deleteAvailability, isAvailableOn, listAvailability } from "../../lib/operations";
import { listCandidates } from "../../lib/recruitment";
import { statusTone } from "../../lib/status";
import type { AvailabilityInput, CandidateAvailability } from "../../types/operations";
import type { Candidate } from "../../types/recruitment";

const statuses = ["Available", "Unavailable", "Holiday", "Sick"];
const dayParts = ["Full Day", "AM Only", "PM Only"];

export function AvailabilityPage() {
  const { agency } = useAgency();
  const { user } = useAuth();
  const { notify } = useToast();
  const [rows, setRows] = useState<CandidateAvailability[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [availabilityRows, candidateRows] = await Promise.all([listAvailability(), listCandidates()]);
      setRows(availabilityRows);
      setCandidates(candidateRows);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load availability.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  const { today, tomorrow } = useMemo(() => {
    const todayDate = new Date();
    const tomorrowDate = new Date();
    tomorrowDate.setDate(todayDate.getDate() + 1);
    return {
      today: todayDate.toISOString().slice(0, 10),
      tomorrow: tomorrowDate.toISOString().slice(0, 10),
    };
  }, []);
  const availableToday = rows.filter((row) => isAvailableOn(row, today));
  const availableTomorrow = rows.filter((row) => isAvailableOn(row, tomorrow));
  const byRole = groupCount(availableToday, (row) => row.role_preference || "Unspecified role");
  const byLocation = groupCount(availableToday, (row) => row.location_preference || "Unspecified location");

  const save = async (input: AvailabilityInput) => {
    if (!agency) return;
    await createAvailability(agency.id, user?.id, input);
    notify("Availability saved.", "success");
    setIsOpen(false);
    await load();
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Supply Operations</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Candidate availability</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Track who can work today, tomorrow, by role, and by location.</p>
        </div>
        <Button onClick={() => setIsOpen(true)}><Plus className="size-4" />Add availability</Button>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <Metric label="Available today" value={availableToday.length} />
        <Metric label="Available tomorrow" value={availableTomorrow.length} />
        <Metric label="Roles covered" value={Object.keys(byRole).length} />
        <Metric label="Locations covered" value={Object.keys(byLocation).length} />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <h2 className="text-lg font-semibold">Availability board</h2>
          {isLoading ? <Skeleton className="mt-5 h-56 w-full" /> : rows.length ? (
            <div className="mt-5 divide-y divide-slate-200 dark:divide-slate-800">
              {rows.map((row) => (
                <div key={row.id} className="grid gap-3 py-4 lg:grid-cols-[1.2fr_110px_110px_1fr_80px] lg:items-center">
                  <div>
                    <p className="font-semibold">{row.candidates ? fullName(row.candidates.first_name, row.candidates.last_name) : "Candidate"}</p>
                    <p className="text-sm text-slate-500">{formatDate(row.start_date)} to {formatDate(row.end_date)} · {row.day_part}</p>
                  </div>
                  <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                  <span className="text-sm text-slate-500">{row.role_preference || "Any role"}</span>
                  <span className="text-sm text-slate-500">{row.location_preference || "Any location"}</span>
                  <Button variant="outline" className="h-9 px-3" onClick={async () => { await deleteAvailability(row.id); await load(); }}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={CalendarDays} title="No availability yet" body="Add availability to power daily supply matching." />}
        </Card>
        <Card className="xl:col-span-4">
          <h2 className="text-lg font-semibold">Today by role</h2>
          <MiniList rows={byRole} />
          <h2 className="mt-8 text-lg font-semibold">Today by location</h2>
          <MiniList rows={byLocation} />
        </Card>
      </section>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add candidate availability" size="lg">
        <AvailabilityForm candidates={candidates} onCancel={() => setIsOpen(false)} onSubmit={save} />
      </Modal>
    </div>
  );
}

function AvailabilityForm({ candidates, onCancel, onSubmit }: { candidates: Candidate[]; onCancel: () => void; onSubmit: (input: AvailabilityInput) => Promise<void> }) {
  const [form, setForm] = useState<AvailabilityInput>({
    candidate_id: candidates[0]?.id ?? "",
    status: "Available",
    day_part: "Full Day",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    role_preference: "",
    location_preference: "",
    notes: "",
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
      <Select label="Candidate" options={candidateOptions} value={form.candidate_id} onChange={(event) => setForm({ ...form, candidate_id: event.target.value })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Status" options={statuses.map((value) => ({ label: value, value }))} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AvailabilityInput["status"] })} />
        <Select label="Day part" options={dayParts.map((value) => ({ label: value, value }))} value={form.day_part} onChange={(event) => setForm({ ...form, day_part: event.target.value as AvailabilityInput["day_part"] })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Start date" type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
        <Input label="End date" type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Role suitability" value={form.role_preference ?? ""} onChange={(event) => setForm({ ...form, role_preference: event.target.value })} placeholder="Teacher, SEN, Cover" />
        <Input label="Location" value={form.location_preference ?? ""} onChange={(event) => setForm({ ...form, location_preference: event.target.value })} placeholder="London, Croydon" />
      </div>
      <div className="flex justify-end gap-3"><Button variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving || !form.candidate_id}>{saving ? "Saving..." : "Save availability"}</Button></div>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card className="p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></Card>;
}

function MiniList({ rows }: { rows: Record<string, number> }) {
  const entries = Object.entries(rows);
  return entries.length ? <div className="mt-4 space-y-2">{entries.map(([label, count]) => <div key={label} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950"><span>{label}</span><strong>{count}</strong></div>)}</div> : <p className="mt-3 text-sm text-slate-500">No availability yet.</p>;
}

function groupCount<T>(rows: T[], getKey: (row: T) => string) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = getKey(row);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}
