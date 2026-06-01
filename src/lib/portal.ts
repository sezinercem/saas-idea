import { calculateClearance, listCandidateCompliance, uploadComplianceDocument } from "./compliance";
import { supabase } from "./supabase";
import type { CandidateComplianceItem } from "../types/agency";
import type { Job } from "../types/recruitment";
import type {
  CandidatePortalSession,
  JobApplication,
  PortalInvite,
  PortalDashboardData,
  PortalNotification,
  Shift,
  ShiftBooking,
  ShiftInput,
} from "../types/portal";

function getClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export async function getCandidatePortalSession(authUserId: string): Promise<CandidatePortalSession | null> {
  const client = getClient();
  const { data: portalUser, error } = await client
    .from("candidate_users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;
  if (!portalUser || portalUser.portal_status !== "Active") return null;

  const [{ data: candidate, error: candidateError }, { data: agency, error: agencyError }] = await Promise.all([
    client.from("candidates").select("*").eq("id", portalUser.candidate_id).single(),
    client.from("agencies").select("*").eq("id", portalUser.agency_id).single(),
  ]);
  if (candidateError) throw candidateError;
  if (agencyError) throw agencyError;
  return { portalUser, candidate, agency };
}

export async function isActiveCandidatePortalUser(authUserId: string) {
  return Boolean(await getCandidatePortalSession(authUserId));
}

async function hashInviteToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function createCandidatePortalInvite(candidateId: string) {
  const { data: candidate, error: candidateError } = await getClient().from("candidates").select("first_name,last_name,email").eq("id", candidateId).single();
  if (candidateError) throw candidateError;
  if (!candidate.email) throw new Error("Candidate must have an email address before inviting them.");

  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const rawToken = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: inviteId, error } = await getClient().rpc("create_portal_invite", {
    target_candidate_id: candidateId,
    invite_token_hash: await hashInviteToken(rawToken),
    invite_expires_at: expiresAt,
  });
  if (error) throw error;
  if (!inviteId) throw new Error("Unable to create candidate portal invite.");
  const link = `${window.location.origin}/portal/accept?token=${rawToken}`;
  const delivery = await sendCandidateInviteEmail({
    inviteId,
    email: candidate.email,
    candidateName: [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") || "there",
    inviteLink: link,
  });
  return { inviteId, link, expiresAt, delivery };
}

export async function listCandidatePortalInvites(candidateId: string) {
  const { data, error } = await getClient()
    .from("portal_invites")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []) as PortalInvite[];
}

async function sendCandidateInviteEmail(input: { inviteId: string; email: string; candidateName: string; inviteLink: string }) {
  const client = getClient();
  const { data, error } = await client.functions.invoke("send-candidate-invite", { body: input });
  if (!error) return data as { sent: boolean; skipped?: boolean; message?: string };

  await client.rpc("mark_portal_invite_delivery", {
    invite_id: input.inviteId,
    delivery_status: "Failed",
    delivery_error: error.message,
  });
  return { sent: false, message: error.message };
}

