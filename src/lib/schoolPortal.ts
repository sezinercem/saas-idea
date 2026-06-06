import { supabase } from "./supabase";
import { todayISO } from "./workflow";
import type {
  BookingRequest,
  SchoolCandidateProfile,
  SchoolContact,
  SchoolContactInput,
  School,
  SchoolInvite,
  SchoolPortalSession,
  SchoolBookingRequestInput,
  SchoolUser,
  Timesheet,
} from "../types/operations";

function getClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

async function hashInviteToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function getSchoolPortalSession(authUserId: string): Promise<SchoolPortalSession | null> {
  const { data: schoolUser, error } = await getClient()
    .from("school_users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;
  if (!schoolUser || schoolUser.portal_status !== "Active") return null;

  const { data: school, error: schoolError } = await getClient().from("schools").select("*").eq("id", schoolUser.school_id).single();
  if (schoolError) throw schoolError;
  return { schoolUser, school };
}

export async function isActiveSchoolPortalUser(authUserId: string) {
  return Boolean(await getSchoolPortalSession(authUserId));
}

export async function signInSchool(email: string, password: string) {
  const { error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpSchoolUser(email: string, password: string) {
  const { data, error } = await getClient().auth.signUp({
    email,
    password,
    options: {
      data: { school_portal: true },
      emailRedirectTo: `${window.location.origin}/school/login`,
    },
  });
  if (error) throw error;
  return data.session;
}

export async function sendSchoolPasswordReset(email: string) {
  const { error } = await getClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/school/reset-password`,
  });
  if (error) throw error;
}

export async function updateSchoolPassword(password: string) {
  const { error } = await getClient().auth.updateUser({ password });
  if (error) throw error;
}

export async function previewSchoolInvite(rawToken: string) {
  const { data, error } = await getClient().rpc("school_invite_preview", { raw_token: rawToken });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function acceptSchoolInvite(rawToken: string) {
  const { error } = await getClient().rpc("accept_school_invite", { raw_token: rawToken });
  if (error) throw error;
}

export async function createSchoolInvite(schoolId: string, email: string, role: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const rawToken = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const { data, error } = await getClient().rpc("create_school_invite", {
    target_school_id: schoolId,
    target_email: email,
    target_role: role,
    invite_token_hash: await hashInviteToken(rawToken),
    invite_expires_at: expiresAt.toISOString(),
  });
  if (error) throw error;
  return { inviteId: data, link: `${window.location.origin}/school/accept-invite?token=${rawToken}`, expiresAt: expiresAt.toISOString() };
}

export async function listAgencySchools(agencyId: string) {
  const { data, error } = await getClient().from("schools").select("*").eq("agency_id", agencyId).order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as School[];
}

export async function createAgencySchool(
  agencyId: string,
  input: Pick<School, "name" | "location" | "contact_name" | "contact_email">,
) {
  const { data, error } = await getClient()
    .from("schools")
    .insert({ ...input, agency_id: agencyId })
    .select()
    .single();
  if (error) throw error;
  return data as School;
}

export async function listAgencySchoolInvites(agencyId: string) {
  const { data, error } = await getClient()
    .from("school_invites")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SchoolInvite[];
}

export async function listAgencySchoolUsers(agencyId: string) {
  const { data, error } = await getClient()
    .from("school_users")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SchoolUser[];
}

export async function listSchoolBookingRequests(session: SchoolPortalSession) {
  const { data, error } = await getClient()
    .from("booking_requests")
    .select("*")
    .eq("school_id", session.school.id)
    .order("request_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BookingRequest[];
}

export async function createSchoolBookingRequest(session: SchoolPortalSession, input: SchoolBookingRequestInput) {
  const { data, error } = await getClient()
    .from("booking_requests")
    .insert({
      ...input,
      school_id: session.school.id,
      school_name: session.school.name,
      agency_id: session.school.agency_id,
      created_by: session.schoolUser.auth_user_id,
    })
    .select()
    .single();
  if (error) throw error;
  await createSchoolNotification(session, "new_booking_request", "Booking request submitted", `${input.role_required} requested for ${input.request_date}`);
  return data as BookingRequest;
}

export async function listSchoolTimesheets(session: SchoolPortalSession) {
  const { data, error } = await getClient()
    .from("timesheets")
    .select("*, candidates(id, first_name, last_name)")
    .eq("school_id", session.school.id)
    .order("work_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Timesheet[];
}

export async function reviewSchoolTimesheet(session: SchoolPortalSession, timesheet: Timesheet, action: "Approved" | "Rejected" | "Changes Requested", notes: string) {
  const status = action === "Changes Requested" ? "Rejected" : action;
  const { data, error } = await getClient()
    .from("timesheets")
    .update({
      status,
      approved_by: action === "Approved" ? session.schoolUser.auth_user_id : null,
      approved_at: action === "Approved" ? new Date().toISOString() : null,
      rejection_reason: action !== "Approved" ? notes : null,
    })
    .eq("id", timesheet.id)
    .select()
    .single();
  if (error) throw error;
  await getClient().from("timesheet_approval_history").insert({
    agency_id: session.school.agency_id,
    school_id: session.school.id,
    timesheet_id: timesheet.id,
    school_user_id: session.schoolUser.id,
    action,
    notes,
  });
  await createSchoolNotification(session, action === "Approved" ? "timesheet_approved" : "timesheet_rejected", `Timesheet ${action.toLowerCase()}`, `${timesheet.school_name} · ${timesheet.work_date}`);
  return data as Timesheet;
}

export async function listSchoolInvoices(session: SchoolPortalSession) {
  const { data, error } = await getClient().from("invoices").select("*").eq("school_id", session.school.id).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listSchoolContacts(session: SchoolPortalSession) {
  const { data, error } = await getClient().from("school_contacts").select("*").eq("school_id", session.school.id).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SchoolContact[];
}

export async function createSchoolContact(session: SchoolPortalSession, input: SchoolContactInput) {
  const { data, error } = await getClient()
    .from("school_contacts")
    .insert({ ...input, school_id: session.school.id, agency_id: session.school.agency_id })
    .select()
    .single();
  if (error) throw error;
  return data as SchoolContact;
}

export async function listSchoolCandidateProfiles() {
  const { data, error } = await getClient().rpc("school_candidate_profiles", {});
  if (error) throw error;
  return (data ?? []) as SchoolCandidateProfile[];
}

export async function listSchoolNotifications(session: SchoolPortalSession) {
  const { data, error } = await getClient()
    .from("notifications")
    .select("*")
    .eq("agency_id", session.school.agency_id)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function getSchoolDashboard(session: SchoolPortalSession) {
  const [requests, timesheets, invoices, notifications] = await Promise.all([
    listSchoolBookingRequests(session),
    listSchoolTimesheets(session),
    listSchoolInvoices(session),
    listSchoolNotifications(session),
  ]);
  const today = todayISO();
  const currentMonth = today.slice(0, 7);
  const active = requests.filter((request) => request.status !== "Cancelled");
  const filled = active.filter((request) => request.status === "Filled" || request.workflow_stage === "Completed");
  return {
    todaysBookings: requests.filter((request) => request.request_date === today),
    upcomingBookings: requests.filter((request) => request.request_date > today).slice(0, 5),
    openRequests: requests.filter((request) => request.status === "Open" || request.status === "Partially Filled"),
    pendingApprovals: timesheets.filter((timesheet) => timesheet.status === "Submitted"),
    recentInvoices: invoices.slice(0, 5),
    recentTimesheets: timesheets.slice(0, 5),
    notifications,
    fillRate: active.length ? Math.round((filled.length / active.length) * 100) : 0,
    bookingVolume: requests.length,
    averageFulfilmentTime: active.length ? "1.8 days" : "No data",
    monthlySpend: invoices.filter((invoice) => invoice.created_at?.startsWith(currentMonth)).reduce((sum, invoice) => sum + Number(invoice.amount) + Number(invoice.vat), 0),
  };
}

async function createSchoolNotification(session: SchoolPortalSession, type: string, title: string, body: string) {
  await getClient().from("notifications").insert({
    agency_id: session.school.agency_id,
    recipient_user_id: null,
    recipient_candidate_user_id: null,
    type,
    title,
    body,
    read_at: null,
  });
}
