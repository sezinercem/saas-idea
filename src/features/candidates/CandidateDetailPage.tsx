import { ArrowLeft, CalendarClock, Mail, Phone, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CandidateForm } from "./CandidateForm";
import { CandidateActivityTimeline } from "./CandidateActivityTimeline";
import { CandidateCompliancePanel } from "../compliance/CandidateCompliancePanel";
import { DocumentsPanel } from "../documents/DocumentsPanel";
import { NotesPanel } from "../notes/NotesPanel";
import { Select } from "../../components/forms/Select";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ButtonLink } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import { useAgency } from "../../hooks/useAgency";
import { formatDate, fullName } from "../../lib/format";
import { getCandidateClearance } from "../../lib/compliance";
import { getCandidate, listCandidatePlacements, updateCandidate, updateCandidateStatus } from "../../lib/recruitment";
import { statusTone } from "../../lib/status";
import { candidateStatuses, statusOptions } from "../../lib/workflow";
import type { OverallClearanceStatus } from "../../types/agency";
import type { Candidate, CandidateInput, CandidateStatus, PlacementWithRelations } from "../../types/recruitment";

export function CandidateDetailPage() {
  const { id } = useParams();
  const { notify } = useToast();
  const { user } = useAuth();
  const { agency } = useAgency();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [placements, setPlacements] = useState<PlacementWithRelations[]>([]);
  const [clearanceStatus, setClearanceStatus] = useState<OverallClearanceStatus>("Non-Compliant");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadCandidate = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const [candidateRow, placementRows, clearance] = await Promise.all([
        getCandidate(id),
        listCandidatePlacements(id),
        agency ? getCandidateClearance(agency.id, id) : Promise.resolve(null),
      ]);
      setCandidate(candidateRow);
      setPlacements(placementRows);
      if (clearance) setClearanceStatus(clearance.overallStatus);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load candidate.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [agency, id, notify]);

  useEffect(() => {
    queueMicrotask(() => {
      loadCandidate();
    });
  }, [loadCandidate]);

  const handleStatusChange = async (status: CandidateStatus) => {
    if (!candidate) return;

    const updated = await updateCandidateStatus(candidate.id, status, agency?.id, user?.id);
    setCandidate(updated);
    notify("Candidate status updated.", "success");
  };

  const handleEdit = async (input: CandidateInput) => {
    if (!candidate) return;

    await updateCandidate(candidate.id, input, agency?.id, user?.id);
    notify("Candidate updated.", "success");
    setIsEditOpen(false);
    await loadCandidate();
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="mx-auto max-w-4xl">
        <ButtonLink to="/candidates" variant="outline">
          <ArrowLeft className="size-4" />
          Back to candidates
        </ButtonLink>
        <Card className="mt-6">Candidate not found.</Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ButtonLink to="/candidates" variant="outline">
          <ArrowLeft className="size-4" />
          Back to candidates
        </ButtonLink>
        <Button onClick={() => setIsEditOpen(true)}>Edit candidate</Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex size-14 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100">
                <UserRound className="size-7" />
              </span>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{fullName(candidate.first_name, candidate.last_name)}</h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Created {formatDate(candidate.created_at)}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge tone={statusTone(clearanceStatus)}>{clearanceStatus}</Badge>
              <Badge tone={statusTone(candidate.status)}>{candidate.status || "New"}</Badge>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <InfoTile icon={Mail} label="Email" value={candidate.email || "No email saved"} />
            <InfoTile icon={Phone} label="Phone" value={candidate.phone || "No phone saved"} />
          </div>
        </Card>

        <Card className="lg:col-span-5">
          <h2 className="text-lg font-semibold">Recruitment status</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Move candidates through the operating workflow.</p>
          <div className="mt-5">
            <Select
              label="Status"
              options={statusOptions(candidateStatuses)}
              value={candidate.status || "New"}
              onChange={(event) => handleStatusChange(event.target.value as CandidateStatus)}
            />
          </div>
        </Card>

        <Card className="lg:col-span-6">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-5 text-brand-600 dark:text-brand-100" />
            <h2 className="text-lg font-semibold">Follow-up information</h2>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoBlock label="Next follow-up" value={formatDate(candidate.next_follow_up_date)} />
            <InfoBlock label="Reason" value={candidate.follow_up_reason || "No follow-up reason set"} />
          </div>
        </Card>

        <CandidateCompliancePanel candidateId={candidate.id} onStatusChange={loadCandidate} />

        <Card className="lg:col-span-5">
          <h2 className="text-lg font-semibold">Notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{candidate.notes || "No notes yet."}</p>
        </Card>

        <Card className="lg:col-span-7">
          <h2 className="text-lg font-semibold">Related placements</h2>
          {placements.length ? (
            <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
              {placements.map((placement) => (
                <div key={placement.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{placement.jobs?.job_title || "Untitled role"}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{placement.jobs?.company_name || "No company"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(placement.start_date)}</span>
                    <Badge tone={statusTone(placement.status)}>{placement.status || "Pending"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No placements linked yet.</p>
          )}
        </Card>

        <div className="space-y-6 lg:col-span-6">
          <NotesPanel entityType="candidate" entityId={candidate.id} />
        </div>

        <div className="space-y-6 lg:col-span-6">
          <DocumentsPanel entityType="candidate" entityId={candidate.id} />
        </div>

        <div className="lg:col-span-12">
          <CandidateActivityTimeline candidateId={candidate.id} />
        </div>
      </div>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit candidate" size="lg">
        <CandidateForm candidate={candidate} onCancel={() => setIsEditOpen(false)} onSubmit={handleEdit} />
      </Modal>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-slate-400" />
        {label}
      </div>
      <p className="mt-2 text-slate-600 dark:text-slate-300">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
