import { supabase } from "./supabase";
import type {
  Candidate,
  CandidateInput,
  Job,
  JobInput,
  PlacementInput,
  PlacementWithRelations,
} from "../types/recruitment";

function getClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
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

export async function createCandidate(createdBy: string, input: CandidateInput) {
  const { data, error } = await getClient()
    .from("candidates")
    .insert({ ...input, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCandidate(id: string, input: CandidateInput) {
  const { data, error } = await getClient().from("candidates").update(input).eq("id", id).select().single();
  if (error) throw error;
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

export async function createJob(createdBy: string, input: JobInput) {
  const { data, error } = await getClient().from("jobs").insert({ ...input, created_by: createdBy }).select().single();
  if (error) throw error;
  return data;
}

export async function updateJob(id: string, input: JobInput) {
  const { data, error } = await getClient().from("jobs").update(input).eq("id", id).select().single();
  if (error) throw error;
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

export async function createPlacement(createdBy: string, input: PlacementInput) {
  const { data, error } = await getClient()
    .from("placements")
    .insert({ ...input, created_by: createdBy })
    .select("*, candidates(id, first_name, last_name, email), jobs(id, company_name, job_title, location)")
    .single();

  if (error) throw error;
  return data as PlacementWithRelations;
}

export async function deletePlacement(id: string) {
  const { error } = await getClient().from("placements").delete().eq("id", id);
  if (error) throw error;
}

export async function getDashboardMetrics() {
  const client = getClient();
  const [candidates, activeJobs, placements, recentCandidates, recentJobs, recentPlacements] = await Promise.all([
    client.from("candidates").select("id", { count: "exact", head: true }),
    client.from("jobs").select("id", { count: "exact", head: true }).eq("status", "Active"),
    client.from("placements").select("id", { count: "exact", head: true }),
    client.from("candidates").select("id, first_name, last_name, created_at").order("created_at", { ascending: false }).limit(3),
    client.from("jobs").select("id, company_name, job_title, created_at").order("created_at", { ascending: false }).limit(3),
    client.from("placements").select("id, status, created_at").order("created_at", { ascending: false }).limit(3),
  ]);

  for (const result of [candidates, activeJobs, placements, recentCandidates, recentJobs, recentPlacements]) {
    if (result.error) throw result.error;
  }

  const recentActivity = [
    ...((recentCandidates.data ?? []) as Pick<Candidate, "id" | "first_name" | "last_name" | "created_at">[]).map((item) => ({
      id: item.id,
      type: "Candidate",
      title: `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim() || "Unnamed candidate",
      created_at: item.created_at,
    })),
    ...((recentJobs.data ?? []) as Pick<Job, "id" | "company_name" | "job_title" | "created_at">[]).map((item) => ({
      id: item.id,
      type: "Job",
      title: item.job_title || item.company_name || "Untitled job",
      created_at: item.created_at,
    })),
    ...((recentPlacements.data ?? []) as { id: string; status: string | null; created_at: string | null }[]).map((item) => ({
      id: item.id,
      type: "Placement",
      title: item.status || "New placement",
      created_at: item.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, 5);

  return {
    totalCandidates: candidates.count ?? 0,
    activeJobs: activeJobs.count ?? 0,
    placements: placements.count ?? 0,
    recentActivity,
  };
}
