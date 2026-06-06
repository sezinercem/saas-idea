import { KanbanSquare } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../hooks/useToast";
import { formatDate } from "../../lib/format";
import { listBookingRequests, updateBookingRequest } from "../../lib/operations";
import { statusTone } from "../../lib/status";
import type { BookingRequest, BookingWorkflowStage } from "../../types/operations";

const stages: BookingWorkflowStage[] = ["New Requests", "Candidate Matching", "Candidate Confirmed", "School Confirmed", "Completed"];

export function BookingsPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setRows(await listBookingRequests());
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load bookings.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  const metrics = useMemo(() => {
    const active = rows.filter((row) => row.status !== "Cancelled");
    return {
      fillRate: active.length ? Math.round((active.filter((row) => row.status === "Filled").length / active.length) * 100) : 0,
      urgent: rows.filter((row) => row.urgency === "Urgent" && row.status === "Open").length,
      unfilled: rows.filter((row) => row.status === "Open" || row.status === "Partially Filled").length,
    };
  }, [rows]);

  const move = async (request: BookingRequest, stage: BookingWorkflowStage) => {
    await updateBookingRequest(request.id, {
      workflow_stage: stage,
      status: stage === "Completed" ? "Filled" : request.status,
    });
    await load();
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Fulfilment</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Booking fulfilment board</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">Move school requests from new demand through candidate and school confirmation.</p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Metric label="Fill rate" value={`${metrics.fillRate}%`} />
        <Metric label="Urgent bookings" value={metrics.urgent} />
        <Metric label="Unfilled bookings" value={metrics.unfilled} />
      </section>

      {isLoading ? <Skeleton className="mt-8 h-80 w-full" /> : rows.length ? (
        <section className="mt-8 grid gap-4 xl:grid-cols-5">
          {stages.map((stage, index) => (
            <Card key={stage} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">{stage}</h2>
                <Badge>{rows.filter((row) => row.workflow_stage === stage).length}</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {rows.filter((row) => row.workflow_stage === stage).map((request) => (
                  <div key={request.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{request.school_name}</p>
                      <Badge tone={statusTone(request.urgency)}>{request.urgency}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{request.role_required} · {formatDate(request.request_date)}</p>
                    <p className="mt-1 text-xs text-slate-500">{request.vacancies} vacancies</p>
                    {index < stages.length - 1 ? (
                      <Button className="mt-3 h-8 px-3 text-xs" onClick={() => move(request, stages[index + 1])}>Move next</Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </section>
      ) : <Card className="mt-8"><EmptyState icon={KanbanSquare} title="No bookings to fulfil" body="Create booking requests to start the fulfilment board." /></Card>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <Card className="p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></Card>;
}
