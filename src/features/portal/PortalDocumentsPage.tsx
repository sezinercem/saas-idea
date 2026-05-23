import { ExternalLink, Files } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { usePortal } from "../../hooks/usePortal";
import { useToast } from "../../hooks/useToast";
import { effectiveComplianceStatus, listCandidateCompliance, signedComplianceDocumentUrl } from "../../lib/compliance";
import { formatDate } from "../../lib/format";
import { statusTone } from "../../lib/status";
import type { CandidateComplianceItem } from "../../types/agency";

export function PortalDocumentsPage() {
  const { session } = usePortal();
  const { notify } = useToast();
  const [items, setItems] = useState<CandidateComplianceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const load = useCallback(async () => {
    if (!session) return;
    setItems((await listCandidateCompliance(session.agency.id, session.candidate.id)).filter((item) => item.documents));
    setIsLoading(false);
  }, [session]);
  useEffect(() => { queueMicrotask(() => load()); }, [load]);

  const open = async (item: CandidateComplianceItem) => {
    try {
      if (item.documents) window.open(await signedComplianceDocumentUrl(item.documents.file_path), "_blank", "noopener,noreferrer");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to open file.", "error");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">My Documents</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">Your privately stored safer recruitment evidence and review status.</p>
      <div className="mt-6 space-y-3">
        {isLoading ? <Skeleton className="h-36 w-full" /> : items.length ? items.map((item) => (
          <Card key={item.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Files className="mt-1 size-5 text-brand-600" />
              <div>
                <p className="font-semibold">{item.compliance_types?.name}</p>
                <p className="mt-1 text-sm text-slate-500">{item.documents?.file_name} · expiry {formatDate(item.expiry_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={statusTone(effectiveComplianceStatus(item))}>{effectiveComplianceStatus(item)}</Badge>
              <Button variant="outline" className="h-10 px-3" onClick={() => open(item)}><ExternalLink className="size-4" />Open</Button>
            </div>
          </Card>
        )) : <EmptyState icon={Files} title="No documents uploaded" body="Use My Compliance to upload required evidence for review." />}
      </div>
    </div>
  );
}
