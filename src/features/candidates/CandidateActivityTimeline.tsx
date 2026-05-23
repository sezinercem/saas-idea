import { Activity } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAgency } from "../../hooks/useAgency";
import { useToast } from "../../hooks/useToast";
import { listEntityActivity } from "../../lib/collaboration";
import { formatDate } from "../../lib/format";
import type { ActivityLog } from "../../types/agency";

export function CandidateActivityTimeline({ candidateId }: { candidateId: string }) {
  const { agency } = useAgency();
  const { notify } = useToast();
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadActivity = useCallback(async () => {
    if (!agency) return;
    setIsLoading(true);
    try {
      setActivity(await listEntityActivity(agency.id, "candidate", candidateId));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load clearance activity.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [agency, candidateId, notify]);

  useEffect(() => {
    queueMicrotask(() => {
      loadActivity();
    });
  }, [loadActivity]);

  return (
    <Card>
      <h2 className="text-lg font-semibold">Candidate activity timeline</h2>
      {isLoading ? (
        <Skeleton className="mt-5 h-24 w-full" />
      ) : activity.length ? (
        <div className="mt-5 space-y-4">
          {activity.map((log) => (
            <div key={log.id} className="flex gap-3">
              <span className="mt-1 size-2.5 shrink-0 rounded-full bg-brand-600" />
              <div>
                <p className="text-sm font-semibold">{activityLabel(log.action)}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDate(log.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState icon={Activity} title="No clearance activity" body="Uploads and review decisions will appear here." />
        </div>
      )}
    </Card>
  );
}

function activityLabel(action: string) {
  const labels: Record<string, string> = {
    "compliance.document_uploaded": "Clearance document uploaded",
    "compliance.document_approved": "Clearance document approved",
    "compliance.document_rejected": "Replacement document requested",
    "compliance.document_deleted": "Clearance document removed",
    "compliance.item_expired": "Clearance item expired",
    "placement.blocked_compliance": "School placement blocked by clearance",
    "placement.compliance_override_used": "School placement clearance override authorised",
    "candidate.created": "Candidate created",
    "candidate.updated": "Candidate updated",
  };
  return labels[action] ?? action.replaceAll(".", " ");
}
