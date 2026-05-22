import { useState, type FormEvent } from "react";
import { Select } from "../../components/forms/Select";
import { Textarea } from "../../components/forms/Textarea";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { jobStatuses, statusOptions } from "../../lib/workflow";
import type { Job, JobInput, JobStatus } from "../../types/recruitment";

const emptyJob: JobInput = {
  company_name: "",
  job_title: "",
  location: "",
  pay_rate: "",
  status: "Open",
  notes: "",
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
        <Input label="Company name" value={form.company_name} onChange={(event) => updateField("company_name", event.target.value)} />
        <Input label="Job title" value={form.job_title} onChange={(event) => updateField("job_title", event.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Location" value={form.location} onChange={(event) => updateField("location", event.target.value)} />
        <Input label="Pay rate" value={form.pay_rate} placeholder="£18/hr" onChange={(event) => updateField("pay_rate", event.target.value)} />
      </div>
      <Select label="Status" options={statusOptions(jobStatuses)} value={form.status} onChange={(event) => updateField("status", event.target.value)} />
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
