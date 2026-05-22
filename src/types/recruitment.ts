export type Candidate = {
  id: string;
  created_by: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  notes: string | null;
  next_follow_up_date: string | null;
  follow_up_reason: string | null;
  right_to_work_status: string | null;
  compliance_status: string | null;
  compliance_expiry_date: string | null;
  created_at: string | null;
};

export type Job = {
  id: string;
  created_by: string;
  company_name: string | null;
  job_title: string | null;
  location: string | null;
  pay_rate: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
};

export type Placement = {
  id: string;
  created_by: string;
  candidate_id: string | null;
  job_id: string | null;
  start_date: string | null;
  status: string | null;
  created_at: string | null;
};

export type PlacementWithRelations = Placement & {
  candidates: Pick<Candidate, "id" | "first_name" | "last_name" | "email"> | null;
  jobs: Pick<Job, "id" | "company_name" | "job_title" | "location"> | null;
};

export type CandidateStatus = "New" | "Contacted" | "Interviewing" | "Placed" | "Archived";
export type JobStatus = "Draft" | "Open" | "Interviewing" | "Filled" | "Closed";
export type ComplianceStatus = "Missing" | "Pending" | "Complete" | "Expiring Soon";

export type CandidateInput = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: CandidateStatus;
  notes: string;
  next_follow_up_date: string;
  follow_up_reason: string;
  right_to_work_status: string;
  compliance_status: ComplianceStatus;
  compliance_expiry_date: string;
};

export type JobInput = {
  company_name: string;
  job_title: string;
  location: string;
  pay_rate: string;
  status: JobStatus;
  notes: string;
};

export type PlacementInput = {
  candidate_id: string;
  job_id: string;
  start_date: string;
  status: string;
};
