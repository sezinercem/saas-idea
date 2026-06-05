import { Search, X } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value"> & {
  label: string;
  value: string;
  containerClassName?: string;
  onClear?: () => void;
};

export function SearchField({ className, containerClassName, label, onClear, value, ...props }: SearchFieldProps) {
  return (
    <label className={cn("block text-sm font-medium text-slate-700 dark:text-slate-200", containerClassName)}>
      <span className="mb-2 block">{label}</span>
      <span className="flex h-12 items-center rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10 dark:border-slate-800 dark:bg-slate-950">
        <Search className="mr-3 size-4 shrink-0 text-slate-400" />
        <input
          className={cn(
            "min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500",
            className,
          )}
          type="search"
          value={value}
          {...props}
        />
        {value && onClear ? (
          <button
            type="button"
            aria-label="Clear search"
            className="ml-2 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            onClick={onClear}
          >
            <X className="size-4" />
          </button>
        ) : null}
      </span>
    </label>
  );
}
