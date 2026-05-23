import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePortal } from "../../hooks/usePortal";

export function PortalRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const { session, isPortalLoading } = usePortal();
  const location = useLocation();

  if (isLoading || isPortalLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading candidate portal...</div>;
  }
  if (!user) return <Navigate to="/portal/login" replace state={{ from: location }} />;
  if (!session) return <Navigate to="/portal/accept" replace />;
  if (session.portalUser.portal_status === "Suspended") return <div className="p-8 text-center">Your portal access is suspended. Contact your agency.</div>;
  return children;
}
