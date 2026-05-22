import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Array<{ label: string; value: string }>;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, label, options, ...props }, ref) => (
  <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
    <span>{label}</span>
    <select
      ref={ref}
      className={cn(
        "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white",
        className,
      )}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
));
