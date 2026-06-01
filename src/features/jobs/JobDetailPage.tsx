import { ArrowLeft, BriefcaseBusiness, Building2, CalendarDays, MapPin, WalletCards } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Select } from "../../components/forms/Select";
import { NotesPanel } from "../notes/NotesPanel";
import { Badge } from "../../components/ui/Badge";
import { ButtonLink } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import { useAgency } from "../../hooks/useAgency";
import { getCandidateClearance } from "../../lib/compliance";
import { formatDate, fullName } from "../../lib/format";
import { getJob, listCandidates, listJobPlacements, updateJobStatus } from "../../lib/recruitment";
import { listAgencyApplicationsDetailed } from "../../lib/portal";
import { statusTone } from "../../lib/status";
import { jobStatuses, statusOptions } from "../../lib/workflow";
import type { Job, JobStatus, Candidate, PlacementWithRelations } from "../../types/recruitment";
import type { JobApplication } from "../../types/portal";

export function JobDetailPage() {
  const { id } = useParams();
  const { notify } = useToast();
  const { user } = useAuth();
  const { agency } = useAgency();
  const [job, setJob] = useState<Job | null>(null);
  const [placements, setPlacements] = useState<PlacementWithRelations[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [matches, setMatches] = useState<Array<{ candidate: Candidate; score: number; reasons: string[] }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadJob = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const [jobRow, placementRows, applicationRows, candidates] = await Promise.all([getJob(id), listJobPlacements(id), listAgencyApplicationsDetailed(), listCandidates()]);
      setJob(jobRow);
      setPlacements(placementRows);
      setApplications(applicationRows.filter((application) => application.job_id === id));
      if (agency) {
        const candidateMatches = await Promise.all(
          candidates.slice(0, 20).map(async (candidate) => {
            const clearance = await getCandidateClearance(agency.id, candidate.id);
            const reasons: string[] = [];
            let score = 0;
            if (clearance.overallStatus === "Cleared") { score += 50; reasons.push("Cleared"); }
            if (["New", "Contacted", "Interviewing"].includes(candidate.status ?? "")) { score += 20; reasons.push(candidate.status ?? "Available"); }
            if (jobRow.job_type === "Daily Supply" && clearance.overallStatus === "Cleared") { score += 15; reasons.push("Supply ready"); }
            return { candidate, score, reasons };
          }),
        );
        setMatches(candidateMatches.sort((a, b) => b.score - a.score).slice(0, 5));
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load job.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [agency, id, notify]);

  useEffect(() => {
    queueMicrotask(() => {
      loadJob();
    });
  }, [loadJob]);

  const handleStatusChange = async (status: JobStatus) => {
    if (!job) return;

    const updated = await updateJobStatus(job.id, status, agency?.id, user?.id);
    setJob(updated);
    notify("Job status updated.", "success");
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-72 w-full" />
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
    <div className="mx-auto max-w-6xl">
      <ButtonLink to="/jobs" variant="outline">
        <ArrowLeft className="size-4" />
        Back to jobs
      </ButtonLink>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex size-14 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100">
                <BriefcaseBusiness className="size-7" />
              </span>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{job.job_title || "Untitled role"}</h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Created {formatDate(job.created_at)}</p>
              </div>
            </div>
            <Badge tone={statusTone(job.status)}>{job.status || "Open"}</Badge>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <InfoTile icon={Building2} label="School" value={job.school_name || job.company_name || "No school"} />
            <InfoTile icon={MapPin} label="Location" value={job.location || "No location"} />
            <InfoTile icon={WalletCards} label="Daily rate" value={job.daily_rate || job.pay_rate || "No rate"} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <InfoTile icon={CalendarDays} label="Type" value={job.job_type} />
            <InfoTile icon={CalendarDays} label="Start date" value={formatDate(job.start_date || job.shift_date)} />
            <InfoTile icon={BriefcaseBusiness} label="Portal visibility" value={job.published ? "Published" : "Internal only"} />
          </div>
        </Card>

        <Card className="lg:col-span-5">
          <h2 className="text-lg font-semibold">Job status</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Track how this role is progressing.</p>
          <div className="mt-5">
            <Select
              label="Status"
              options={statusOptions(jobStatuses)}
              value={job.status || "Open"}
              onChange={(event) => handleStatusChange(event.target.value as JobStatus)}
            />
          </div>
        </Card>

        <div className="grid gap-4 lg:col-span-12 md:grid-cols-4">
          <Metric label="Applications" value={applications.length} />
          <Metric label="Placements" value={placements.length} />
          <Metric label="Vacancies" value={job.vacancies ?? 0} />
          <Metric label="Candidate matches" value={matches.filter((match) => match.score > 0).length} />
        </div>

        <Card className="lg:col-span-5">
          <h2 className="text-lg font-semibold">Notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{job.notes || "No notes yet."}</p>
        </Card>

        <Card className="lg:col-span-7">
          <h2 className="text-lg font-semibold">Related placements</h2>
          {placements.length ? (
            <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
              {placements.map((placement) => (
                <div key={placement.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      {placement.candidates ? fullName(placement.candidates.first_name, placement.candidates.last_name) : "Unassigned candidate"}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Starts {formatDate(placement.start_date)}</p>
                  </div>
                  <Badge tone={statusTone(placement.status)}>{placement.status || "Pending"}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No placements linked yet.</p>
          )}
        </Card>

        <Card className="lg:col-span-12">
          <h2 className="text-lg font-semibold">Recommended Candidates</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Suggested from clearance, candidate status, and job type fit.</p>
          {matches.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {matches.map(({ candidate, reasons, score }) => (
                <ButtonLink key={candidate.id} to={`/candidates/${candidate.id}`} variant="outline" className="h-auto justify-between p-4">
                  <span className="text-left">
                    <span className="block font-semibold">{fullName(candidate.first_name, candidate.last_name)}</span>
                    <span className="mt-1 block text-xs text-slate-500">{reasons.length ? reasons.join(" · ") : "Needs review"}</span>
                  </span>
                  <Badge tone={score >= 50 ? "green" : score >= 20 ? "amber" : "slate"}>{score}%</Badge>
                </ButtonLink>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No recommended candidates yet.</p>
          )}
        </Card>

        <div className="lg:col-span-12">
          <NotesPanel entityType="job" entityId={job.id} />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </Card>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-slate-400" />
        {label}
      </div>
      <p className="mt-2 text-slate-600 dark:text-slate-300">{value}</p>
    </div>
  );
}
