export function fullName(firstName?: string | null, lastName?: string | null) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Unnamed";
}

export function formatDate(value?: string | null) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
