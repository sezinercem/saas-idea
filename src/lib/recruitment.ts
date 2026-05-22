import { supabase } from "./supabase";
import type {
  Candidate,
  CandidateInput,
  CandidateStatus,
  Job,
  JobInput,
  JobStatus,
  PlacementInput,
  PlacementWithRelations,
} from "../types/recruitment";
import { candidateStatuses, daysFromNowISO, jobStatuses, todayISO } from "./workflow";
import { candidateSchema, jobSchema } from "./validation";

function getClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

function cleanCandidateInput(input: CandidateInput) {
  const parsed = candidateSchema.parse(input);
  return {
    ...parsed,
    next_follow_up_date: parsed.next_follow_up_date || null,
    compliance_expiry_date: parsed.compliance_expiry_date || null,
  };
}

function cleanJobInput(input: JobInput) {
  return jobSchema.parse(input);
}

export async function listCandidates(search = "") {
  let query = getClient().from("candidates").select("*").order("created_at", { ascending: false });

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},phone.ilike.${term},status.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCandidate(id: string) {
  const { data, error } = await getClient().from("candidates").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createActivityLog(
  agencyId: string | null | undefined,
  userId: string | null | undefined,
  entityType: string,
  entityId: string | null,
  action: string,
  metadata: Record<string, unknown> = {},
) {
  if (!agencyId) return;
  const { error } = await getClient().from("activity_logs").insert({
    agency_id: agencyId,
    user_id: userId ?? null,
    entity_type: entityType,
    entity_id: entityId,
    action,
    metadata,
  });
  if (error) throw error;
}

export async function createCandidate(createdBy: string, input: CandidateInput, agencyId?: string | null) {
  const { data, error } = await getClient()
    .from("candidates")
    .insert({ ...cleanCandidateInput(input), created_by: createdBy, agency_id: agencyId ?? null })
    .select()
    .single();
  if (error) throw error;
  await createActivityLog(agencyId, createdBy, "candidate", data.id, "candidate.created", {
    name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
  });
  return data;
}

export async function updateCandidate(id: string, input: CandidateInput, agencyId?: string | null, userId?: string | null) {
  const { data, error } = await getClient().from("candidates").update(cleanCandidateInput(input)).eq("id", id).select().single();
  if (error) throw error;
  await createActivityLog(agencyId, userId, "candidate", id, "candidate.updated", { status: input.status });
  return data;
}

export async function updateCandidateStatus(id: string, status: CandidateStatus, agencyId?: string | null, userId?: string | null) {
  const { data, error } = await getClient().from("candidates").update({ status }).eq("id", id).select().single();
  if (error) throw error;
  await createActivityLog(agencyId, userId, "candidate", id, "candidate.status_changed", { status });
  return data;
}

export async function deleteCandidate(id: string) {
  const { error } = await getClient().from("candidates").delete().eq("id", id);
  if (error) throw error;
}

export async function listJobs(search = "") {
  let query = getClient().from("jobs").select("*").order("created_at", { ascending: false });

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`company_name.ilike.${term},job_title.ilike.${term},location.ilike.${term},status.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getJob(id: string) {
  const { data, error } = await getClient().from("jobs").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createJob(createdBy: string, input: JobInput, agencyId?: string | null) {
  const { data, error } = await getClient()
    .from("jobs")
    .insert({ ...cleanJobInput(input), created_by: createdBy, agency_id: agencyId ?? null })
    .select()
    .single();
  if (error) throw error;
  await createActivityLog(agencyId, createdBy, "job", data.id, "job.created", { title: data.job_title });
  return data;
}

export async function updateJob(id: string, input: JobInput) {
  const { data, error } = await getClient().from("jobs").update(cleanJobInput(input)).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function updateJobStatus(id: string, status: JobStatus, agencyId?: string | null, userId?: string | null) {
  const { data, error } = await getClient().from("jobs").update({ status }).eq("id", id).select().single();
  if (error) throw error;
  await createActivityLog(agencyId, userId, "job", id, "job.status_changed", { status });
  return data;
}

export async function deleteJob(id: string) {
  const { error } = await getClient().from("jobs").delete().eq("id", id);
  if (error) throw error;
}

export async function listPlacements() {
  const { data, error } = await getClient()
    .from("placements")
    .select("*, candidates(id, first_name, last_name, email), jobs(id, company_name, job_title, location)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PlacementWithRelations[];
}

export async function listRecentPlacements(limit = 5) {
  const { data, error } = await getClient()
    .from("placements")
    .select("*, candidates(id, first_name, last_name, email), jobs(id, company_name, job_title, location)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PlacementWithRelations[];
}

export async function listCandidatePlacements(candidateId: string) {
  const { data, error } = await getClient()
    .from("placements")
    .select("*, candidates(id, first_name, last_name, email), jobs(id, company_name, job_title, location)")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PlacementWithRelations[];
}

export async function listJobPlacements(jobId: string) {
  const { data, error } = await getClient()
    .from("placements")
    .select("*, candidates(id, first_name, last_name, email), jobs(id, company_name, job_title, location)")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PlacementWithRelations[];
}

export async function createPlacement(createdBy: string, input: PlacementInput, agencyId?: string | null) {
  const { data, error } = await getClient()
    .from("placements")
    .insert({ ...input, created_by: createdBy, agency_id: agencyId ?? null })
    .select("*, candidates(id, first_name, last_name, email), jobs(id, company_name, job_title, location)")
    .single();

  if (error) throw error;
  await createActivityLog(agencyId, createdBy, "placement", data.id, "placement.created", { status: data.status });
  return data as PlacementWithRelations;
}

export async function deletePlacement(id: string) {
  const { error } = await getClient().from("placements").delete().eq("id", id);
  if (error) throw error;
}

export async function getDashboardMetrics() {
  const client = getClient();
  const today = todayISO();
  const complianceWindow = daysFromNowISO(30);
  const [candidates, openJobs, activePlacements, complianceCandidates, recentCandidates, recentJobs, recentPlacements, followUps, activityLogs, allJobs] =
    await Promise.all([
    client.from("candidates").select("id", { count: "exact", head: true }),
    client.from("jobs").select("id", { count: "exact", head: true }).eq("status", "Open"),
    client.from("placements").select("id", { count: "exact", head: true }).eq("status", "Active"),
    client.from("candidates").select("*"),
    client.from("candidates").select("*").order("created_at", { ascending: false }).limit(5),
    client.from("jobs").select("*").order("created_at", { ascending: false }).limit(5),
    client
      .from("placements")
      .select("*, candidates(id, first_name, last_name, email), jobs(id, company_name, job_title, location)")
      .order("created_at", { ascending: false })
      .limit(5),
    client
      .from("candidates")
      .select("*")
      .not("next_follow_up_date", "is", null)
      .lte("next_follow_up_date", today)
      .order("next_follow_up_date", { ascending: true })
      .limit(5),
    client.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(8),
    client.from("jobs").select("*"),
  ]);

  for (const result of [candidates, openJobs, activePlacements, complianceCandidates, recentCandidates, recentJobs, recentPlacements, followUps, activityLogs, allJobs]) {
    if (result.error) throw result.error;
  }

  const recentActivity = [
    ...((recentCandidates.data ?? []) as Candidate[]).map((item) => ({
      id: item.id,
      type: "Candidate",
      title: `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim() || "Unnamed candidate",
      created_at: item.created_at,
      status: item.status,
    })),
    ...((recentJobs.data ?? []) as Job[]).map((item) => ({
      id: item.id,
      type: "Job",
      title: item.job_title || item.company_name || "Untitled job",
      created_at: item.created_at,
      status: item.status,
    })),
    ...((recentPlacements.data ?? []) as PlacementWithRelations[]).map((item) => ({
      id: item.id,
      type: "Placement",
      title: item.candidates
        ? `${item.candidates.first_name ?? ""} ${item.candidates.last_name ?? ""}`.trim() || "Candidate placement"
        : "New placement",
      created_at: item.created_at,
      status: item.status,
    })),
  ]
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, 8);

  const candidateRows = (recentCandidates.data ?? []) as Candidate[];
  const complianceRows = ((complianceCandidates.data ?? []) as Candidate[])
    .filter(
      (candidate) =>
        ["Missing", "Pending", "Expiring Soon"].includes(candidate.compliance_status ?? "") ||
        Boolean(candidate.compliance_expiry_date && candidate.compliance_expiry_date <= complianceWindow),
    )
    .sort((a, b) => {
      if (!a.compliance_expiry_date) return 1;
      if (!b.compliance_expiry_date) return -1;
      return a.compliance_expiry_date.localeCompare(b.compliance_expiry_date);
    });
  const pipelineCounts = Object.fromEntries(candidateStatuses.map((status) => [status, 0])) as Record<CandidateStatus, number>;
  for (const candidate of (complianceCandidates.data ?? []) as Candidate[]) {
    const status = (candidate.status || "New") as CandidateStatus;
    if (status in pipelineCounts) {
      pipelineCounts[status] += 1;
    }
  }
  const jobsByStatus = Object.fromEntries(jobStatuses.map((status) => [status, 0])) as Record<JobStatus, number>;
  for (const job of (allJobs.data ?? []) as Job[]) {
    const status = (job.status || "Open") as JobStatus;
    if (status in jobsByStatus) {
      jobsByStatus[status] += 1;
    }
  }

  return {
    totalCandidates: candidates.count ?? 0,
    openJobs: openJobs.count ?? 0,
    activePlacements: activePlacements.count ?? 0,
    complianceDueSoon: complianceRows.length,
    recentActivity,
    pipelineCounts,
    followUpsDue: (followUps.data ?? []) as Candidate[],
    complianceWatch: complianceRows.slice(0, 5),
    recentPlacements: (recentPlacements.data ?? []) as PlacementWithRelations[],
    recentCandidates: candidateRows,
    activityLogs: activityLogs.data ?? [],
    jobsByStatus,
    placementsThisMonth: ((recentPlacements.data ?? []) as PlacementWithRelations[]).filter((placement) => {
      const created = placement.created_at ? new Date(placement.created_at) : null;
      const now = new Date();
      return Boolean(created && created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear());
    }).length,
  };
}
