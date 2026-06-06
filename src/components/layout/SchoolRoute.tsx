import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSchoolPortal } from "../../hooks/useSchoolPortal";

export function SchoolRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const { session, isSchoolPortalLoading } = useSchoolPortal();
  const location = useLocation();

  if (isLoading || isSchoolPortalLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading school portal...</div>;
  }
  if (!user) return <Navigate to="/school/login" replace state={{ from: location }} />;
  if (!session) return <Navigate to="/school/accept-invite" replace />;
  if (session.schoolUser.portal_status === "Suspended") return <div className="p-8 text-center">Your school portal access is suspended. Contact your agency.</div>;
  return children;
}
