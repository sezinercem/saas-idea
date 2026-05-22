import { useState, type FormEvent } from "react";
import { Textarea } from "../../components/forms/Textarea";
import { Select } from "../../components/forms/Select";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { Candidate, CandidateInput } from "../../types/recruitment";

const statuses = ["New", "Screening", "Interviewing", "Placed", "Inactive"].map((status) => ({
  label: status,
  value: status,
}));

const emptyCandidate: CandidateInput = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  status: "New",
  notes: "",
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
          status: candidate.status ?? "New",
          notes: candidate.notes ?? "",
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
      <Select label="Status" options={statuses} value={form.status} onChange={(event) => updateField("status", event.target.value)} />
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
