import type { BadgeTone } from "../components/ui/Badge";

export function statusTone(status?: string | null): BadgeTone {
  const normalized = status?.toLowerCase() ?? "";

  if (["active", "placed", "confirmed", "open"].includes(normalized)) return "green";
  if (["new", "screening", "pending"].includes(normalized)) return "blue";
  if (["paused", "draft", "interviewing"].includes(normalized)) return "amber";
  if (["closed", "rejected", "inactive", "cancelled"].includes(normalized)) return "red";

  return "slate";
}
