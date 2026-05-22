import { ArrowLeft, BriefcaseBusiness, MapPin, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { ButtonLink } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../hooks/useToast";
import { formatDate } from "../../lib/format";
import { getJob } from "../../lib/recruitment";
import { statusTone } from "../../lib/status";
import type { Job } from "../../types/recruitment";

export function JobDetailPage() {
  const { id } = useParams();
  const { notify } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const jobId = id;

    async function loadJob() {
      setIsLoading(true);
      try {
        setJob(await getJob(jobId));
      } catch (error) {
        notify(error instanceof Error ? error.message : "Unable to load job.", "error");
      } finally {
        setIsLoading(false);
      }
    }

    queueMicrotask(() => {
      loadJob();
    });
  }, [id, notify]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-4xl">
        <ButtonLink to="/jobs" variant="outline">
          <ArrowLeft className="size-4" />
          Back to jobs
        </ButtonLink>
        <Card className="mt-6">Job not found.</Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <ButtonLink to="/jobs" variant="outline">
        <ArrowLeft className="size-4" />
        Back to jobs
      </ButtonLink>

      <Card className="mt-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-14 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100">
              <BriefcaseBusiness className="size-7" />
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{job.job_title || "Untitled role"}</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {job.company_name || "No company"} · Created {formatDate(job.created_at)}
              </p>
            </div>
          </div>
          <Badge tone={statusTone(job.status)}>{job.status || "Active"}</Badge>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="size-4 text-slate-400" />
              Location
            </div>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{job.location || "No location saved"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <WalletCards className="size-4 text-slate-400" />
              Pay rate
            </div>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{job.pay_rate || "No pay rate saved"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="font-semibold">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
            {job.notes || "No notes yet."}
          </p>
        </div>
      </Card>
    </div>
  );
}