export async function previewPortalInvite(rawToken: string) {
  const { data, error } = await getClient().rpc("portal_invite_preview", { raw_token: rawToken });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function acceptPortalInvite(rawToken: string) {
  const { error } = await getClient().rpc("accept_portal_invite", { raw_token: rawToken });
  if (error) throw error;
}

export async function signUpPortalCandidate(email: string, password: string) {
  const { data, error } = await getClient().auth.signUp({
    email,
    password,
    options: {
      data: { candidate_portal: true },
      emailRedirectTo: `${window.location.origin}/portal/login`,
    },
  });
  if (error) throw error;
  return data.session;
}

export async function sendPortalPasswordReset(email: string) {
  const { error } = await getClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/portal/reset-password`,
  });
  if (error) throw error;
}

export async function updatePortalPassword(password: string) {
  const { error } = await getClient().auth.updateUser({ password });
  if (error) throw error;
}

export async function listPortalJobs() {
  const { data, error } = await getClient().from("jobs").select("*").eq("published", true).eq("status", "Open").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Job[];
}

export async function listPortalShifts() {
  const { data, error } = await getClient().from("shifts").select("*").eq("published", true).eq("status", "Open").order("shift_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Shift[];
}

export async function listPortalApplications() {
  const { data, error } = await getClient().from("job_applications").select("*, jobs(*)").order("applied_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as JobApplication[];
}

export async function listPortalBookings() {
  const { data, error } = await getClient().from("shift_bookings").select("*, shifts(*)").order("booked_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ShiftBooking[];
}

export async function listPortalNotifications() {
  const { data, error } = await getClient().from("notifications").select("*").order("created_at", { ascending: false }).limit(12);
  if (error) throw error;
  return (data ?? []) as PortalNotification[];
}

export async function getPortalDashboard(session: CandidatePortalSession): Promise<PortalDashboardData> {
  const [items, jobs, shifts, bookings, notifications] = await Promise.all([
    listCandidateCompliance(session.agency.id, session.candidate.id),
    listPortalJobs(),
    listPortalShifts(),
    listPortalBookings(),
    listPortalNotifications(),
  ]);
  const clearance = calculateClearance(session.candidate.id, items);
  const required = items.filter((item) => item.compliance_types?.required !== false);
  const approved = required.filter((item) => item.status === "Approved").length;
  return {
    clearanceStatus: clearance.overallStatus,
    complianceItems: items,
    completionPercent: required.length ? Math.round((approved / required.length) * 100) : 0,
    missingItems: clearance.missingCount,
    expiringItems: clearance.expiryRiskCount,
    jobs: jobs.slice(0, 3),
    shifts: shifts.slice(0, 3),
    bookings,
    notifications,
  };
}

export async function submitPortalComplianceDocument(session: CandidatePortalSession, item: CandidateComplianceItem, file: File) {
  await uploadComplianceDocument(session.agency.id, session.portalUser.auth_user_id!, session.candidate.id, item, file);
}

export async function applyToJob(session: CandidatePortalSession, jobId: string) {
  const { error } = await getClient().from("job_applications").insert({
    candidate_id: session.candidate.id,
    agency_id: session.agency.id,
    job_id: jobId,
    status: "Applied",
    notes: null,
  });
  if (error) throw error;
}

export async function withdrawApplication(id: string) {
  const { error } = await getClient().from("job_applications").update({ status: "Withdrawn" }).eq("id", id);
  if (error) throw error;
}

export async function bookShift(session: CandidatePortalSession, shift: Shift) {
  const status = shift.booking_type === "Instant" ? "Approved" : "Pending";
  const { error } = await getClient().from("shift_bookings").insert({
    candidate_id: session.candidate.id,
    agency_id: session.agency.id,
    shift_id: shift.id,
    booking_status: status,
    cancelled_at: null,
  });
  if (error) throw error;
}

export async function cancelBooking(id: string) {
  const { error } = await getClient().from("shift_bookings").update({ booking_status: "Cancelled", cancelled_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function listAgencyShifts() {
  const { data, error } = await getClient().from("shifts").select("*").order("shift_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Shift[];
}

export async function createShift(agencyId: string, input: ShiftInput) {
  const { data, error } = await getClient().from("shifts").insert({ ...input, agency_id: agencyId }).select().single();
  if (error) throw error;
  return data as Shift;
}

export async function updateShift(id: string, updates: Partial<ShiftInput>) {
  const { data, error } = await getClient().from("shifts").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data as Shift;
}

export async function listAgencyBookingRequests() {
  const { data, error } = await getClient().from("shift_bookings").select("*").order("booked_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ShiftBooking[];
}

export async function listAgencyApplications() {
  const { data, error } = await getClient().from("job_applications").select("*").order("applied_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as JobApplication[];
}

export async function updateBookingStatus(id: string, booking_status: ShiftBooking["booking_status"]) {
  const { error } = await getClient().from("shift_bookings").update({ booking_status }).eq("id", id);
  if (error) throw error;
}

export function subscribePortalUpdates(onUpdate: () => void) {
  const client = getClient();
  const channel = client
    .channel("candidate-portal-updates")
    .on("postgres_changes", { event: "*", schema: "public", table: "candidate_compliance" }, onUpdate)
    .on("postgres_changes", { event: "*", schema: "public", table: "shift_bookings" }, onUpdate)
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, onUpdate)
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
