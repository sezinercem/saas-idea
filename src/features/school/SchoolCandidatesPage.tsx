import { ShieldCheck, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../hooks/useToast";
import { fullName } from "../../lib/format";
import { listSchoolCandidateProfiles } from "../../lib/schoolPortal";
import { statusTone } from "../../lib/status";
import type { SchoolCandidateProfile } from "../../types/operations";

export function SchoolCandidatesPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState<SchoolCandidateProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setRows(await listSchoolCandidateProfiles());
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load candidate profiles.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  return (
    <div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Assigned Staff</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Candidate profiles</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">View safe profile summaries for candidates assigned to your school bookings.</p>
      </div>
      <Card className="mt-8">
        {isLoading ? <Skeleton className="h-56 w-full" /> : rows.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((candidate) => (
              <div key={candidate.candidate_id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold">{fullName(candidate.first_name, candidate.last_name)}</p><p className="mt-1 text-sm text-slate-500">{candidate.role}</p></div>
                  <Badge tone={statusTone(candidate.compliance_cleared ? "Cleared" : "Pending")}>{candidate.compliance_cleared ? "Compliance cleared" : "Pending"}</Badge>
                </div>
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{candidate.experience_summary}</p>
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="size-4" />{candidate.availability}</p>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={UsersRound} title="No candidate profiles yet" body="Confirmed candidates assigned to your bookings will appear here." />}
      </Card>
    </div>
  );
}
