import { ArrowLeft, Mail, Phone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { ButtonLink } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../hooks/useToast";
import { fullName, formatDate } from "../../lib/format";
import { getCandidate } from "../../lib/recruitment";
import { statusTone } from "../../lib/status";
import type { Candidate } from "../../types/recruitment";

export function CandidateDetailPage() {
  const { id } = useParams();
  const { notify } = useToast();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const candidateId = id;

    async function loadCandidate() {
      setIsLoading(true);
      try {
        setCandidate(await getCandidate(candidateId));
      } catch (error) {
        notify(error instanceof Error ? error.message : "Unable to load candidate.", "error");
      } finally {
        setIsLoading(false);
      }
    }

    queueMicrotask(() => {
      loadCandidate();
    });
  }, [id, notify]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="mx-auto max-w-4xl">
        <ButtonLink to="/candidates" variant="outline">
          <ArrowLeft className="size-4" />
          Back to candidates
        </ButtonLink>
        <Card className="mt-6">Candidate not found.</Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <ButtonLink to="/candidates" variant="outline">
        <ArrowLeft className="size-4" />
        Back to candidates
      </ButtonLink>

      <Card className="mt-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-14 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100">
              <UserRound className="size-7" />
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{fullName(candidate.first_name, candidate.last_name)}</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Created {formatDate(candidate.created_at)}</p>
            </div>
          </div>
          <Badge tone={statusTone(candidate.status)}>{candidate.status || "New"}</Badge>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="size-4 text-slate-400" />
              Email
            </div>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{candidate.email || "No email saved"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Phone className="size-4 text-slate-400" />
              Phone
            </div>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{candidate.phone || "No phone saved"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="font-semibold">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
            {candidate.notes || "No notes yet."}
          </p>
        </div>
      </Card>
    </div>
  );
}
