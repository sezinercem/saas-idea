import { CalendarDays, Clock3 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { usePortal } from "../../hooks/usePortal";
import { useToast } from "../../hooks/useToast";
import { getCandidateClearance } from "../../lib/compliance";
import { formatDate } from "../../lib/format";
import { bookShift, listPortalShifts } from "../../lib/portal";
import type { OverallClearanceStatus } from "../../types/agency";
import type { Shift } from "../../types/portal";

export function PortalShiftsPage() {
  const { session } = usePortal();
  const { notify } = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [clearance, setClearance] = useState<OverallClearanceStatus>("Non-Compliant");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    const [available, state] = await Promise.all([listPortalShifts(), getCandidateClearance(session.agency.id, session.candidate.id)]);
    setShifts(available);
    setClearance(state.overallStatus);
    setIsLoading(false);
  }, [session]);
  useEffect(() => { queueMicrotask(() => load()); }, [load]);

  const book = async (shift: Shift) => {
    if (!session) return;
    try {
      await bookShift(session, shift);
      notify(shift.booking_type === "Instant" ? "Shift booked." : "Booking request sent for approval.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to book shift.", "error");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Available Shifts</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">Day supply and short-term school opportunities offered by your agency.</p>
      {clearance !== "Cleared" ? <Alert className="mt-6" tone="error">Complete your compliance before applying for opportunities.</Alert> : null}
      <div className="mt-6 space-y-4">
        {isLoading ? <Skeleton className="h-32 w-full" /> : shifts.length ? shifts.map((shift) => (
          <Card key={shift.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><CalendarDays className="size-5 text-brand-600" /><h2 className="font-semibold">{shift.shift_title}</h2></div>
              <p className="mt-2 text-sm">{shift.school_name} · {formatDate(shift.shift_date)}</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Clock3 className="size-4" />{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)} · {shift.vacancies} spaces</p>
            </div>
            <div className="flex flex-col gap-2">
              <Badge tone={shift.booking_type === "Instant" ? "green" : "amber"}>{shift.booking_type}</Badge>
              <Button disabled={clearance !== "Cleared"} onClick={() => book(shift)}>Book shift</Button>
            </div>
          </Card>
        )) : <EmptyState icon={CalendarDays} title="No shifts available" body="Your agency will publish supply shifts here when available." />}
      </div>
    </div>
  );
}
