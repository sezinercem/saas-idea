import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  Clock3,
  FileCheck2,
  FileUp,
  Plus,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { ButtonLink } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../hooks/useAuth";
import { useAgency } from "../hooks/useAgency";
import { useToast } from "../hooks/useToast";
import { BarList } from "../features/dashboard/BarList";
import { formatDate, fullName } from "../lib/format";
import { getComplianceDashboard } from "../lib/compliance";
import { getDashboardMetrics } from "../lib/recruitment";
import { listAgencyApplications, listAgencyBookingRequests, listAgencyShifts } from "../lib/portal";
import { statusTone } from "../lib/status";
import { candidateStatuses, jobStatuses } from "../lib/workflow";
import type { CandidateStatus } from "../types/recruitment";

type DashboardMetrics = Awaited<ReturnType<typeof getDashboardMetrics>>;
type ClearanceDashboard = Awaited<ReturnType<typeof getComplianceDashboard>>;
type PortalOperations = { unfilledShifts: number; bookingRequests: number; applications: number };

const summaryCards = [
  {
    label: "Total Candidates",
    key: "totalCandidates",
    support: "People in your active database",
    icon: UsersRound,
    href: "/candidates",
    trend: "+0.0%",
  },
  {
    label: "Open Jobs",
    key: "openJobs",
    support: "Roles available for matching",
    icon: BriefcaseBusiness,
    href: "/jobs",
    trend: "+0.0%",
  },
  {
    label: "Active Placements",
    key: "activePlacements",
    support: "Assignments currently live",
    icon: CalendarCheck,
    href: "/placements",
    trend: "+0.0%",
  },
  {
    label: "Clearance Risks",
    key: "complianceDueSoon",
    support: "DBS, safeguarding or RTW risks",
    icon: FileCheck2,
    href: "/compliance",
    trend: "Watch",
  },
] as const;

