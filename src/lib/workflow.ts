import type { CandidateStatus, ComplianceStatus, JobStatus } from "../types/recruitment";

export const candidateStatuses: CandidateStatus[] = ["New", "Contacted", "Interviewing", "Placed", "Archived"];
export const jobStatuses: JobStatus[] = ["Draft", "Open", "Interviewing", "Filled", "Closed"];
export const complianceStatuses: ComplianceStatus[] = ["Missing", "Pending", "Complete", "Expiring Soon"];

export function statusOptions<T extends string>(statuses: T[]) {
  return statuses.map((status) => ({ label: status, value: status }));
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function daysFromNowISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
