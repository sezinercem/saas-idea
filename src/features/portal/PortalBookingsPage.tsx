import { CalendarDays, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../hooks/useToast";
import { formatDate } from "../../lib/format";
import { cancelBooking, listPortalBookings, subscribePortalUpdates } from "../../lib/portal";
import { statusTone } from "../../lib/status";
import type { ShiftBooking } from "../../types/portal";

export function PortalBookingsPage() {
  const { notify } = useToast();
  const [bookings, setBookings] = useState<ShiftBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      setBookings(await listPortalBookings());
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => load());
    return subscribePortalUpdates(() => load());
  }, [load]);

  const cancel = async (booking: ShiftBooking) => {
    try {
      await cancelBooking(booking.id);
      notify("Booking cancelled. Your agency has been notified.", "success");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to cancel booking.", "error");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">My Bookings</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">Upcoming supply shift bookings and agency approvals.</p>
      <div className="mt-6 space-y-4">
        {isLoading ? <Skeleton className="h-36 w-full" /> : bookings.length ? bookings.map((booking) => (
          <Card key={booking.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-1 size-5 text-brand-600" />
              <div>
                <p className="font-semibold">{booking.shifts?.shift_title || "School shift booking"}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {booking.shifts ? `${booking.shifts.school_name} · ${formatDate(booking.shifts.shift_date)}` : `Requested ${formatDate(booking.booked_at)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={statusTone(booking.booking_status)}>{booking.booking_status}</Badge>
              {!["Cancelled", "Rejected", "Completed"].includes(booking.booking_status) ? (
                <Button variant="outline" className="h-10 px-3" onClick={() => cancel(booking)}><XCircle className="size-4" />Cancel</Button>
              ) : null}
            </div>
          </Card>
        )) : <EmptyState icon={CalendarDays} title="No bookings yet" body="Once cleared, book published school shifts from Available Shifts." />}
      </div>
    </div>
  );
}
