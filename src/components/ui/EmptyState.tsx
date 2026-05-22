import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "./Card";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
};

export function EmptyState({ action, body, icon: Icon, title }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100">
        <Icon className="size-6" />
      </span>
      <h2 className="mt-5 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </Card>
  );
}
