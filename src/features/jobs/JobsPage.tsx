import { BriefcaseBusiness, Edit3, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { JobForm } from "./JobForm";
import { Badge } from "../../components/ui/Badge";
import { statusTone } from "../../lib/status";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { formatDate } from "../../lib/format";
import { createJob, deleteJob, listJobs, updateJob } from "../../lib/recruitment";
import type { Job, JobInput } from "../../types/recruitment";

export function JobsPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      setJobs(await listJobs(search));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load jobs.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify, search]);

  useEffect(() => {
    queueMicrotask(() => {
      loadJobs();
    });
  }, [loadJobs]);

  const openCreateModal = () => {
    setSelectedJob(null);
    setIsModalOpen(true);
  };

  const openEditModal = (job: Job) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const handleSubmit = async (input: JobInput) => {
    if (!user) return;

    if (selectedJob) {
      await updateJob(selectedJob.id, input);
      notify("Job updated.", "success");
    } else {
      await createJob(user.id, input);
      notify("Job added.", "success");
    }

    setIsModalOpen(false);
    await loadJobs();
  };

  const handleDelete = async (job: Job) => {
    if (!window.confirm(`Delete ${job.job_title || "this job"}?`)) return;

    await deleteJob(job.id);
    notify("Job deleted.", "success");
    await loadJobs();
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Jobs</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Job management</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Manage roles that candidates can be placed into.</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="size-4" />
          Add job
        </Button>
      </div>

      <Card className="mt-8">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
          <Input
            label="Search jobs"
            className="pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Company, title, location, status"
          />
        </div>
      </Card>

      <div className="mt-6">
        {isLoading ? (
          <TableSkeleton />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={BriefcaseBusiness}
            title="No jobs yet"
            body="Add the first open role to start matching candidates to placements."
            action={<Button onClick={openCreateModal}>Add job</Button>}
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {jobs.map((job) => (
              <Card key={job.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Link className="text-lg font-semibold text-slate-950 hover:text-brand-600 dark:text-white" to={`/jobs/${job.id}`}>
                      {job.job_title || "Untitled role"}
                    </Link>
                    <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">{job.company_name || "No company"}</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {job.location || "No location"} · {job.pay_rate || "No pay rate"}
                    </p>
                  </div>
                  <Badge tone={statusTone(job.status)}>{job.status || "Active"}</Badge>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Created {formatDate(job.created_at)}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => openEditModal(job)}>
                      <Edit3 className="size-4" />
                    </Button>
                    <Button variant="outline" onClick={() => handleDelete(job)}>
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
        title={selectedJob ? "Edit job" : "Add job"}
        description="Create a role that can later be linked to a placement."
        size="lg"
      >
        <JobForm job={selectedJob} onCancel={() => setIsModalOpen(false)} onSubmit={handleSubmit} />
      </Modal>
    </div>
  );
}
