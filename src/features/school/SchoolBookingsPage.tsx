import { CalendarCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { useSchoolPortal } from "../../hooks/useSchoolPortal";
import { useToast } from "../../hooks/useToast";
import { formatDate } from "../../lib/format";
import { listSchoolBookingRequests } from "../../lib/schoolPortal";
import { statusTone } from "../../lib/status";
import type { BookingRequest } from "../../types/operations";

const stages = ["Requested", "Matching", "Candidate Confirmed", "Filled", "Completed"];

function displayStage(request: BookingRequest) {
  if (request.workflow_stage === "New Requests") return "Requested";
  if (request.workflow_stage === "Candidate Matching") return "Matching";
  if (request.workflow_stage === "Candidate Confirmed") return "Candidate Confirmed";
  if (request.status === "Filled" || request.workflow_stage === "School Confirmed") return "Filled";
  if (request.workflow_stage === "Completed") return "Completed";
  return request.workflow_stage;
}

export function SchoolBookingsPage() {
  const { session } = useSchoolPortal();
  const { notify } = useToast();
  const [rows, setRows] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      setRows(await listSchoolBookingRequests(session));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load booking tracking.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify, session]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  return (
    <div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Live Tracking</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Bookings</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">Track agency progress from request to completed cover.</p>
      </div>
      <Card className="mt-8">
        {isLoading ? <Skeleton className="h-72 w-full" /> : rows.length ? (
          <div className="space-y-4">
            {rows.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-semibold">{request.role_required}</p><p className="text-sm text-slate-500">{formatDate(request.request_date)} · {request.subject || "Any subject"}</p></div>
                  <Badge tone={statusTone(request.status)}>{request.status}</Badge>
                </div>
                <div className="mt-5 grid gap-2 md:grid-cols-5">
                  {stages.map((stage) => {
                    const active = stages.indexOf(stage) <= stages.indexOf(displayStage(request));
                    return <div key={stage} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${active ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100" : "border-slate-200 text-slate-500 dark:border-slate-800"}`}>{stage}</div>;
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={CalendarCheck} title="No bookings yet" body="Booking progress will appear once requests are submitted." />}
      </Card>
    </div>
  );
}
