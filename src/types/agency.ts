export type AgencyRole = "owner" | "admin" | "recruiter" | "compliance";

export type Agency = {
  id: string;
  name: string;
  slug: string;
  recruitment_niche: string | null;
  team_size: string | null;
  onboarding_complete: boolean;
  onboarding_completed: boolean;
  onboarding_step: OnboardingStep;
  onboarding_completed_at: string | null;
  logo_url: string | null;
  primary_colour: string;
  created_at: string | null;
};

export type OnboardingStep = "Profile Setup" | "Agency Setup" | "Preferences" | "Compliance Settings" | "Completed";

export type AgencyMember = {
  id: string;
  agency_id: string;
  user_id: string;
  role: AgencyRole;
  created_at: string | null;
};

export type AgencyMemberWithProfile = AgencyMember & {
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
};

export type ActivityLog = {
  id: string;
  agency_id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string | null;
};

export type Note = {
  id: string;
  agency_id: string;
  created_by: string | null;
  entity_type: string;
  entity_id: string;
  content: string;
  created_at: string | null;
};

export type DocumentRecord = {
  id: string;
  agency_id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_path: string;
  uploaded_by: string | null;
  created_at: string | null;
};

export type ComplianceType = {
  id: string;
  agency_id: string | null;
  name: string;
  description: string | null;
  default_required: boolean;
  required: boolean;
  requires_expiry_date: boolean;
  requires_document_upload: boolean;
  sort_order: number;
  created_at: string | null;
};

export type ClearanceItemStatus = "Missing" | "Uploaded" | "Pending Review" | "Approved" | "Rejected" | "Expiring Soon" | "Expired";
export type OverallClearanceStatus = "Cleared" | "Pending Review" | "Expiring Soon" | "Non-Compliant";

export type CandidateCompliance = {
  id: string;
  agency_id: string;
  candidate_id: string;
  compliance_type_id: string | null;
  status: ClearanceItemStatus;
  expiry_date: string | null;
  document_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  rejection_reason: string | null;
  verification_status: "Not Started" | "Queued" | "Checking" | "Needs Review" | "Verified" | "Warning";
  verification_warnings: string[];
  verified_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type CandidateComplianceItem = CandidateCompliance & {
  compliance_types: ComplianceType | null;
  documents: DocumentRecord | null;
};

export type CandidateClearance = {
  candidateId: string;
  overallStatus: OverallClearanceStatus;
  items: CandidateComplianceItem[];
  missingCount: number;
  expiryRiskCount: number;
  nextExpiryDate: string | null;
  lastReviewedAt: string | null;
};
