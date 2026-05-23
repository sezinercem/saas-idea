import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAgency } from "../../hooks/useAgency";
import { usePortal } from "../../hooks/usePortal";

export function OnboardingRoute({ children }: { children: ReactNode }) {
  const { agency, isAgencyLoading } = useAgency();
  const { session, isPortalLoading } = usePortal();

  if (isAgencyLoading || isPortalLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Loading agency...
      </div>
    );
  }

  if (session) {
    return <Navigate to="/portal" replace />;
  }

  if (!agency?.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
