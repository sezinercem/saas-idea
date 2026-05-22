import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, id, label, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        <span>{label}</span>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white",
            error && "border-red-400 focus:border-red-500 focus:ring-red-500/10",
            className,
          )}
          {...props}
        />
        {error ? <span className="block text-xs font-medium text-red-600 dark:text-red-400">{error}</span> : null}
      </label>
    );
  },
);
