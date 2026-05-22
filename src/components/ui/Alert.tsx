import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type AlertTone = "error" | "success" | "info";

const tones: Record<AlertTone, string> = {
  error: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200",
};

export function Alert({ className, tone = "info", ...props }: HTMLAttributes<HTMLDivElement> & { tone?: AlertTone }) {
  return <div className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone], className)} {...props} />;
}
