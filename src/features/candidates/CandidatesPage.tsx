import { Edit3, Plus, Search, Trash2, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CandidateForm } from "./CandidateForm";
import { Select } from "../../components/forms/Select";
import { Badge } from "../../components/ui/Badge";
import { statusTone } from "../../lib/status";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../hooks/useAuth";
import { useAgency } from "../../hooks/useAgency";
import { useToast } from "../../hooks/useToast";
import { fullName, formatDate } from "../../lib/format";
import { getCandidateClearance } from "../../lib/compliance";
import { createCandidate, deleteCandidate, listCandidates, updateCandidate } from "../../lib/recruitment";
import type { CandidateClearance } from "../../types/agency";
import type { Candidate, CandidateInput } from "../../types/recruitment";

const complianceFilters = ["All", "Cleared", "Pending Review", "Expiring Soon", "Non-Compliant", "Missing Documents"].map((value) => ({
  label: value,
  value,
}));

export function CandidatesPage() {
  const { user } = useAuth();
  const { agency } = useAgency();
  const { notify } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [clearances, setClearances] = useState<Record<string, CandidateClearance>>({});
  const [search, setSearch] = useState("");
  const [complianceFilter, setComplianceFilter] = useState("All");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await listCandidates(search);
      setCandidates(rows);
      if (agency) {
        const clearanceRows = await Promise.all(rows.map((candidate) => getCandidateClearance(agency.id, candidate.id)));
        setClearances(Object.fromEntries(clearanceRows.map((clearance) => [clearance.candidateId, clearance])));
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load candidates.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [agency, notify, search]);

  useEffect(() => {
    queueMicrotask(() => {
      loadCandidates();
    });
  }, [loadCandidates]);

  const openCreateModal = () => {
    setSelectedCandidate(null);
    setIsModalOpen(true);
  };

  const openEditModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsModalOpen(true);
  };

  const handleSubmit = async (input: CandidateInput) => {
    if (!user) return;

    if (selectedCandidate) {
      await updateCandidate(selectedCandidate.id, input, agency?.id, user.id);
      notify("Candidate updated.", "success");
    } else {
      await createCandidate(user.id, input, agency?.id);
      notify("Candidate added.", "success");
    }

    setIsModalOpen(false);
    await loadCandidates();
  };

  const handleDelete = async (candidate: Candidate) => {
    if (!window.confirm(`Delete ${fullName(candidate.first_name, candidate.last_name)}?`)) return;

    await deleteCandidate(candidate.id);
    notify("Candidate deleted.", "success");
    await loadCandidates();
  };

  const visibleCandidates = candidates.filter((candidate) => {
    const clearance = clearances[candidate.id];
    if (complianceFilter === "All") return true;
    if (complianceFilter === "Missing Documents") return Boolean(clearance?.missingCount);
    return clearance?.overallStatus === complianceFilter;
  });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Candidates</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Education candidate clearance</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Track safer recruitment readiness before school placements.</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="size-4" />
          Add candidate
        </Button>
      </div>

      <Card className="mt-8">
        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
            <Input
              label="Search candidates"
              className="pl-10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email, DBS or clearance status"
            />
          </div>
          <Select label="Compliance filter" options={complianceFilters} value={complianceFilter} onChange={(event) => setComplianceFilter(event.target.value)} />
        </div>
      </Card>

      <div className="mt-6">
        {isLoading ? (
          <TableSkeleton />
        ) : visibleCandidates.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title="No candidates yet"
            body="Add a candidate to begin the education safer recruitment clearance process."
            action={<Button onClick={openCreateModal}>Add candidate</Button>}
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Name</th>
                    <th className="px-5 py-4">Contact</th>
                    <th className="px-5 py-4">Workflow</th>
                    <th className="px-5 py-4">Clearance</th>
                    <th className="px-5 py-4">Next expiry</th>
                    <th className="px-5 py-4">Created</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {visibleCandidates.map((candidate) => (
                    <tr key={candidate.id}>
                      <td className="px-5 py-4">
                        <Link className="font-semibold text-slate-950 hover:text-brand-600 dark:text-white" to={`/candidates/${candidate.id}`}>
                          {fullName(candidate.first_name, candidate.last_name)}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        <div>{candidate.email || "No email"}</div>
                        <div className="text-xs text-slate-500">{candidate.phone || "No phone"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={statusTone(candidate.status)}>{candidate.status || "New"}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={statusTone(clearances[candidate.id]?.overallStatus)}>
                          {clearances[candidate.id]?.overallStatus || "Non-Compliant"}
                        </Badge>
                        <p className="mt-1 text-xs text-slate-500">{clearances[candidate.id]?.missingCount ?? 0} missing</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{formatDate(clearances[candidate.id]?.nextExpiryDate)}</td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{formatDate(candidate.created_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => openEditModal(candidate)}>
                            <Edit3 className="size-4" />
                          </Button>
                          <Button variant="outline" onClick={() => handleDelete(candidate)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 lg:hidden">
              {visibleCandidates.map((candidate) => (
                <Card key={candidate.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link className="font-semibold text-slate-950 dark:text-white" to={`/candidates/${candidate.id}`}>
                        {fullName(candidate.first_name, candidate.last_name)}
                      </Link>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{candidate.email || "No email"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge tone={statusTone(candidate.status)}>{candidate.status || "New"}</Badge>
                      <Badge tone={statusTone(clearances[candidate.id]?.overallStatus)}>
                        {clearances[candidate.id]?.overallStatus || "Non-Compliant"}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    {clearances[candidate.id]?.missingCount ?? 0} missing checks · next expiry {formatDate(clearances[candidate.id]?.nextExpiryDate)}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" onClick={() => openEditModal(candidate)}>
                      Edit
                    </Button>
                    <Button variant="outline" onClick={() => handleDelete(candidate)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCandidate ? "Edit candidate" : "Add candidate"}
        description="Capture core education staffing details, then complete the clearance checklist."
        size="lg"
      >
        <CandidateForm candidate={selectedCandidate} onCancel={() => setIsModalOpen(false)} onSubmit={handleSubmit} />
      </Modal>
    </div>
  );
}
