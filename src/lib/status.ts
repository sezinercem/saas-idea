import type { BadgeTone } from "../components/ui/Badge";

export function statusTone(status?: string | null): BadgeTone {
  const normalized = status?.toLowerCase() ?? "";

  if (["active", "placed", "confirmed", "open", "complete", "filled"].includes(normalized)) return "green";
  if (["new", "contacted", "screening", "pending"].includes(normalized)) return "blue";
  if (["paused", "draft", "interviewing", "expiring soon"].includes(normalized)) return "amber";
  if (["closed", "rejected", "inactive", "cancelled", "archived", "missing"].includes(normalized)) return "red";

  return "slate";
}
