import { BriefcaseBusiness, CheckSquare, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Select } from "../../components/forms/Select";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../hooks/useToast";
import { formatDate, fullName } from "../../lib/format";
import { bulkUpdateApplications, listAgencyApplicationsDetailed, updateApplicationStatus } from "../../lib/portal";
import { statusTone } from "../../lib/status";
import type { JobApplication } from "../../types/portal";

const statuses: JobApplication["status"][] = ["Applied", "Under Review", "Interview Requested", "Offered", "Rejected"];

export function ApplicationsPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listAgencyApplicationsDetailed>>>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setRows(await listAgencyApplicationsDetailed());
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load applications.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  const filteredRows = useMemo(() => {
    const term = search.toLowerCase();
    return rows.filter((row) => {
      const candidate = row.candidates ? fullName(row.candidates.first_name, row.candidates.last_name).toLowerCase() : "";
      const job = (row.jobs?.job_title ?? row.jobs?.school_name ?? "").toLowerCase();
      return !term || candidate.includes(term) || job.includes(term);
    });
  }, [rows, search]);

  const setStatus = async (id: string, status: JobApplication["status"]) => {
    await updateApplicationStatus(id, status);
    await load();
    notify("Application updated.", "success");
  };

  const bulkSetStatus = async (status: JobApplication["status"]) => {
    await bulkUpdateApplications(selected, status);
    setSelected([]);
    await load();
    notify("Selected applications updated.", "success");
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Recruitment operations</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Applications</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Review candidate applications for school roles and move them through the shortlist workflow.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
          <Input label="Search applications" className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      <Card className="mt-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">{selected.length} selected</p>
          <div className="flex flex-wrap gap-2">
            {statuses.slice(1, 4).map((status) => (
              <Button key={status} variant="outline" className="h-9 px-3" disabled={!selected.length} onClick={() => bulkSetStatus(status)}>
                {status}
              </Button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : filteredRows.length ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="hidden grid-cols-[44px_1.1fr_1.2fr_130px_150px_170px] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 lg:grid dark:bg-slate-950 dark:text-slate-400">
              <span />
              <span>Candidate</span>
              <span>Job</span>
              <span>Applied</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRows.map((row) => (
                <div key={row.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[44px_1.1fr_1.2fr_130px_150px_170px] lg:items-center">
                  <button
                    type="button"
                    aria-label="Select application"
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800"
                    onClick={() => setSelected((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])}
                  >
                    {selected.includes(row.id) ? <CheckSquare className="size-4" /> : null}
                  </button>
                  <Link className="font-semibold hover:text-brand-600" to={`/candidates/${row.candidate_id}`}>
                    {row.candidates ? fullName(row.candidates.first_name, row.candidates.last_name) : "Candidate"}
                  </Link>
                  <Link className="text-sm text-slate-600 hover:text-brand-600 dark:text-slate-300" to={`/jobs/${row.job_id}`}>
                    {row.jobs?.job_title || row.jobs?.school_name || "School role"}
                  </Link>
                  <span className="text-sm text-slate-500">{formatDate(row.applied_at)}</span>
                  <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                  <Select label="Move to" value={row.status} options={statuses.map((status) => ({ label: status, value: status }))} onChange={(event) => setStatus(row.id, event.target.value as JobApplication["status"])} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState icon={BriefcaseBusiness} title="No applications yet" body="Candidate portal job applications will appear here for recruiter review." />
        )}
      </Card>
    </div>
  );
}
