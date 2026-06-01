import { ExternalLink, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { effectiveComplianceStatus, getComplianceDashboard, reviewComplianceItem, signedComplianceDocumentUrl, type ComplianceReviewInput } from "../../lib/compliance";
import { formatDate, fullName } from "../../lib/format";
import { statusTone } from "../../lib/status";
import type { CandidateComplianceItem } from "../../types/agency";
import type { Candidate } from "../../types/recruitment";

type QueueRow = {
  candidate: Candidate;
  item: CandidateComplianceItem;
};

export function ComplianceReviewPage() {
  const { agency } = useAgency();
  const { user } = useAuth();
  const { notify } = useToast();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [search, setSearch] = useState("");
  const [reviewRow, setReviewRow] = useState<QueueRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRows = useCallback(async () => {
    if (!agency) return;
    setIsLoading(true);
    try {
      const data = await getComplianceDashboard(agency.id);
      setRows(data.pendingItems);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load compliance review queue.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [agency, notify]);

  useEffect(() => {
    queueMicrotask(() => {
      loadRows();
    });
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const term = search.toLowerCase();
    return rows.filter((row) => {
      const name = fullName(row.candidate.first_name, row.candidate.last_name).toLowerCase();
      const item = (row.item.compliance_types?.name ?? "").toLowerCase();
      return !term || name.includes(term) || item.includes(term);
    });
  }, [rows, search]);

  const openDocument = async (item: CandidateComplianceItem) => {
    if (!item.documents) return;
    try {
      window.open(await signedComplianceDocumentUrl(item.documents.file_path), "_blank", "noopener,noreferrer");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to open document.", "error");
    }
  };

  const review = async (input: ComplianceReviewInput) => {
    if (!agency || !user || !reviewRow) return;
    await reviewComplianceItem(agency.id, user.id, reviewRow.candidate.id, reviewRow.item, input);
    notify(input.status === "Approved" ? "Document approved." : "Document rejected.", "success");
    setReviewRow(null);
    await loadRows();
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Safer Recruitment</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Compliance Review Queue</h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
            Review uploaded DBS, safeguarding, Right to Work and school clearance documents before candidates are placed.
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
          <Input label="Search queue" className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      <Card className="mt-8">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : filteredRows.length ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="hidden grid-cols-[1.1fr_1fr_115px_115px_130px_1fr_180px] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 lg:grid dark:bg-slate-950 dark:text-slate-400">
              <span>Candidate</span>
              <span>Document type</span>
              <span>Uploaded</span>
              <span>Expiry</span>
              <span>Verification</span>
              <span>Warnings</span>
              <span>Actions</span>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRows.map((row) => (
                <div key={row.item.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1.1fr_1fr_115px_115px_130px_1fr_180px] lg:items-center">
                  <p className="font-semibold">{fullName(row.candidate.first_name, row.candidate.last_name)}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{row.item.compliance_types?.name ?? "Clearance item"}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(row.item.updated_at)}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(row.item.expiry_date)}</p>
                  <Badge tone={statusTone(effectiveComplianceStatus(row.item))}>{row.item.verification_status}</Badge>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{row.item.verification_warnings.length ? row.item.verification_warnings.join(" ") : "No warnings"}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="h-9 px-3" disabled={!row.item.documents} onClick={() => openDocument(row.item)}>
                      <ExternalLink className="size-4" />
                      Open
                    </Button>
                    <Button className="h-9 px-3" onClick={() => setReviewRow(row)}>Review</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState icon={ShieldCheck} title="Review queue clear" body="Uploaded candidate clearance documents will appear here when they need manual review." />
        )}
      </Card>

      <Modal isOpen={Boolean(reviewRow)} onClose={() => setReviewRow(null)} title="Review clearance document" size="md">
        {reviewRow ? <ReviewDecision item={reviewRow.item} onSubmit={review} onCancel={() => setReviewRow(null)} /> : null}
      </Modal>
    </div>
  );
}

function ReviewDecision({
  item,
  onCancel,
  onSubmit,
}: {
  item: CandidateComplianceItem;
  onCancel: () => void;
  onSubmit: (input: ComplianceReviewInput) => Promise<void>;
}) {
  const [decision, setDecision] = useState<ComplianceReviewInput["status"]>("Approved");
  const [expiryDate, setExpiryDate] = useState(item.expiry_date ?? "");
  const [notes, setNotes] = useState(item.reviewer_notes ?? "");
  const [rejectionReason, setRejectionReason] = useState(item.rejection_reason ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    setError("");
    setIsSaving(true);
    try {
      await onSubmit({ status: decision, expiry_date: expiryDate || null, reviewer_notes: notes, rejection_reason: rejectionReason });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save review decision.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant={decision === "Approved" ? "primary" : "outline"} onClick={() => setDecision("Approved")}>Approve</Button>
        <Button variant={decision === "Rejected" ? "primary" : "outline"} onClick={() => setDecision("Rejected")}>Reject</Button>
      </div>
      {item.compliance_types?.requires_expiry_date ? (
        <Input label="Expiry date" type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
      ) : null}
      <Textarea label="Reviewer notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      {decision === "Rejected" ? (
        <Textarea label="Rejection reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />
      ) : null}
      {error ? <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p> : null}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button disabled={isSaving} onClick={submit}>{isSaving ? "Saving..." : "Save decision"}</Button>
      </div>
    </div>
  );
}
