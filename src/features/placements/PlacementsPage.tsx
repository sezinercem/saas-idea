import { CalendarCheck, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PlacementForm } from "./PlacementForm";
import { Textarea } from "../../components/forms/Textarea";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { statusTone } from "../../lib/status";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../hooks/useAuth";
import { useAgency } from "../../hooks/useAgency";
import { useToast } from "../../hooks/useToast";
import { formatDate, fullName } from "../../lib/format";
import { getCandidateClearance } from "../../lib/compliance";
import { createActivityLog, createPlacement, deletePlacement, listCandidates, listJobs, listPlacements } from "../../lib/recruitment";
import type { CandidateClearance } from "../../types/agency";
import type { Candidate, Job, PlacementInput, PlacementWithRelations } from "../../types/recruitment";

export function PlacementsPage() {
  const { user } = useAuth();
  const { agency, role } = useAgency();
  const { notify } = useToast();
  const [placements, setPlacements] = useState<PlacementWithRelations[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clearances, setClearances] = useState<Record<string, CandidateClearance>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [blockedInput, setBlockedInput] = useState<PlacementInput | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadPlacements = useCallback(async () => {
    setIsLoading(true);
    try {
      const [placementRows, candidateRows, jobRows] = await Promise.all([listPlacements(), listCandidates(), listJobs()]);
      setPlacements(placementRows);
      setCandidates(candidateRows);
      setJobs(jobRows);
      if (agency) {
        const clearanceRows = await Promise.all(candidateRows.map((candidate) => getCandidateClearance(agency.id, candidate.id)));
        setClearances(Object.fromEntries(clearanceRows.map((clearance) => [clearance.candidateId, clearance])));
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load placements.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [agency, notify]);

  useEffect(() => {
    queueMicrotask(() => {
      loadPlacements();
    });
  }, [loadPlacements]);

  const handleSubmit = async (input: PlacementInput) => {
    if (!user || !agency) return;
    const clearance = clearances[input.candidate_id] ?? (await getCandidateClearance(agency.id, input.candidate_id));

    if (clearance.overallStatus !== "Cleared") {
      await createActivityLog(agency.id, user.id, "candidate", input.candidate_id, "placement.blocked_compliance", {
        candidate_id: input.candidate_id,
        clearance_status: clearance.overallStatus,
      });
      setBlockedInput(input);
      return;
    }

    await createPlacement(user.id, input, agency.id);
    notify("Placement created.", "success");
    setIsModalOpen(false);
    await loadPlacements();
  };

  const canOverride = role === "owner" || role === "admin";

  const handleOverride = async () => {
    if (!user || !agency || !blockedInput || !overrideReason.trim()) return;
    const overrideInput: PlacementInput = {
      ...blockedInput,
      compliance_override: true,
      compliance_override_reason: overrideReason.trim(),
      compliance_override_by: user.id,
      compliance_override_at: new Date().toISOString(),
    };
    const placement = await createPlacement(user.id, overrideInput, agency.id);
    await createActivityLog(agency.id, user.id, "candidate", blockedInput.candidate_id, "placement.compliance_override_used", {
      placement_id: placement.id,
      candidate_id: blockedInput.candidate_id,
      reason: overrideReason.trim(),
    });
    notify("Placement created with compliance override.", "success");
    setBlockedInput(null);
    setOverrideReason("");
    setIsModalOpen(false);
    await loadPlacements();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this placement?")) return;

    await deletePlacement(id);
    notify("Placement deleted.", "success");
    await loadPlacements();
  };

  const canCreatePlacement = candidates.length > 0 && jobs.length > 0;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Placements</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Placement management</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Only candidates cleared for school work can proceed without approval override.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} disabled={!canCreatePlacement}>
          <Plus className="size-4" />
          Create placement
        </Button>
      </div>

      {!canCreatePlacement && !isLoading ? (
        <Card className="mt-8 text-sm text-slate-600 dark:text-slate-300">
          Add at least one candidate and one job before creating placements.
        </Card>
      ) : null}

      <div className="mt-8">
        {isLoading ? (
          <TableSkeleton />
        ) : placements.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No placements yet"
            body="Create a placement when a candidate is matched to a job and ready to start."
            action={
              <Button onClick={() => setIsModalOpen(true)} disabled={!canCreatePlacement}>
                Create placement
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4">
            {placements.map((placement) => (
              <Card key={placement.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold">
                      {placement.candidates
                        ? fullName(placement.candidates.first_name, placement.candidates.last_name)
                        : "Unassigned candidate"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {placement.jobs?.job_title || "Untitled role"} · {placement.jobs?.company_name || "No company"}
                    </p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Starts {formatDate(placement.start_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={statusTone(placement.status)}>{placement.status || "Pending"}</Badge>
                    <Button variant="outline" onClick={() => handleDelete(placement.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create placement"
        description="Select a candidate, job, start date, and placement status."
        size="lg"
      >
        <PlacementForm candidates={candidates} clearances={clearances} jobs={jobs} onCancel={() => setIsModalOpen(false)} onSubmit={handleSubmit} />
      </Modal>

      <Modal
        isOpen={Boolean(blockedInput)}
        onClose={() => setBlockedInput(null)}
        title="Candidate not cleared for placement"
        description="This candidate is not cleared for placement in a school."
      >
        <Alert tone="error">Complete required DBS, safeguarding, Right to Work and safer recruitment checks before placing this candidate.</Alert>
        {canOverride ? (
          <div className="mt-5 space-y-4">
            <Textarea
              label="Override reason"
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
              placeholder="Explain why this exceptional school placement is authorised."
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setBlockedInput(null)}>
                Cancel
              </Button>
              <Button disabled={!overrideReason.trim()} onClick={handleOverride}>
                Authorise override
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
            Only an agency owner or administrator can authorise a compliance override.
          </p>
        )}
      </Modal>
    </div>
  );
}
