import { FileText, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAgency } from "../../hooks/useAgency";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { formatDate } from "../../lib/format";
import { deleteDocument, listDocuments, uploadDocument } from "../../lib/collaboration";
import type { DocumentRecord } from "../../types/agency";

export function DocumentsPanel({ entityId, entityType }: { entityId: string; entityType: "candidate" | "placement" }) {
  const { agency } = useAgency();
  const { user } = useAuth();
  const { notify } = useToast();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!agency) return;
    queueMicrotask(async () => {
      setIsLoading(true);
      try {
        setDocuments(await listDocuments(agency.id, entityType, entityId));
      } catch (error) {
        notify(error instanceof Error ? error.message : "Unable to load documents.", "error");
      } finally {
        setIsLoading(false);
      }
    });
  }, [agency, entityId, entityType, notify]);

  const handleUpload = async (file: File | undefined) => {
    if (!file || !agency || !user) return;
    const document = await uploadDocument(agency.id, user.id, entityType, entityId, file);
    setDocuments((current) => [document, ...current]);
    notify("Document uploaded.", "success");
  };

  const handleDelete = async (document: DocumentRecord) => {
    await deleteDocument(document);
    setDocuments((current) => current.filter((item) => item.id !== document.id));
    notify("Document deleted.", "success");
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Documents</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Supporting safer recruitment files are stored privately in Supabase Storage.</p>
        </div>
        <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700">
          <Upload className="size-4" />
          Upload
          <input className="hidden" type="file" onChange={(event) => handleUpload(event.target.files?.[0])} />
        </label>
      </div>
      <div className="mt-5 space-y-3">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : documents.length ? (
          documents.map((document) => (
            <div key={document.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="size-5 shrink-0 text-brand-600 dark:text-brand-100" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{document.file_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(document.created_at)}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => handleDelete(document)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No documents uploaded yet.</p>
        )}
      </div>
    </Card>
  );
}
