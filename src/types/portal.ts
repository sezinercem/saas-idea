import type { Agency, CandidateComplianceItem, OverallClearanceStatus } from "./agency";
import type { Candidate, Job } from "./recruitment";

export type PortalStatus = "Invited" | "Active" | "Suspended" | "Archived";

export type CandidateUser = {
  id: string;
  candidate_id: string;
  agency_id: string;
  auth_user_id: string | null;
  portal_status: PortalStatus;
  invited_at: string | null;
  accepted_invite_at: string | null;
  last_login_at: string | null;
  created_at: string | null;
};

export type CandidatePortalSession = {
  portalUser: CandidateUser;
  candidate: Candidate;
  agency: Agency;
};

export type PortalInvite = {
  id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  invited_by: string | null;
  agency_id: string;
  candidate_id: string;
  email_sent_at: string | null;
  email_delivery_status: "Pending" | "Sent" | "Failed" | "Skipped";
  email_error: string | null;
  created_at: string;
};

export type Shift = {
  id: string;
  agency_id: string;
  job_id: string | null;
  shift_title: string;
  school_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  vacancies: number;
  booking_type: "Instant" | "Approval Required";
  status: "Draft" | "Open" | "Filled" | "Closed" | "Cancelled";
  published: boolean;
  created_at: string | null;
};

export type ShiftInput = Omit<Shift, "id" | "created_at" | "agency_id">;

export type JobApplication = {
  id: string;
  candidate_id: string;
  agency_id: string;
  job_id: string;
  status: "Applied" | "Under Review" | "Interview Requested" | "Offered" | "Rejected" | "Withdrawn";
  applied_at: string | null;
  notes: string | null;
  jobs?: Job | null;
  candidates?: Pick<Candidate, "id" | "first_name" | "last_name"> | null;
};

export type ShiftBooking = {
  id: string;
  candidate_id: string;
  agency_id: string;
  shift_id: string;
  booking_status: "Pending" | "Approved" | "Rejected" | "Cancelled" | "Completed";
  booked_at: string | null;
  cancelled_at: string | null;
  shifts?: Shift | null;
  candidates?: Pick<Candidate, "id" | "first_name" | "last_name"> | null;
};

export type PortalNotification = {
  id: string;
  agency_id: string;
  recipient_user_id: string | null;
  recipient_candidate_user_id: string | null;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string | null;
};

export type PortalDashboardData = {
  clearanceStatus: OverallClearanceStatus;
  complianceItems: CandidateComplianceItem[];
  completionPercent: number;
  missingItems: number;
  expiringItems: number;
  jobs: Job[];
  shifts: Shift[];
  bookings: ShiftBooking[];
  notifications: PortalNotification[];
};
