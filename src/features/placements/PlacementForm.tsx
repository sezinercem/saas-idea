import { useState, type FormEvent } from "react";
import { Select } from "../../components/forms/Select";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { fullName } from "../../lib/format";
import type { CandidateClearance } from "../../types/agency";
import type { Candidate, Job, PlacementInput } from "../../types/recruitment";

const statuses = ["Pending", "Confirmed", "Active", "Completed", "Cancelled"].map((status) => ({ label: status, value: status }));

type PlacementFormProps = {
  candidates: Candidate[];
  clearances?: Record<string, CandidateClearance>;
  jobs: Job[];
  onCancel: () => void;
  onSubmit: (input: PlacementInput) => Promise<void>;
};

export function PlacementForm({ candidates, clearances, jobs, onCancel, onSubmit }: PlacementFormProps) {
  const [form, setForm] = useState<PlacementInput>({
    candidate_id: candidates[0]?.id ?? "",
    job_id: jobs[0]?.id ?? "",
    start_date: "",
    status: "Pending",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof PlacementInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!form.candidate_id || !form.job_id || !form.start_date) {
      setError("Candidate, job, and start date are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(form);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create placement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Select
        label="Candidate"
        value={form.candidate_id}
        onChange={(event) => updateField("candidate_id", event.target.value)}
        options={candidates.map((candidate) => ({
          label: `${fullName(candidate.first_name, candidate.last_name)} · ${clearances?.[candidate.id]?.overallStatus || "Clearance pending"}`,
          value: candidate.id,
        }))}
      />
      <Select
        label="Job"
        value={form.job_id}
        onChange={(event) => updateField("job_id", event.target.value)}
        options={jobs.map((job) => ({
          label: `${job.job_title || "Untitled role"} · ${job.company_name || "No company"}`,
          value: job.id,
        }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Start date" type="date" value={form.start_date} onChange={(event) => updateField("start_date", event.target.value)} />
        <Select label="Status" value={form.status} onChange={(event) => updateField("status", event.target.value)} options={statuses} />
      </div>
      {error ? <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p> : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create placement"}
        </Button>
      </div>
    </form>
  );
}