export function DashboardPage() {
  const { user, profile } = useAuth();
  const { agency } = useAgency();
  const { notify } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [clearance, setClearance] = useState<ClearanceDashboard | null>(null);
  const [portalOperations, setPortalOperations] = useState<PortalOperations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const displayName = profile?.full_name || user?.email;

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [metricData, clearanceData, shifts, bookings, applications] = await Promise.all([
        getDashboardMetrics(),
        agency ? getComplianceDashboard(agency.id) : Promise.resolve(null),
        listAgencyShifts(),
        listAgencyBookingRequests(),
        listAgencyApplications(),
      ]);
      setMetrics(metricData);
      setClearance(clearanceData);
      setPortalOperations({
        unfilledShifts: shifts.filter((shift) => shift.status === "Open" && shift.vacancies > 0).length,
        bookingRequests: bookings.filter((booking) => booking.booking_status === "Pending").length,
        applications: applications.filter((application) => application.status === "Applied").length,
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load dashboard.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [agency, notify]);

  useEffect(() => {
    queueMicrotask(() => {
      loadMetrics();
    });
  }, [loadMetrics]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Operations Command Centre</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Good to see you, {displayName}</h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
            Monitor education recruitment activity, safer recruitment risk, and school placements from one workspace.
          </p>
        </div>
        <ButtonLink to="/candidates">
          <Plus className="size-4" />
          Add candidate
        </ButtonLink>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.key} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100">
                <card.icon className="size-5" />
              </span>
              <Badge tone={card.trend === "Watch" ? "amber" : "green"}>{card.trend}</Badge>
            </div>
            <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
            {isLoading ? (
              <Skeleton className="mt-3 h-9 w-20" />
            ) : (
              <p className="mt-2 text-3xl font-bold">
                {card.key === "complianceDueSoon" ? clearance?.nonCompliant ?? 0 : metrics?.[card.key] ?? 0}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">{card.support}</p>
              <ButtonLink to={card.href} variant="ghost" className="h-8 px-2">
                <ArrowUpRight className="size-4" />
              </ButtonLink>
            </div>
          </Card>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <DashboardPanel title="Today's Recruitment Activity" icon={<Activity className="size-5" />}>
            {isLoading ? (
              <LoadingRows />
            ) : metrics?.recentActivity.length ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {metrics.recentActivity.map((activity) => (
                  <div key={`${activity.type}-${activity.id}`} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <Badge tone={activity.type === "Candidate" ? "blue" : activity.type === "Job" ? "green" : "amber"}>
                        {activity.type}
                      </Badge>
                      <div>
                        <p className="font-semibold">{activity.title}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{activity.status || "Workflow activity"}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(activity.created_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Activity} title="No activity yet" body="Add candidates, jobs, or placements and recent work will appear here." />
            )}
          </DashboardPanel>

          <DashboardPanel title="Pipeline Overview" icon={<UsersRound className="size-5" />}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {candidateStatuses.map((status) => (
                <div key={status} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={pipelineTone(status)}>{status}</Badge>
                    <span className="text-xl font-bold">{isLoading ? "..." : metrics?.pipelineCounts[status] ?? 0}</span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-brand-600 dark:bg-brand-100"
                      style={{ width: `${pipelineWidth(metrics?.pipelineCounts[status] ?? 0, metrics?.totalCandidates ?? 0)}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Candidate stage count</p>
                </div>
              ))}
            </div>
          </DashboardPanel>

          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardPanel title="Jobs by Status" icon={<BriefcaseBusiness className="size-5" />}>
              <BarList data={jobStatuses.map((status) => ({ label: status, value: metrics?.jobsByStatus[status] ?? 0 }))} />
            </DashboardPanel>
            <DashboardPanel title="Hiring Velocity" icon={<ArrowUpRight className="size-5" />}>
              <BarList
                data={[
                  { label: "Sourced", value: metrics?.totalCandidates ?? 0 },
                  { label: "Interviewing", value: metrics?.pipelineCounts.Interviewing ?? 0 },
                  { label: "Placed", value: metrics?.pipelineCounts.Placed ?? 0 },
                ]}
              />
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Placeholder velocity chart using current pipeline counts.</p>
            </DashboardPanel>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <DashboardPanel title="Quick Actions" icon={<Plus className="size-5" />}>
            <div className="grid gap-3">
              <ButtonLink to="/candidates" variant="outline" className="justify-start">
                <UsersRound className="size-4" />
                Add Candidate
              </ButtonLink>
              <ButtonLink to="/jobs" variant="outline" className="justify-start">
                <BriefcaseBusiness className="size-4" />
                Add Job
              </ButtonLink>
              <ButtonLink to="/placements" variant="outline" className="justify-start">
                <CalendarCheck className="size-4" />
                Create Placement
              </ButtonLink>
              <ButtonLink to="/compliance" variant="outline" className="justify-start">
                <FileUp className="size-4" />
                Review Clearance Documents
              </ButtonLink>
              <ButtonLink to="/shifts" variant="outline" className="justify-start">
                <CalendarDays className="size-4" />
                Publish School Shift
              </ButtonLink>
            </div>
          </DashboardPanel>

          <DashboardPanel title="Candidate Portal Operations" icon={<CalendarDays className="size-5" />}>
            {isLoading ? <LoadingRows /> : (
              <div className="grid grid-cols-2 gap-3">
                <PortalMetric label="Unfilled shifts" value={portalOperations?.unfilledShifts ?? 0} />
                <PortalMetric label="Booking requests" value={portalOperations?.bookingRequests ?? 0} />
                <PortalMetric label="Applications queue" value={portalOperations?.applications ?? 0} />
                <PortalMetric label="Cleared candidates" value={clearance?.cleared ?? 0} />
              </div>
            )}
            <ButtonLink to="/shifts" variant="outline" className="mt-4 w-full">Manage shifts and bookings</ButtonLink>
          </DashboardPanel>

          <DashboardPanel title="Follow-ups Due" icon={<Clock3 className="size-5" />}>
            {isLoading ? (
              <LoadingRows />
            ) : metrics?.followUpsDue.length ? (
              <div className="space-y-3">
                {metrics.followUpsDue.map((candidate) => (
                  <MiniRecord
                    key={candidate.id}
                    title={fullName(candidate.first_name, candidate.last_name)}
                    meta={candidate.follow_up_reason || "Follow up"}
                    extra={formatDate(candidate.next_follow_up_date)}
                    tone="amber"
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={Clock3} title="No follow-ups due" body="Overdue and due-today candidate follow-ups will appear here." />
            )}
          </DashboardPanel>

          <DashboardPanel title="Compliance Watch" icon={<FileCheck2 className="size-5" />}>
            {isLoading ? (
              <LoadingRows />
            ) : clearance?.rows.filter((row) => row.clearance.overallStatus !== "Cleared").length ? (
              <div className="space-y-3">
                {clearance.rows
                  .filter((row) => row.clearance.overallStatus !== "Cleared")
                  .slice(0, 5)
                  .map(({ candidate, clearance: candidateClearance }) => (
                  <MiniRecord
                    key={candidate.id}
                    title={fullName(candidate.first_name, candidate.last_name)}
                    meta={`${candidateClearance.missingCount} missing checks · expiry ${formatDate(candidateClearance.nextExpiryDate)}`}
                    extra={candidateClearance.overallStatus}
                    tone={statusTone(candidateClearance.overallStatus)}
                  />
                  ))}
              </div>
            ) : (
              <EmptyState icon={FileCheck2} title="School clearance clear" body="DBS, safeguarding and Right to Work risks will appear here." />
            )}
          </DashboardPanel>

          <DashboardPanel title="Recruiter Activity Feed" icon={<Activity className="size-5" />}>
            {isLoading ? (
              <LoadingRows />
            ) : metrics?.activityLogs.length ? (
              <div className="space-y-3">
                {metrics.activityLogs.map((log) => (
                  <MiniRecord key={log.id} title={log.action.replaceAll(".", " ")} meta={log.entity_type} extra={formatDate(log.created_at)} tone="blue" />
                ))}
              </div>
            ) : (
              <EmptyState icon={Activity} title="No activity logs yet" body="Tracked create and status-change events will show here." />
            )}
          </DashboardPanel>
        </div>
      </section>

      <section className="mt-8">
        <DashboardPanel title="Recent Placements" icon={<CalendarCheck className="size-5" />}>
          {isLoading ? (
            <LoadingRows />
          ) : metrics?.recentPlacements.length ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="hidden grid-cols-[1.2fr_1fr_1fr_120px_120px] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400 md:grid">
                <span>Candidate</span>
                <span>Job</span>
                <span>Company</span>
                <span>Start date</span>
                <span>Status</span>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {metrics.recentPlacements.map((placement) => (
                  <div key={placement.id} className="grid gap-2 px-4 py-4 md:grid-cols-[1.2fr_1fr_1fr_120px_120px] md:gap-4">
                    <span className="font-semibold">
                      {placement.candidates ? fullName(placement.candidates.first_name, placement.candidates.last_name) : "Unassigned"}
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{placement.jobs?.job_title || "Untitled role"}</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{placement.jobs?.company_name || "No company"}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(placement.start_date)}</span>
                    <Badge tone={statusTone(placement.status)}>{placement.status || "Pending"}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon={CalendarCheck} title="No placements yet" body="Recent placements will appear here once candidates are matched to jobs." />
          )}
        </DashboardPanel>
      </section>
    </div>
  );
}

function DashboardPanel({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return (
    <Card>
      <div className="mb-5 flex items-center gap-2 text-slate-950 dark:text-white">
        <span className="text-brand-600 dark:text-brand-100">{icon}</span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );
}

function PortalMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>;
}

function MiniRecord({ extra, meta, title, tone }: { extra: string; meta: string; title: string; tone: BadgeTone }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{meta}</p>
        </div>
        <Badge tone={tone}>{extra}</Badge>
      </div>
    </div>
  );
}

function pipelineTone(status: CandidateStatus): BadgeTone {
  if (status === "Placed") return "green";
  if (status === "Interviewing") return "amber";
  if (status === "Archived") return "slate";
  return "blue";
}

function pipelineWidth(count: number, total: number) {
  if (!total) return 0;
  return Math.max(8, Math.round((count / total) * 100));
}
