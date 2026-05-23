import { BriefcaseBusiness, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../hooks/useToast";
import { formatDate } from "../../lib/format";
import { listPortalApplications, withdrawApplication } from "../../lib/portal";
import { statusTone } from "../../lib/status";
import type { JobApplication } from "../../types/portal";

export function PortalApplicationsPage() {
  const { notify } = useToast();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      setApplications(await listPortalApplications());
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => { queueMicrotask(() => load()); }, [load]);

  const withdraw = async (application: JobApplication) => {
    try {
      await withdrawApplication(application.id);
      notify("Application withdrawn.", "success");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to withdraw application.", "error");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">My Applications</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">Track job applications submitted through your education agency.</p>
      <div className="mt-6 space-y-4">
        {isLoading ? <Skeleton className="h-36 w-full" /> : applications.length ? applications.map((application) => (
          <Card key={application.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <BriefcaseBusiness className="mt-1 size-5 text-brand-600" />
              <div>
                <p className="font-semibold">{application.jobs?.job_title || "School role application"}</p>
                <p className="mt-1 text-sm text-slate-500">{application.jobs?.school_name || application.jobs?.company_name || "Your agency"} · Submitted {formatDate(application.applied_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={statusTone(application.status)}>{application.status}</Badge>
              {!["Withdrawn", "Rejected"].includes(application.status) ? (
                <Button variant="outline" className="h-10 px-3" onClick={() => withdraw(application)}><XCircle className="size-4" />Withdraw</Button>
              ) : null}
            </div>
          </Card>
        )) : <EmptyState icon={BriefcaseBusiness} title="No applications yet" body="When cleared, apply for published school roles from Available Jobs." />}
      </div>
    </div>
  );
}
