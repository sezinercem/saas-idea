import { ExternalLink, FileUp, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Select } from "../../components/forms/Select";
import { Textarea } from "../../components/forms/Textarea";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAgency } from "../../hooks/useAgency";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  calculateClearance,
  deleteComplianceDocument,
  effectiveComplianceStatus,
  listCandidateCompliance,
  reviewComplianceItem,
  signedComplianceDocumentUrl,
  uploadComplianceDocument,
  type ComplianceReviewInput,
} from "../../lib/compliance";
import { formatDate } from "../../lib/format";
import { statusTone } from "../../lib/status";
import type { CandidateComplianceItem } from "../../types/agency";

export function CandidateCompliancePanel({ candidateId, onStatusChange }: { candidateId: string; onStatusChange?: () => void }) {
  const { agency, role } = useAgency();
  const { user } = useAuth();
  const { notify } = useToast();
  const [items, setItems] = useState<CandidateComplianceItem[]>([]);
  const [reviewItem, setReviewItem] = useState<CandidateComplianceItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canReview = role === "owner" || role === "admin" || role === "compliance";
  const clearance = calculateClearance(candidateId, items);

  const loadItems = useCallback(async () => {
    if (!agency) return;
    setIsLoading(true);
    try {
      setItems(await listCandidateCompliance(agency.id, candidateId));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load candidate clearance checklist.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [agency, candidateId, notify]);

  useEffect(() => {
    queueMicrotask(() => {
      loadItems();
    });
  }, [loadItems]);

  const reload = async () => {
    await loadItems();
    onStatusChange?.();
  };

  const handleUpload = async (item: CandidateComplianceItem, file?: File) => {
    if (!file || !agency || !user) return;
    try {
      await uploadComplianceDocument(agency.id, user.id, candidateId, item, file);
      notify("Clearance document uploaded for review.", "success");
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to upload clearance document.", "error");
    }
  };

  const handleOpen = async (item: CandidateComplianceItem) => {
    if (!item.documents) return;
    try {
      const signedUrl = await signedComplianceDocumentUrl(item.documents.file_path);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to open document.", "error");
    }
  };

  const handleDelete = async (item: CandidateComplianceItem) => {
    if (!agency || !user || !item.documents || !window.confirm("Delete this safer recruitment document?")) return;
    try {
      await deleteComplianceDocument(agency.id, user.id, candidateId, item, item.documents);
      notify("Clearance document deleted.", "success");
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to delete document.", "error");
    }
  };

  const handleReview = async (input: ComplianceReviewInput) => {
    if (!agency || !user || !reviewItem) return;
    await reviewComplianceItem(agency.id, user.id, candidateId, reviewItem, input);
    notify(input.status === "Approved" ? "Clearance item approved." : "Replacement requested.", "success");
    setReviewItem(null);
    await reload();
  };

  return (
    <Card className="lg:col-span-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-brand-600 dark:text-brand-100" />
            <h2 className="text-lg font-semibold">Education Candidate Clearance</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Safer recruitment checks required before a candidate can work in a school.
          </p>
        </div>
        <Badge tone={statusTone(clearance.overallStatus)}>{clearance.overallStatus}</Badge>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length ? (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="hidden grid-cols-[1.45fr_130px_115px_160px_130px_240px] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 lg:grid dark:bg-slate-950 dark:text-slate-400">
            <span>Clearance requirement</span>
            <span>Status</span>
            <span>Expiry</span>
            <span>Document</span>
            <span>Reviewer / date</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {items.map((item) => {
              const status = effectiveComplianceStatus(item);
              return (
                <div key={item.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1.45fr_130px_115px_160px_130px_240px] lg:items-center">
                  <div>
                    <p className="text-sm font-semibold">{item.compliance_types?.name || "Clearance item"}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {item.compliance_types?.required ? "Required" : "When applicable"}
                    </p>
                  </div>
                  <Badge tone={statusTone(status)}>{status}</Badge>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(item.expiry_date)}</p>
                  <p className="truncate text-sm text-slate-600 dark:text-slate-300">{item.documents?.file_name || "Not attached"}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {item.reviewed_by ? `Team reviewer - ${formatDate(item.reviewed_at)}` : "Not reviewed"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.compliance_types?.requires_document_upload !== false ? (
                      <label className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
                        <FileUp className="size-3.5" />
                        {item.documents ? "Replace" : "Upload"}
                        <input className="hidden" type="file" onChange={(event) => handleUpload(item, event.target.files?.[0])} />
                      </label>
                    ) : null}
                    {item.documents ? (
                      <Button className="h-9 px-2.5" variant="outline" onClick={() => handleOpen(item)}>
                        <ExternalLink className="size-3.5" />
                      </Button>
                    ) : null}
                    {canReview ? (
                      <Button className="h-9 px-2.5 text-xs" variant="outline" onClick={() => setReviewItem(item)}>
                        Review
                      </Button>
                    ) : null}
                    {canReview && item.documents ? (
                      <Button className="h-9 px-2.5" variant="outline" onClick={() => handleDelete(item)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                  {item.verification_status !== "Not Started" ? (
                    <p className="text-xs text-slate-500 lg:col-span-6">
                      Verification: {item.verification_status}
                      {item.verification_warnings.length ? ` - ${item.verification_warnings.join(" ")}` : ""}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon={ShieldCheck}
            title="No clearance requirements configured"
            body="Run the education compliance migration to create the safer recruitment checklist."
          />
        </div>
      )}

      <Modal isOpen={Boolean(reviewItem)} onClose={() => setReviewItem(null)} title={`Review ${reviewItem?.compliance_types?.name ?? "item"}`} size="md">
        {reviewItem ? <ReviewForm item={reviewItem} onCancel={() => setReviewItem(null)} onSubmit={handleReview} /> : null}
      </Modal>
    </Card>
  );
}

function ReviewForm({
  item,
  onCancel,
  onSubmit,
}: {
  item: CandidateComplianceItem;
  onCancel: () => void;
  onSubmit: (input: ComplianceReviewInput) => Promise<void>;
}) {
  const [status, setStatus] = useState<ComplianceReviewInput["status"]>("Approved");
  const [expiryDate, setExpiryDate] = useState(item.expiry_date ?? "");
  const [notes, setNotes] = useState(item.reviewer_notes ?? "");
  const [rejectionReason, setRejectionReason] = useState(item.rejection_reason ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    setIsSaving(true);
    try {
      await onSubmit({ status, expiry_date: expiryDate || null, reviewer_notes: notes, rejection_reason: rejectionReason });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to complete review.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Select
        label="Decision"
        value={status}
        onChange={(event) => setStatus(event.target.value as ComplianceReviewInput["status"])}
        options={[
          { label: "Approve", value: "Approved" },
          { label: "Request Replacement", value: "Rejected" },
        ]}
      />
      {item.compliance_types?.requires_expiry_date ? (
        <Input label="Expiry date" type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
      ) : null}
      <Textarea label="Reviewer notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      {status === "Rejected" ? (
        <Textarea label="Replacement reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />
      ) : null}
      {error ? <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p> : null}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={isSaving} onClick={submit}>
          {isSaving ? "Saving..." : "Save review"}
        </Button>
      </div>
    </div>
  );
}
