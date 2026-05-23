import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { PortalContext, type PortalContextValue } from "./portal-context";
import { useAuth } from "../hooks/useAuth";
import { getCandidatePortalSession } from "../lib/portal";
import type { CandidatePortalSession } from "../types/portal";

export function PortalProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [session, setSession] = useState<CandidatePortalSession | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(true);

  const refreshPortal = useCallback(async () => {
    if (!user) {
      setSession(null);
      setIsPortalLoading(false);
      return;
    }
    setIsPortalLoading(true);
    try {
      setSession(await getCandidatePortalSession(user.id));
    } finally {
      setIsPortalLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading) queueMicrotask(() => refreshPortal());
  }, [isLoading, refreshPortal]);

  const value = useMemo<PortalContextValue>(() => ({ session, isPortalLoading, refreshPortal }), [isPortalLoading, refreshPortal, session]);
  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}
