import { useState, type FormEvent } from "react";
import { Textarea } from "../../components/forms/Textarea";
import { Select } from "../../components/forms/Select";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { candidateStatuses, complianceStatuses, statusOptions } from "../../lib/workflow";
import type { Candidate, CandidateInput, CandidateStatus, ComplianceStatus } from "../../types/recruitment";

const emptyCandidate: CandidateInput = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  status: "New",
  notes: "",
  next_follow_up_date: "",
  follow_up_reason: "",
  right_to_work_status: "",
  compliance_status: "Missing",
  compliance_expiry_date: "",
};

type CandidateFormProps = {
  candidate?: Candidate | null;
  onCancel: () => void;
  onSubmit: (input: CandidateInput) => Promise<void>;
};

export function CandidateForm({ candidate, onCancel, onSubmit }: CandidateFormProps) {
  const [form, setForm] = useState<CandidateInput>(
    candidate
      ? {
          first_name: candidate.first_name ?? "",
          last_name: candidate.last_name ?? "",
          email: candidate.email ?? "",
          phone: candidate.phone ?? "",
          status: normalizeCandidateStatus(candidate.status),
          notes: candidate.notes ?? "",
          next_follow_up_date: candidate.next_follow_up_date ?? "",
          follow_up_reason: candidate.follow_up_reason ?? "",
          right_to_work_status: candidate.right_to_work_status ?? "",
          compliance_status: normalizeComplianceStatus(candidate.compliance_status),
          compliance_expiry_date: candidate.compliance_expiry_date ?? "",
        }
      : emptyCandidate,
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof CandidateInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First name and last name are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(form);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save candidate.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" value={form.first_name} onChange={(event) => updateField("first_name", event.target.value)} />
        <Input label="Last name" value={form.last_name} onChange={(event) => updateField("last_name", event.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
        <Input label="Phone" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Recruitment status"
          options={statusOptions(candidateStatuses)}
          value={form.status}
          onChange={(event) => updateField("status", event.target.value)}
        />
        <Input
          label="Next follow-up date"
          type="date"
          value={form.next_follow_up_date}
          onChange={(event) => updateField("next_follow_up_date", event.target.value)}
        />
      </div>
      <Input
        label="Follow-up reason"
        value={form.follow_up_reason}
        placeholder="Call about availability"
        onChange={(event) => updateField("follow_up_reason", event.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="Right to work"
          value={form.right_to_work_status}
          placeholder="Checked, pending, not started"
          onChange={(event) => updateField("right_to_work_status", event.target.value)}
        />
        <Select
          label="Compliance status"
          options={statusOptions(complianceStatuses)}
          value={form.compliance_status}
          onChange={(event) => updateField("compliance_status", event.target.value)}
        />
        <Input
          label="Compliance expiry"
          type="date"
          value={form.compliance_expiry_date}
          onChange={(event) => updateField("compliance_expiry_date", event.target.value)}
        />
      </div>
      <Textarea label="Notes" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
      {error ? <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p> : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save candidate"}
        </Button>
      </div>
    </form>
  );
}

function normalizeCandidateStatus(status: string | null): CandidateStatus {
  if (status === "Screening") return "Contacted";
  if (status === "Inactive") return "Archived";
  if (candidateStatuses.includes(status as CandidateStatus)) return status as CandidateStatus;
  return "New";
}

function normalizeComplianceStatus(status: string | null): ComplianceStatus {
  if (complianceStatuses.includes(status as ComplianceStatus)) return status as ComplianceStatus;
  return "Missing";
}
