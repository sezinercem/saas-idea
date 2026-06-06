import { supabase } from "./supabase";
import { todayISO } from "./workflow";
import type {
  AvailabilityInput,
  BookingMatch,
  BookingRequest,
  BookingRequestInput,
  CandidateAvailability,
  Invoice,
  InvoiceInput,
  SchoolFeedback,
  Timesheet,
  TimesheetInput,
} from "../types/operations";
import type { Candidate } from "../types/recruitment";

function getClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export async function listAvailability() {
  const { data, error } = await getClient()
    .from("candidate_availability")
    .select("*, candidates(id, first_name, last_name, status, compliance_status)")
    .order("start_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CandidateAvailability[];
}

export async function createAvailability(agencyId: string, userId: string | null | undefined, input: AvailabilityInput) {
  const { data, error } = await getClient()
    .from("candidate_availability")
    .insert({ ...input, agency_id: agencyId, created_by: userId ?? null })
    .select("*, candidates(id, first_name, last_name, status, compliance_status)")
    .single();
  if (error) throw error;
  await createNotification(agencyId, "candidate_availability", "Candidate availability updated", `${input.status} from ${input.start_date}`);
  return data as CandidateAvailability;
}

export async function updateAvailability(id: string, input: Partial<AvailabilityInput>) {
  const { data, error } = await getClient().from("candidate_availability").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as CandidateAvailability;
}

export async function deleteAvailability(id: string) {
  const { error } = await getClient().from("candidate_availability").delete().eq("id", id);
  if (error) throw error;
}

export async function listBookingRequests() {
  const { data, error } = await getClient().from("booking_requests").select("*").order("request_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BookingRequest[];
}

export async function createBookingRequest(agencyId: string, userId: string | null | undefined, input: BookingRequestInput) {
  const { data, error } = await getClient()
    .from("booking_requests")
    .insert({ ...input, agency_id: agencyId, created_by: userId ?? null })
    .select()
    .single();
  if (error) throw error;
  await createNotification(agencyId, "new_booking_request", "New booking request", `${input.school_name} needs ${input.role_required}`);
  return data as BookingRequest;
}

export async function updateBookingRequest(id: string, input: Partial<BookingRequestInput>) {
  const { data, error } = await getClient().from("booking_requests").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as BookingRequest;
}

export async function listBookingMatches(agencyId: string, request: BookingRequest) {
  const [candidatesResult, availabilityResult, feedbackResult] = await Promise.all([
    getClient().from("candidates").select("*").eq("agency_id", agencyId),
    getClient().from("candidate_availability").select("*, candidates(id, first_name, last_name, status, compliance_status)").eq("agency_id", agencyId),
    getClient().from("school_feedback").select("*").eq("agency_id", agencyId),
  ]);
  if (candidatesResult.error) throw candidatesResult.error;
  if (availabilityResult.error) throw availabilityResult.error;
  if (feedbackResult.error) throw feedbackResult.error;

  const availability = (availabilityResult.data ?? []) as CandidateAvailability[];
  const feedback = (feedbackResult.data ?? []) as SchoolFeedback[];
  return ((candidatesResult.data ?? []) as Candidate[])
    .map((candidate) => scoreCandidate(candidate, request, availability, feedback))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export async function confirmBookingMatch(agencyId: string, requestId: string, match: BookingMatch) {
  const { data, error } = await getClient()
    .from("booking_matches")
    .upsert(
      {
        agency_id: agencyId,
        booking_request_id: requestId,
        candidate_id: match.candidate_id,
        score: match.score,
        reason: match.reason,
        status: "Confirmed",
      },
      { onConflict: "booking_request_id,candidate_id" },
    )
    .select()
    .single();
  if (error) throw error;
  await updateBookingRequest(requestId, { workflow_stage: "Candidate Confirmed", status: "Partially Filled" });
  await createNotification(agencyId, "candidate_confirmed", "Candidate confirmed", match.reason ?? "Candidate matched to booking request");
  return data as BookingMatch;
}

export async function listTimesheets() {
  const { data, error } = await getClient()
    .from("timesheets")
    .select("*, candidates(id, first_name, last_name)")
    .order("work_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Timesheet[];
}

export async function createTimesheet(agencyId: string, input: TimesheetInput) {
  const { data, error } = await getClient().from("timesheets").insert({ ...input, agency_id: agencyId }).select().single();
  if (error) throw error;
  return data as Timesheet;
}

export async function updateTimesheetStatus(id: string, status: Timesheet["status"], userId?: string | null, rejectionReason?: string) {
  const payload: Pick<Timesheet, "status" | "approved_by" | "approved_at" | "rejection_reason"> = {
    status,
    approved_by: status === "Approved" ? userId ?? null : null,
    approved_at: status === "Approved" ? new Date().toISOString() : null,
    rejection_reason: rejectionReason ?? null,
  };
  const { data, error } = await getClient().from("timesheets").update(payload).eq("id", id).select().single();
  if (error) throw error;
  if (status === "Approved") {
    await createNotification(data.agency_id, "timesheet_approved", "Timesheet approved", `${data.school_name} on ${data.work_date}`);
  }
  return data as Timesheet;
}

export async function listInvoices() {
  const { data, error } = await getClient().from("invoices").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invoice[];
}

export async function createInvoice(agencyId: string, input: InvoiceInput) {
  const { data, error } = await getClient().from("invoices").insert({ ...input, agency_id: agencyId }).select().single();
  if (error) throw error;
  return data as Invoice;
}

export async function getOperationsDashboard() {
  const [availability, bookings, timesheets, invoices] = await Promise.all([
    listAvailability(),
    listBookingRequests(),
    listTimesheets(),
    listInvoices(),
  ]);
  const today = todayISO();
  const year = today.slice(0, 4);
  const month = today.slice(0, 7);
  const approvedTimesheets = timesheets.filter((timesheet) => timesheet.status === "Approved" || timesheet.status === "Paid");
  const payrollLiability = approvedTimesheets.reduce((sum, timesheet) => sum + timesheetHours(timesheet) * Number(timesheet.pay_rate), 0);
  const revenueThisMonth = invoices.filter((invoice) => invoice.created_at?.startsWith(month)).reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const revenueThisYear = invoices.filter((invoice) => invoice.created_at?.startsWith(year)).reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const outstandingInvoices = invoices.filter((invoice) => invoice.status === "Sent" || invoice.status === "Overdue").reduce((sum, invoice) => sum + Number(invoice.amount) + Number(invoice.vat), 0);

  return {
    availableToday: availability.filter((row) => isAvailableOn(row, today)).length,
    urgentBookings: bookings.filter((booking) => booking.urgency === "Urgent" && booking.status === "Open").length,
    unfilledBookings: bookings.filter((booking) => booking.status === "Open" || booking.status === "Partially Filled").length,
    fillRate: bookings.length ? Math.round((bookings.filter((booking) => booking.status === "Filled").length / bookings.length) * 100) : 0,
    submittedTimesheets: timesheets.filter((timesheet) => timesheet.status === "Submitted").length,
    payrollLiability,
    revenueThisMonth,
    revenueThisYear,
    outstandingInvoices,
    grossMargin: revenueThisMonth ? Math.round(((revenueThisMonth - payrollLiability) / revenueThisMonth) * 100) : 0,
  };
}

export async function getCandidatePerformance(candidateId: string) {
  const [placements, bookings, feedback] = await Promise.all([
    getClient().from("placements").select("id").eq("candidate_id", candidateId),
    getClient().from("shift_bookings").select("id, booking_status").eq("candidate_id", candidateId),
    getClient().from("school_feedback").select("*").eq("candidate_id", candidateId).order("created_at", { ascending: false }),
  ]);
  if (placements.error) throw placements.error;
  if (bookings.error) throw bookings.error;
  if (feedback.error) throw feedback.error;
  const bookingRows = bookings.data ?? [];
  const cancellations = bookingRows.filter((booking) => booking.booking_status === "Cancelled").length;
  const feedbackRows = (feedback.data ?? []) as SchoolFeedback[];
  const averageFeedback = feedbackRows.length
    ? Math.round(feedbackRows.reduce((sum, row) => sum + row.reliability + row.professionalism + row.classroom_management, 0) / (feedbackRows.length * 3))
    : 0;

  return {
    placementsCompleted: placements.data?.length ?? 0,
    supplyShiftsWorked: bookingRows.filter((booking) => booking.booking_status === "Completed").length,
    cancellationRate: bookingRows.length ? Math.round((cancellations / bookingRows.length) * 100) : 0,
    reliabilityScore: averageFeedback || Math.max(0, 100 - cancellations * 10),
    feedback: feedbackRows,
  };
}

export function timesheetHours(timesheet: Pick<Timesheet, "start_time" | "end_time" | "break_minutes">) {
  const [startHours, startMinutes] = timesheet.start_time.split(":").map(Number);
  const [endHours, endMinutes] = timesheet.end_time.split(":").map(Number);
  const minutes = endHours * 60 + endMinutes - (startHours * 60 + startMinutes) - Number(timesheet.break_minutes);
  return Math.max(0, Math.round((minutes / 60) * 100) / 100);
}

export function isAvailableOn(row: CandidateAvailability, date: string) {
  return row.status === "Available" && row.start_date <= date && row.end_date >= date;
}

function scoreCandidate(candidate: Candidate, request: BookingRequest, availability: CandidateAvailability[], feedback: SchoolFeedback[]): BookingMatch {
  const name = `${candidate.first_name ?? ""} ${candidate.last_name ?? ""}`.trim();
  const available = availability.find((row) => row.candidate_id === candidate.id && isAvailableOn(row, request.request_date));
  const feedbackRows = feedback.filter((row) => row.candidate_id === candidate.id);
  const feedbackScore = feedbackRows.length
    ? feedbackRows.reduce((sum, row) => sum + row.reliability + row.professionalism + row.classroom_management, 0) / feedbackRows.length
    : 9;
  const complianceScore = candidate.compliance_status === "Complete" || candidate.status === "Placed" ? 30 : 10;
  const availabilityScore = available ? 35 : 0;
  const roleScore = available?.role_preference?.toLowerCase().includes(request.role_required.toLowerCase()) ? 15 : 5;
  const locationScore = available?.location_preference && request.school_name.toLowerCase().includes(available.location_preference.toLowerCase()) ? 10 : 4;
  const score = Math.min(100, Math.round(complianceScore + availabilityScore + roleScore + locationScore + feedbackScore));
  return {
    id: `${request.id}-${candidate.id}`,
    agency_id: request.agency_id,
    booking_request_id: request.id,
    candidate_id: candidate.id,
    score,
    reason: `${name || "Candidate"} scored ${score}: ${available ? "available" : "availability not confirmed"}, ${candidate.status ?? "status unknown"}.`,
    status: "Suggested",
    created_at: null,
    candidates: candidate,
  };
}

async function createNotification(agencyId: string, type: string, title: string, body: string) {
  await getClient().from("notifications").insert({
    agency_id: agencyId,
    recipient_user_id: null,
    recipient_candidate_user_id: null,
    type,
    title,
    body,
    read_at: null,
  });
}
