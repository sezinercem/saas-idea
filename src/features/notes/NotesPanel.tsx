import { Send } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAgency } from "../../hooks/useAgency";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { formatDate } from "../../lib/format";
import { addNote, listNotes } from "../../lib/collaboration";
import type { Note } from "../../types/agency";

export function NotesPanel({ entityId, entityType }: { entityId: string; entityType: string }) {
  const { agency } = useAgency();
  const { user } = useAuth();
  const { notify } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!agency) return;
    queueMicrotask(async () => {
      setIsLoading(true);
      try {
        setNotes(await listNotes(agency.id, entityType, entityId));
      } catch (error) {
        notify(error instanceof Error ? error.message : "Unable to load notes.", "error");
      } finally {
        setIsLoading(false);
      }
    });
  }, [agency, entityId, entityType, notify]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!agency || !user || !content.trim()) return;

    const note = await addNote(agency.id, user.id, entityType, entityId, content.trim());
    setNotes((current) => [note, ...current]);
    setContent("");
    notify("Note added.", "success");
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold">Notes</h2>
      <form className="mt-4 flex gap-3" onSubmit={handleSubmit}>
        <input
          className="h-11 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-800 dark:bg-slate-950"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Add an internal note"
        />
        <Button type="submit">
          <Send className="size-4" />
        </Button>
      </form>
      <div className="mt-5 space-y-3">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : notes.length ? (
          notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-sm leading-6">{note.content}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{formatDate(note.created_at)}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No notes yet.</p>
        )}
      </div>
    </Card>
  );
}
