import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const tones = {
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  red: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200",
};

export type BadgeTone = keyof typeof tones;

export function Badge({ className, tone = "slate", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)}
      {...props}
    />
  );
}
