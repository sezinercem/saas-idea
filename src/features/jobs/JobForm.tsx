import { useState, type FormEvent } from "react";
import { Select } from "../../components/forms/Select";
import { Textarea } from "../../components/forms/Textarea";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { jobStatuses, jobTypes, statusOptions } from "../../lib/workflow";
import type { Job, JobInput, JobStatus } from "../../types/recruitment";

const emptyJob: JobInput = {
  company_name: "",
  job_title: "",
  location: "",
  pay_rate: "",
  status: "Open",
  notes: "",
  job_type: "Long-Term",
  start_date: "",
  end_date: "",
  school_name: "",
  subject: "",
  year_group: "",
  daily_rate: "",
  shift_date: "",
  vacancies: 1,
  compliance_required: true,
  published: false,
};

type JobFormProps = {
  job?: Job | null;
  onCancel: () => void;
  onSubmit: (input: JobInput) => Promise<void>;
};

export function JobForm({ job, onCancel, onSubmit }: JobFormProps) {
  const [form, setForm] = useState<JobInput>(
    job
      ? {
          company_name: job.company_name ?? "",
          job_title: job.job_title ?? "",
          location: job.location ?? "",
          pay_rate: job.pay_rate ?? "",
          status: normalizeJobStatus(job.status),
          notes: job.notes ?? "",
          job_type: job.job_type,
          start_date: job.start_date ?? "",
          end_date: job.end_date ?? "",
          school_name: job.school_name ?? "",
          subject: job.subject ?? "",
          year_group: job.year_group ?? "",
          daily_rate: job.daily_rate ?? "",
          shift_date: job.shift_date ?? "",
          vacancies: job.vacancies,
          compliance_required: job.compliance_required,
          published: job.published,
        }
      : emptyJob,
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof JobInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!form.company_name.trim() || !form.job_title.trim()) {
      setError("Company name and job title are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(form);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="School or trust" value={form.company_name} onChange={(event) => updateField("company_name", event.target.value)} />
        <Input label="Job title" value={form.job_title} onChange={(event) => updateField("job_title", event.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="School name" value={form.school_name} onChange={(event) => updateField("school_name", event.target.value)} />
        <Select label="Opportunity type" options={statusOptions(jobTypes)} value={form.job_type} onChange={(event) => updateField("job_type", event.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Location" value={form.location} onChange={(event) => updateField("location", event.target.value)} />
        <Input label="Daily rate" value={form.daily_rate} placeholder="GBP 180/day" onChange={(event) => updateField("daily_rate", event.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Subject" value={form.subject} onChange={(event) => updateField("subject", event.target.value)} />
        <Input label="Year group" value={form.year_group} onChange={(event) => updateField("year_group", event.target.value)} />
        <Input label="Vacancies" type="number" min={0} value={form.vacancies} onChange={(event) => setForm((current) => ({ ...current, vacancies: Number(event.target.value) }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Start date" type="date" value={form.start_date} onChange={(event) => updateField("start_date", event.target.value)} />
        <Input label="End date" type="date" value={form.end_date} onChange={(event) => updateField("end_date", event.target.value)} />
        <Input label="Single shift date" type="date" value={form.shift_date} onChange={(event) => updateField("shift_date", event.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Status" options={statusOptions(jobStatuses)} value={form.status} onChange={(event) => updateField("status", event.target.value)} />
        <Input label="Legacy/hourly rate (optional)" value={form.pay_rate} onChange={(event) => updateField("pay_rate", event.target.value)} />
      </div>
      <div className="flex flex-wrap gap-6 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" checked={form.published} onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))} />
          Publish to candidate portal
        </label>
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" checked={form.compliance_required} onChange={(event) => setForm((current) => ({ ...current, compliance_required: event.target.checked }))} />
          Requires candidate clearance
        </label>
      </div>
      <Textarea label="Notes" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
      {error ? <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p> : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save job"}
        </Button>
      </div>
    </form>
  );
}

function normalizeJobStatus(status: string | null): JobStatus {
  if (status === "Active") return "Open";
  if (status === "Paused") return "Interviewing";
  if (jobStatuses.includes(status as JobStatus)) return status as JobStatus;
  return "Open";
}
