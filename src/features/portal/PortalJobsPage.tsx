import { BriefcaseBusiness, MapPin } from "lucide-react";
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
import { applyToJob, listPortalJobs } from "../../lib/portal";
import type { OverallClearanceStatus } from "../../types/agency";
import type { Job } from "../../types/recruitment";

export function PortalJobsPage() {
  const { session } = usePortal();
  const { notify } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clearance, setClearance] = useState<OverallClearanceStatus>("Non-Compliant");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    const [available, state] = await Promise.all([listPortalJobs(), getCandidateClearance(session.agency.id, session.candidate.id)]);
    setJobs(available);
    setClearance(state.overallStatus);
    setIsLoading(false);
  }, [session]);
  useEffect(() => { queueMicrotask(() => load()); }, [load]);

  const apply = async (job: Job) => {
    if (!session) return;
    try {
      await applyToJob(session, job.id);
      notify("Application submitted to your agency.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to apply.", "error");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Available Jobs</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">Published roles from {session?.agency.name}. No other agency opportunities are visible here.</p>
      {clearance !== "Cleared" ? <Alert className="mt-6" tone="error">Complete your compliance before applying for opportunities.</Alert> : null}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {isLoading ? <Skeleton className="h-56 w-full" /> : jobs.length ? jobs.map((job) => (
          <Card key={job.id}>
            <div className="flex items-start justify-between gap-3">
              <BriefcaseBusiness className="size-5 text-brand-600" />
              <Badge tone="blue">{job.job_type}</Badge>
            </div>
            <h2 className="mt-4 text-lg font-semibold">{job.job_title}</h2>
            <p className="mt-1 text-sm font-medium">{job.school_name || job.company_name}</p>
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><MapPin className="size-4" />{job.location || "Location confirmed by agency"}</p>
            <p className="mt-2 text-sm text-slate-500">{job.subject || "Education role"} · {job.daily_rate || job.pay_rate || "Rate on request"}</p>
            <Button className="mt-5 w-full" disabled={clearance !== "Cleared"} onClick={() => apply(job)}>Apply for role</Button>
          </Card>
        )) : <EmptyState icon={BriefcaseBusiness} title="No jobs available" body="Published school roles from your agency will appear here." />}
      </div>
    </div>
  );
}
