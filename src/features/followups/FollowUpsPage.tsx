import { CalendarClock, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../hooks/useToast";
import { formatDate, fullName } from "../../lib/format";
import { listCandidates } from "../../lib/recruitment";
import { statusTone } from "../../lib/status";
import type { Candidate } from "../../types/recruitment";

type FollowUpStatus = "Due Today" | "Upcoming" | "Overdue" | "Completed";

export function FollowUpsPage() {
  const { notify } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setCandidates((await listCandidates()).filter((candidate) => candidate.next_follow_up_date || candidate.follow_up_reason));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load follow-ups.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  const rows = useMemo(() => {
    const term = search.toLowerCase();
    return candidates
      .filter((candidate) => {
        const name = fullName(candidate.first_name, candidate.last_name).toLowerCase();
        return !term || name.includes(term) || (candidate.follow_up_reason ?? "").toLowerCase().includes(term);
      })
      .sort((a, b) => (a.next_follow_up_date ?? "9999").localeCompare(b.next_follow_up_date ?? "9999"));
  }, [candidates, search]);

  const counts = rows.reduce<Record<FollowUpStatus, number>>(
    (acc, candidate) => {
      acc[followUpStatus(candidate)] += 1;
      return acc;
    },
    { "Due Today": 0, Upcoming: 0, Overdue: 0, Completed: 0 },
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Recruitment workflow</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Follow-ups</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Keep candidate contact, document chasing, and recruiter next actions moving.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
          <Input label="Search follow-ups" className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {(Object.keys(counts) as FollowUpStatus[]).map((status) => (
          <Card key={status} className="p-5">
            <Badge tone={statusTone(status)}>{status}</Badge>
            <p className="mt-4 text-3xl font-bold">{isLoading ? "..." : counts[status]}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : rows.length ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="hidden grid-cols-[1.2fr_1.2fr_130px_150px_130px] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 md:grid dark:bg-slate-950 dark:text-slate-400">
              <span>Candidate</span>
              <span>Reason</span>
              <span>Due date</span>
              <span>Assigned recruiter</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {rows.map((candidate) => {
                const status = followUpStatus(candidate);
                return (
                  <Link key={candidate.id} to={`/candidates/${candidate.id}`} className="grid gap-2 px-4 py-4 transition hover:bg-slate-50 md:grid-cols-[1.2fr_1.2fr_130px_150px_130px] md:gap-4 dark:hover:bg-slate-800/50">
                    <span className="font-semibold">{fullName(candidate.first_name, candidate.last_name)}</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{candidate.follow_up_reason || "Candidate follow-up"}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(candidate.next_follow_up_date)}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Recruiter</span>
                    <Badge tone={statusTone(status)}>{status}</Badge>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState icon={CalendarClock} title="No follow-ups scheduled" body="Add a follow-up date and reason on a candidate profile to build your queue." />
        )}
      </Card>
    </div>
  );
}

function followUpStatus(candidate: Candidate): FollowUpStatus {
  if (!candidate.next_follow_up_date) return "Completed";
  const today = new Date().toISOString().slice(0, 10);
  if (candidate.next_follow_up_date < today) return "Overdue";
  if (candidate.next_follow_up_date === today) return "Due Today";
  return "Upcoming";
}
