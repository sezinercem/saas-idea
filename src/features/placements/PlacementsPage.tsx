import { CalendarCheck, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PlacementForm } from "./PlacementForm";
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
import { createPlacement, deletePlacement, listCandidates, listJobs, listPlacements } from "../../lib/recruitment";
import type { Candidate, Job, PlacementInput, PlacementWithRelations } from "../../types/recruitment";

export function PlacementsPage() {
  const { user } = useAuth();
  const { agency } = useAgency();
  const { notify } = useToast();
  const [placements, setPlacements] = useState<PlacementWithRelations[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadPlacements = useCallback(async () => {
    setIsLoading(true);
    try {
      const [placementRows, candidateRows, jobRows] = await Promise.all([listPlacements(), listCandidates(), listJobs()]);
      setPlacements(placementRows);
      setCandidates(candidateRows);
      setJobs(jobRows);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load placements.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    queueMicrotask(() => {
      loadPlacements();
    });
  }, [loadPlacements]);

  const handleSubmit = async (input: PlacementInput) => {
    if (!user) return;

    await createPlacement(user.id, input, agency?.id);
    notify("Placement created.", "success");
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
          <p className="mt-3 text-slate-600 dark:text-slate-300">Connect candidates to jobs and track start dates.</p>
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
        <PlacementForm candidates={candidates} jobs={jobs} onCancel={() => setIsModalOpen(false)} onSubmit={handleSubmit} />
      </Modal>
    </div>
  );
}
