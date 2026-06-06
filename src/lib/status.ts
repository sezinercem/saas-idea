import type { BadgeTone } from "../components/ui/Badge";

export function statusTone(status?: string | null): BadgeTone {
  const normalized = status?.toLowerCase() ?? "";

  if (["active", "available", "placed", "confirmed", "open", "complete", "filled", "approved", "cleared", "paid", "completed", "school confirmed", "candidate confirmed"].includes(normalized)) return "green";
  if (["new", "new requests", "candidate matching", "contacted", "screening", "pending", "uploaded", "pending review", "upcoming", "under review", "submitted", "sent", "partially filled"].includes(normalized)) return "blue";
  if (["paused", "draft", "interviewing", "expiring soon", "due today", "interview requested", "offered", "holiday", "sick", "urgent", "normal"].includes(normalized)) return "amber";
  if (["closed", "rejected", "inactive", "cancelled", "unavailable", "archived", "missing", "expired", "non-compliant", "overdue"].includes(normalized)) return "red";

  return "slate";
}
