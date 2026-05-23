import type { BadgeTone } from "../components/ui/Badge";

export function statusTone(status?: string | null): BadgeTone {
  const normalized = status?.toLowerCase() ?? "";

  if (["active", "placed", "confirmed", "open", "complete", "filled", "approved", "cleared"].includes(normalized)) return "green";
  if (["new", "contacted", "screening", "pending", "uploaded", "pending review"].includes(normalized)) return "blue";
  if (["paused", "draft", "interviewing", "expiring soon"].includes(normalized)) return "amber";
  if (["closed", "rejected", "inactive", "cancelled", "archived", "missing", "expired", "non-compliant"].includes(normalized)) return "red";

  return "slate";
}
