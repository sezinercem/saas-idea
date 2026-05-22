export type AgencyRole = "owner" | "admin" | "recruiter" | "compliance";

export type Agency = {
  id: string;
  name: string;
  slug: string;
  recruitment_niche: string | null;
  team_size: string | null;
  onboarding_complete: boolean;
  created_at: string | null;
};

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
  created_at: string | null;
};

export type CandidateCompliance = {
  id: string;
  agency_id: string;
  candidate_id: string;
  compliance_type_id: string | null;
  status: string;
  expiry_date: string | null;
  document_id: string | null;
  created_at: string | null;
};
