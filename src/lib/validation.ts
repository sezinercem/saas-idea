import { z } from "zod";
export const candidateSchema = z.object({
  first_name: z.string().min(1, "First name is required."),
  last_name: z.string().min(1, "Last name is required."),
  email: z.string().email("Enter a valid email.").or(z.literal("")),
  phone: z.string(),
  status: z.enum(["New", "Contacted", "Interviewing", "Placed", "Archived"]),
  notes: z.string(),
  next_follow_up_date: z.string(),
  follow_up_reason: z.string(),
  right_to_work_status: z.string(),
  compliance_status: z.enum(["Missing", "Pending", "Complete", "Expiring Soon"]),
  compliance_expiry_date: z.string(),
});

export const jobSchema = z.object({
  company_name: z.string().min(1, "Company name is required."),
  job_title: z.string().min(1, "Job title is required."),
  location: z.string(),
  pay_rate: z.string(),
  status: z.enum(["Draft", "Open", "Interviewing", "Filled", "Closed"]),
  notes: z.string(),
  job_type: z.enum(["Permanent", "Long-Term", "Daily Supply", "Short-Term"]),
  start_date: z.string(),
  end_date: z.string(),
  school_name: z.string(),
  subject: z.string(),
  year_group: z.string(),
  daily_rate: z.string(),
  shift_date: z.string(),
  vacancies: z.number().int().min(0),
  compliance_required: z.boolean(),
  published: z.boolean(),
});

export const noteSchema = z.object({
  content: z.string().min(1, "Note cannot be empty.").max(2000, "Note is too long."),
});
