import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, label, ...props }, ref) => (
  <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
    <span>{label}</span>
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white",
        className,
      )}
      {...props}
    />
  </label>
));
