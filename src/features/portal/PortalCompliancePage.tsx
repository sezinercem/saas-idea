import { ExternalLink, FileUp, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { usePortal } from "../../hooks/usePortal";
import { useToast } from "../../hooks/useToast";
import { calculateClearance, effectiveComplianceStatus, listCandidateCompliance, signedComplianceDocumentUrl } from "../../lib/compliance";
import { formatDate } from "../../lib/format";
import { submitPortalComplianceDocument, subscribePortalUpdates } from "../../lib/portal";
import { statusTone } from "../../lib/status";
import type { CandidateComplianceItem } from "../../types/agency";

export function PortalCompliancePage() {
  const { session } = usePortal();
  const { notify } = useToast();
  const [items, setItems] = useState<CandidateComplianceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const clearance = session ? calculateClearance(session.candidate.id, items) : null;

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setItems(await listCandidateCompliance(session.agency.id, session.candidate.id));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load compliance checklist.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify, session]);

  useEffect(() => {
    queueMicrotask(() => load());
    return subscribePortalUpdates(() => load());
  }, [load]);

  const upload = async (item: CandidateComplianceItem, file?: File) => {
    if (!session || !file) return;
    try {
      await submitPortalComplianceDocument(session, item, file);
      notify("Document uploaded and queued for agency review.", "success");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Upload failed.", "error");
    }
  };

  const open = async (item: CandidateComplianceItem) => {
    if (!item.documents) return;
    window.open(await signedComplianceDocumentUrl(item.documents.file_path), "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-brand-600 dark:text-brand-100">Safer recruitment</p>
          <h1 className="mt-2 text-3xl font-bold">My Compliance</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Upload DBS, safeguarding and Right to Work evidence for agency review.</p>
        </div>
        <Badge tone={statusTone(clearance?.overallStatus)}>{clearance?.overallStatus || "Loading"}</Badge>
      </div>
      {clearance?.overallStatus !== "Cleared" ? (
        <Alert className="mt-6" tone="info">Complete your compliance before applying for opportunities.</Alert>
      ) : null}
      <Card className="mt-6 p-0">
        {isLoading ? <div className="p-6"><Skeleton className="h-52 w-full" /></div> : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {items.map((item) => {
              const status = effectiveComplianceStatus(item);
              return (
                <div key={item.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-brand-600" />
                        <p className="font-semibold">{item.compliance_types?.name}</p>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{item.compliance_types?.description}</p>
                    </div>
                    <Badge tone={statusTone(status)}>{status}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <p><span className="text-slate-500">Expiry: </span>{formatDate(item.expiry_date)}</p>
                    <p><span className="text-slate-500">Verification: </span>{item.verification_status}</p>
                    <p><span className="text-slate-500">Document: </span>{item.documents?.file_name || "Not attached"}</p>
                  </div>
                  {item.verification_warnings.length ? <Alert className="mt-4" tone="error">{item.verification_warnings.join(" ")}</Alert> : null}
                  {status === "Rejected" && item.rejection_reason ? <Alert className="mt-4" tone="error">{item.rejection_reason}</Alert> : null}
                  <div className="mt-4 flex gap-2">
                    {item.compliance_types?.requires_document_upload !== false && status !== "Pending Review" ? (
                      <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white">
                        <FileUp className="size-4" />{item.documents ? "Replace document" : "Upload document"}
                        <input type="file" className="hidden" onChange={(event) => upload(item, event.target.files?.[0])} />
                      </label>
                    ) : status === "Pending Review" ? <p className="text-sm text-slate-500">Awaiting agency review</p> : null}
                    {item.documents ? <Button variant="outline" className="h-10 px-3" onClick={() => open(item)}><ExternalLink className="size-4" />View</Button> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
