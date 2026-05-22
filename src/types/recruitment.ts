export type Candidate = {
  id: string;
  created_by: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  notes: string | null;
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

export type CandidateInput = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  notes: string;
};

export type JobInput = {
  company_name: string;
  job_title: string;
  location: string;
  pay_rate: string;
  status: string;
  notes: string;
};

export type PlacementInput = {
  candidate_id: string;
  job_id: string;
  start_date: string;
  status: string;
};
