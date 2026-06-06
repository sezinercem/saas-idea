import type { Candidate } from "./recruitment";

export type AvailabilityStatus = "Available" | "Unavailable" | "Holiday" | "Sick";
export type AvailabilityDayPart = "Full Day" | "AM Only" | "PM Only";
export type BookingRole = "Teacher" | "Teaching Assistant" | "Cover Supervisor" | "SEN Support";
export type BookingUrgency = "Low" | "Normal" | "Urgent";
export type BookingRequestStatus = "Open" | "Partially Filled" | "Filled" | "Cancelled";
export type BookingWorkflowStage = "New Requests" | "Candidate Matching" | "Candidate Confirmed" | "School Confirmed" | "Completed";
export type TimesheetStatus = "Draft" | "Submitted" | "Approved" | "Rejected" | "Paid";
export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue";
export type SchoolUserRole = "School Admin" | "Business Manager" | "Cover Manager" | "Department Lead";
export type SchoolPortalStatus = "Invited" | "Active" | "Suspended" | "Archived";

export type School = {
  id: string;
  agency_id: string;
  name: string;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  created_at: string | null;
};

export type SchoolUser = {
  id: string;
  school_id: string;
  agency_id: string;
  auth_user_id: string | null;
  role: SchoolUserRole;
  portal_status: SchoolPortalStatus;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string | null;
};

export type SchoolInvite = {
  id: string;
  token_hash: string;
  school_id: string;
  agency_id: string;
  email: string;
  role: SchoolUserRole;
  invited_by: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string | null;
};

export type SchoolContact = {
  id: string;
  school_id: string;
  agency_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: SchoolUserRole;
  created_at: string | null;
};

export type TimesheetApprovalHistory = {
  id: string;
  agency_id: string;
  school_id: string | null;
  timesheet_id: string;
  school_user_id: string | null;
  action: "Approved" | "Rejected" | "Changes Requested";
  notes: string | null;
  created_at: string | null;
};

export type SchoolPortalSession = {
  schoolUser: SchoolUser;
  school: School;
};

export type SchoolCandidateProfile = {
  candidate_id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  compliance_cleared: boolean;
  experience_summary: string | null;
  availability: string | null;
};

export type CandidateAvailability = {
  id: string;
  agency_id: string;
  candidate_id: string;
  status: AvailabilityStatus;
  day_part: AvailabilityDayPart;
  start_date: string;
  end_date: string;
  role_preference: string | null;
  location_preference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  candidates?: Pick<Candidate, "id" | "first_name" | "last_name" | "status" | "compliance_status"> | null;
};

export type BookingRequest = {
  id: string;
  agency_id: string;
  school_id: string | null;
  school_name: string;
  role_required: BookingRole;
  request_date: string;
  start_time: string | null;
  end_time: string | null;
  subject: string | null;
  year_group: string | null;
  notes: string | null;
  urgency: BookingUrgency;
  status: BookingRequestStatus;
  workflow_stage: BookingWorkflowStage;
  vacancies: number;
  created_by: string | null;
  created_at: string | null;
};

export type BookingMatch = {
  id: string;
  agency_id: string;
  booking_request_id: string;
  candidate_id: string;
  score: number;
  reason: string | null;
  status: "Suggested" | "Contacted" | "Confirmed" | "Declined";
  created_at: string | null;
  candidates?: Pick<Candidate, "id" | "first_name" | "last_name" | "status" | "compliance_status"> | null;
};

export type Timesheet = {
  id: string;
  agency_id: string;
  candidate_id: string | null;
  school_id: string | null;
  school_name: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  notes: string | null;
  status: TimesheetStatus;
  pay_rate: number;
  charge_rate: number;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string | null;
  candidates?: Pick<Candidate, "id" | "first_name" | "last_name"> | null;
};

export type Invoice = {
  id: string;
  agency_id: string;
  school_id: string | null;
  school_name: string;
  source_type: "Placement" | "Supply Booking" | "Timesheet";
  source_id: string | null;
  status: InvoiceStatus;
  amount: number;
  vat: number;
  due_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string | null;
};

export type SchoolFeedback = {
  id: string;
  agency_id: string;
  candidate_id: string;
  school_id: string | null;
  school_name: string;
  reliability: number;
  professionalism: number;
  classroom_management: number;
  comments: string | null;
  created_by: string | null;
  created_at: string | null;
};

export type AvailabilityInput = Omit<CandidateAvailability, "id" | "created_at" | "agency_id" | "created_by" | "candidates">;
export type BookingRequestInput = Omit<BookingRequest, "id" | "created_at" | "agency_id" | "created_by">;
export type TimesheetInput = Omit<Timesheet, "id" | "created_at" | "agency_id" | "approved_by" | "approved_at" | "rejection_reason" | "candidates">;
export type InvoiceInput = Omit<Invoice, "id" | "created_at" | "agency_id" | "sent_at" | "paid_at">;
export type SchoolBookingRequestInput = Omit<BookingRequest, "id" | "created_at" | "agency_id" | "created_by" | "school_id" | "school_name">;
export type SchoolContactInput = Omit<SchoolContact, "id" | "created_at" | "agency_id" | "school_id">;
