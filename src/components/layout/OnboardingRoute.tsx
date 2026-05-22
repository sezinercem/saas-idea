import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAgency } from "../../hooks/useAgency";

export function OnboardingRoute({ children }: { children: ReactNode }) {
  const { agency, isAgencyLoading } = useAgency();

  if (isAgencyLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Loading agency...
      </div>
    );
  }

  if (!agency?.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
