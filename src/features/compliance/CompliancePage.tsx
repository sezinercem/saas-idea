import { AlertTriangle, CheckCircle2, Clock3, FileWarning, Search, ShieldCheck, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Select } from "../../components/forms/Select";
import { Badge } from "../../components/ui/Badge";
import { ButtonLink } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAgency } from "../../hooks/useAgency";
import { useToast } from "../../hooks/useToast";
import { effectiveComplianceStatus, getComplianceDashboard } from "../../lib/compliance";
import { formatDate, fullName } from "../../lib/format";
import { statusTone } from "../../lib/status";
import type { OverallClearanceStatus } from "../../types/agency";

type DashboardData = Awaited<ReturnType<typeof getComplianceDashboard>>;

const filters = ["All", "Cleared", "Pending Review", "Expiring Soon", "Non-Compliant"].map((value) => ({ label: value, value }));

export function CompliancePage() {
  const { agency } = useAgency();
  const { notify } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!agency) return;
    setIsLoading(true);
    try {
      setData(await getComplianceDashboard(agency.id));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load safer recruitment compliance.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [agency, notify]);

  useEffect(() => {
    queueMicrotask(() => {
      loadData();
    });
  }, [loadData]);

  const filteredRows = useMemo(() => {
    const term = search.toLowerCase();
    return (data?.rows ?? []).filter(({ candidate, clearance }) => {
      const matchesStatus = filter === "All" || clearance.overallStatus === filter;
      const matchesSearch = !term || fullName(candidate.first_name, candidate.last_name).toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [data?.rows, filter, search]);

  return (
    <div className="mx-auto max-w-7xl">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Safer Recruitment</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Education Compliance Centre</h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
          Manage DBS, safeguarding, Right to Work and school placement readiness across your candidate pool.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={CheckCircle2} label="Cleared Candidates" value={data?.cleared} loading={isLoading} tone="green" />
        <SummaryCard icon={Clock3} label="Pending Review" value={data?.pending} loading={isLoading} tone="blue" />
        <SummaryCard icon={AlertTriangle} label="Expiring Soon" value={data?.expiring} loading={isLoading} tone="amber" />
        <SummaryCard icon={FileWarning} label="Non-Compliant" value={data?.nonCompliant} loading={isLoading} tone="red" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-12">
        <QueueCard title="Pending Review Queue" className="xl:col-span-6">
          {isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : data?.pendingItems.length ? (
            data.pendingItems.slice(0, 5).map(({ candidate, item }) => (
              <QueueRow
                key={item.id}
                title={fullName(candidate.first_name, candidate.last_name)}
                detail={item.compliance_types?.name || "Clearance item"}
                status={effectiveComplianceStatus(item)}
                date={formatDate(item.updated_at)}
                href="/compliance/review"
              />
            ))
          ) : (
            <EmptyState icon={ShieldCheck} title="Review queue clear" body="Uploaded education clearance documents awaiting review will appear here." />
          )}
        </QueueCard>

        <QueueCard title="Expiring Soon Queue" className="xl:col-span-6">
          {isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : data?.expiringItems.length ? (
            data.expiringItems.slice(0, 5).map(({ candidate, item, daysRemaining }) => (
              <QueueRow
                key={item.id}
                title={fullName(candidate.first_name, candidate.last_name)}
                detail={`${item.compliance_types?.name || "Clearance item"} · ${daysRemaining} days remaining`}
                status="Expiring Soon"
                date={formatDate(item.expiry_date)}
                href={`/candidates/${candidate.id}`}
              />
            ))
          ) : (
            <EmptyState icon={AlertTriangle} title="No expiry risk" body="Approved documents due within 30 days will appear here." />
          )}
        </QueueCard>

        <QueueCard title="Missing Required Documents" className="xl:col-span-12">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : data?.rows.some((row) => row.clearance.missingCount > 0) ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {data.rows
                .filter((row) => row.clearance.missingCount > 0)
                .slice(0, 6)
                .map(({ candidate, clearance }) => (
                  <Link
                    key={candidate.id}
                    to={`/candidates/${candidate.id}`}
                    className="rounded-lg border border-slate-200 p-4 transition hover:border-brand-500 dark:border-slate-800"
                  >
                    <p className="font-semibold">{fullName(candidate.first_name, candidate.last_name)}</p>
                    <p className="mt-2 text-sm text-red-600 dark:text-red-300">{clearance.missingCount} missing or failed items</p>
                  </Link>
                ))}
            </div>
          ) : (
            <EmptyState icon={CheckCircle2} title="Required documents complete" body="There are no missing education clearance items right now." />
          )}
        </QueueCard>
      </div>

      <Card className="mt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Compliance Risk Register</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">School placement readiness across all candidates.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
              <Input label="Search" className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <Select label="Clearance status" options={filters} value={filter} onChange={(event) => setFilter(event.target.value)} />
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="hidden grid-cols-[1.2fr_120px_120px_120px_120px_120px] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 md:grid dark:bg-slate-950 dark:text-slate-400">
            <span>Candidate</span>
            <span>Score</span>
            <span>Clearance</span>
            <span>Missing</span>
            <span>Pending review</span>
            <span>Expiring soon</span>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredRows.map(({ candidate, clearance }) => (
              <Link
                key={candidate.id}
                to={`/candidates/${candidate.id}`}
                className="grid gap-2 px-4 py-4 transition hover:bg-slate-50 md:grid-cols-[1.2fr_120px_120px_120px_120px_120px] md:gap-4 dark:hover:bg-slate-800/50"
              >
                <span className="font-semibold">{fullName(candidate.first_name, candidate.last_name)}</span>
                <span className="text-sm font-semibold">{complianceScore(clearance.items)}%</span>
                <Badge tone={statusTone(clearance.overallStatus)}>{clearance.overallStatus}</Badge>
                <span className="text-sm text-slate-600 dark:text-slate-300">{clearance.missingCount}</span>
                <span className="text-sm text-slate-600 dark:text-slate-300">{clearance.items.filter((item) => effectiveComplianceStatus(item) === "Pending Review").length}</span>
                <span className="text-sm text-slate-600 dark:text-slate-300">{clearance.expiryRiskCount}</span>
              </Link>
            ))}
            {!isLoading && filteredRows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No candidates match this compliance filter.</p>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}

function complianceScore(items: DashboardData["rows"][number]["clearance"]["items"]) {
  const required = items.filter((item) => item.compliance_types?.required !== false);
  if (!required.length) return 0;
  const approved = required.filter((item) => effectiveComplianceStatus(item) === "Approved").length;
  return Math.round((approved / required.length) * 100);
}

function SummaryCard({
  icon: Icon,
  label,
  loading,
  tone,
  value,
}: {
  icon: LucideIcon;
  label: string;
  loading: boolean;
  tone: "green" | "blue" | "amber" | "red";
  value?: number;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <Icon className="size-5 text-brand-600 dark:text-brand-100" />
        <Badge tone={tone}>Live</Badge>
      </div>
      <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      {loading ? <Skeleton className="mt-2 h-9 w-14" /> : <p className="mt-2 text-3xl font-bold">{value ?? 0}</p>}
    </Card>
  );
}

function QueueCard({ children, className, title }: { children: ReactNode; className?: string; title: string }) {
  return (
    <Card className={className}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </Card>
  );
}

function QueueRow({
  date,
  detail,
  href,
  status,
  title,
}: {
  date: string;
  detail: string;
  href: string;
  status: OverallClearanceStatus | string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{detail} · {date}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={statusTone(status)}>{status}</Badge>
        <ButtonLink to={href} variant="outline" className="h-9 px-3">
          Review
        </ButtonLink>
      </div>
    </div>
  );
}
