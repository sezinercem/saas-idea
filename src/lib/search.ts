import { listCandidates, listJobs, listPlacements } from "./recruitment";
import { fullName } from "./format";

export type SearchResult = {
  group: "Candidates" | "Jobs" | "Placements";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const [candidates, jobs, placements] = await Promise.all([listCandidates(query), listJobs(query), listPlacements()]);
  const normalized = query.toLowerCase();

  const placementResults = placements
    .filter((placement) => {
      const haystack = `${placement.candidates?.first_name ?? ""} ${placement.candidates?.last_name ?? ""} ${placement.jobs?.job_title ?? ""} ${placement.jobs?.company_name ?? ""}`;
      return haystack.toLowerCase().includes(normalized);
    })
    .slice(0, 5)
    .map<SearchResult>((placement) => ({
      group: "Placements",
      id: placement.id,
      title: placement.candidates ? fullName(placement.candidates.first_name, placement.candidates.last_name) : "Placement",
      subtitle: placement.jobs?.job_title || "Placement record",
      href: "/placements",
    }));

  return [
    ...candidates.slice(0, 5).map<SearchResult>((candidate) => ({
      group: "Candidates",
      id: candidate.id,
      title: fullName(candidate.first_name, candidate.last_name),
      subtitle: candidate.email || candidate.status || "Candidate",
      href: `/candidates/${candidate.id}`,
    })),
    ...jobs.slice(0, 5).map<SearchResult>((job) => ({
      group: "Jobs",
      id: job.id,
      title: job.job_title || "Untitled job",
      subtitle: job.company_name || job.location || "Job",
      href: `/jobs/${job.id}`,
    })),
    ...placementResults,
  ];
}
