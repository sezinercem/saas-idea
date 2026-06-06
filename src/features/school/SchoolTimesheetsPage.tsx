import { CalendarCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Textarea } from "../../components/forms/Textarea";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { useSchoolPortal } from "../../hooks/useSchoolPortal";
import { useToast } from "../../hooks/useToast";
import { formatDate, fullName } from "../../lib/format";
import { listSchoolTimesheets, reviewSchoolTimesheet } from "../../lib/schoolPortal";
import { statusTone } from "../../lib/status";
import type { Timesheet, TimesheetApprovalHistory } from "../../types/operations";

export function SchoolTimesheetsPage() {
  const { session } = useSchoolPortal();
  const { notify } = useToast();
  const [rows, setRows] = useState<Timesheet[]>([]);
  const [review, setReview] = useState<{ timesheet: Timesheet; action: TimesheetApprovalHistory["action"] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      setRows(await listSchoolTimesheets(session));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load timesheets.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify, session]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  const submitReview = async (notes: string) => {
    if (!session || !review) return;
    await reviewSchoolTimesheet(session, review.timesheet, review.action, notes);
    notify(`Timesheet ${review.action.toLowerCase()}.`, "success");
    setReview(null);
    await load();
  };

  return (
    <div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Timesheets</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Approve timesheets</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">Review submitted hours and send approval decisions to your agency.</p>
      </div>
      <Card className="mt-8">
        {isLoading ? <Skeleton className="h-64 w-full" /> : rows.length ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((timesheet) => (
              <div key={timesheet.id} className="grid gap-3 py-4 lg:grid-cols-[1.2fr_1fr_120px_240px] lg:items-center">
                <div><p className="font-semibold">{timesheet.candidates ? fullName(timesheet.candidates.first_name, timesheet.candidates.last_name) : "Candidate"}</p><p className="text-sm text-slate-500">{formatDate(timesheet.work_date)} · {timesheet.start_time} to {timesheet.end_time}</p></div>
                <span className="text-sm text-slate-500">{timesheet.notes || "No notes"}</span>
                <Badge tone={statusTone(timesheet.status)}>{timesheet.status}</Badge>
                {timesheet.status === "Submitted" ? <div className="flex flex-wrap gap-2"><Button className="h-9 px-3" onClick={() => setReview({ timesheet, action: "Approved" })}>Approve</Button><Button variant="outline" className="h-9 px-3" onClick={() => setReview({ timesheet, action: "Rejected" })}>Reject</Button><Button variant="outline" className="h-9 px-3" onClick={() => setReview({ timesheet, action: "Changes Requested" })}>Request changes</Button></div> : null}
              </div>
            ))}
          </div>
        ) : <EmptyState icon={CalendarCheck} title="No timesheets" body="Submitted timesheets from your agency will appear here." />}
      </Card>
      <ReviewModal review={review} onClose={() => setReview(null)} onSubmit={submitReview} />
    </div>
  );
}

function ReviewModal({ onClose, onSubmit, review }: { onClose: () => void; onSubmit: (notes: string) => Promise<void>; review: { timesheet: Timesheet; action: TimesheetApprovalHistory["action"] } | null }) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Modal isOpen={Boolean(review)} onClose={onClose} title={`${review?.action ?? "Review"} timesheet`}>
      <div className="space-y-4">
        <Textarea label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={async () => { setSaving(true); try { await onSubmit(notes); setNotes(""); } finally { setSaving(false); } }} disabled={saving}>{saving ? "Saving..." : "Submit decision"}</Button></div>
      </div>
    </Modal>
  );
}
