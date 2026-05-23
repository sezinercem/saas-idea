import { CalendarDays, Plus } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
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
import { formatDate } from "../../lib/format";
import { createShift, listAgencyBookingRequests, listAgencyShifts, subscribePortalUpdates, updateBookingStatus, updateShift } from "../../lib/portal";
import { statusTone } from "../../lib/status";
import type { Shift, ShiftBooking, ShiftInput } from "../../types/portal";

const emptyShift: ShiftInput = {
  job_id: null,
  shift_title: "",
  school_name: "",
  shift_date: "",
  start_time: "08:30",
  end_time: "15:30",
  vacancies: 1,
  booking_type: "Approval Required",
  status: "Open",
  published: true,
};

export function ShiftsPage() {
  const { agency } = useAgency();
  const { notify } = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [bookings, setBookings] = useState<ShiftBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [shiftRows, bookingRows] = await Promise.all([listAgencyShifts(), listAgencyBookingRequests()]);
      setShifts(shiftRows);
      setBookings(bookingRows);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load shifts.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify]);
  useEffect(() => {
    queueMicrotask(() => load());
    return subscribePortalUpdates(() => load());
  }, [load]);

  const save = async (input: ShiftInput) => {
    if (!agency) return;
    await createShift(agency.id, input);
    notify("Shift published to eligible candidates.", "success");
    setIsOpen(false);
    await load();
  };

  const close = async (shift: Shift) => {
    await updateShift(shift.id, { status: "Closed", published: false });
    notify("Shift closed.", "success");
    await load();
  };

  const decide = async (booking: ShiftBooking, status: "Approved" | "Rejected") => {
    await updateBookingStatus(booking.id, status);
    notify(`Booking ${status.toLowerCase()}.`, "success");
    await load();
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-brand-600 dark:text-brand-100">Daily supply</p>
          <h1 className="mt-2 text-3xl font-bold">Shifts and booking requests</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Publish school shifts only to cleared candidates in your agency portal.</p>
        </div>
        <Button onClick={() => setIsOpen(true)}><Plus className="size-4" />Create shift</Button>
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <h2 className="text-lg font-semibold">Published shifts</h2>
          {isLoading ? <Skeleton className="mt-5 h-40 w-full" /> : shifts.length ? (
            <div className="mt-5 space-y-3">
              {shifts.map((shift) => (
                <div key={shift.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-semibold">{shift.shift_title}</p><p className="mt-1 text-sm text-slate-500">{shift.school_name} · {formatDate(shift.shift_date)} · {shift.vacancies} spaces</p></div>
                    <Badge tone={statusTone(shift.status)}>{shift.status}</Badge>
                  </div>
                  {shift.status === "Open" ? <Button variant="outline" className="mt-4 h-9 px-3" onClick={() => close(shift)}>Close shift</Button> : null}
                </div>
              ))}
            </div>
          ) : <EmptyState icon={CalendarDays} title="No shifts published" body="Create the first day supply opportunity for cleared candidates." />}
        </Card>
        <Card className="xl:col-span-5">
          <h2 className="text-lg font-semibold">Booking requests</h2>
          {isLoading ? <Skeleton className="mt-5 h-40 w-full" /> : bookings.length ? (
            <div className="mt-5 space-y-3">
              {bookings.map((booking) => (
                <div key={booking.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex justify-between gap-3"><p className="text-sm font-semibold">Candidate booking</p><Badge tone={statusTone(booking.booking_status)}>{booking.booking_status}</Badge></div>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(booking.booked_at)}</p>
                  {booking.booking_status === "Pending" ? <div className="mt-3 flex gap-2"><Button className="h-9 px-3" onClick={() => decide(booking, "Approved")}>Approve</Button><Button variant="outline" className="h-9 px-3" onClick={() => decide(booking, "Rejected")}>Reject</Button></div> : null}
                </div>
              ))}
            </div>
          ) : <EmptyState icon={CalendarDays} title="No booking requests" body="Candidate shift requests will appear here in real time." />}
        </Card>
      </div>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Publish school shift" size="lg">
        <ShiftForm onCancel={() => setIsOpen(false)} onSubmit={save} />
      </Modal>
    </div>
  );
}

function ShiftForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (input: ShiftInput) => Promise<void> }) {
  const [form, setForm] = useState<ShiftInput>(emptyShift);
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.shift_title || !form.school_name || !form.shift_date) return;
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Shift title" value={form.shift_title} onChange={(event) => setForm({ ...form, shift_title: event.target.value })} />
        <Input label="School name" value={form.school_name} onChange={(event) => setForm({ ...form, school_name: event.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Date" type="date" value={form.shift_date} onChange={(event) => setForm({ ...form, shift_date: event.target.value })} />
        <Input label="Start" type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} />
        <Input label="End" type="time" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Vacancies" type="number" min={1} value={form.vacancies} onChange={(event) => setForm({ ...form, vacancies: Number(event.target.value) })} />
        <Select label="Booking type" value={form.booking_type} options={["Instant", "Approval Required"].map((value) => ({ label: value, value }))} onChange={(event) => setForm({ ...form, booking_type: event.target.value as ShiftInput["booking_type"] })} />
      </div>
      <div className="flex justify-end gap-3"><Button variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Publishing..." : "Publish shift"}</Button></div>
    </form>
  );
}
