import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { ToastContext, type Toast, type ToastTone } from "./toast-context";

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const tones = {
  success: "border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-200",
  error: "border-red-200 bg-white text-red-700 dark:border-red-900 dark:bg-slate-900 dark:text-red-200",
  info: "border-blue-200 bg-white text-blue-700 dark:border-blue-900 dark:bg-slate-900 dark:text-blue-200",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, tone: ToastTone = "info") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = icons[toast.tone];

          return (
            <div
              key={toast.id}
              className={cn("flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold shadow-lg", tones[toast.tone])}
            >
              <Icon className="size-5 shrink-0" />
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
