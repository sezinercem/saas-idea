import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { SchoolPortalContext, type SchoolPortalContextValue } from "./school-portal-context";
import { useAuth } from "../hooks/useAuth";
import { getSchoolPortalSession } from "../lib/schoolPortal";
import type { SchoolPortalSession } from "../types/operations";

export function SchoolPortalProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [session, setSession] = useState<SchoolPortalSession | null>(null);
  const [isSchoolPortalLoading, setIsSchoolPortalLoading] = useState(true);

  const refreshSchoolPortal = useCallback(async () => {
    if (!user) {
      setSession(null);
      setIsSchoolPortalLoading(false);
      return;
    }
    setIsSchoolPortalLoading(true);
    try {
      setSession(await getSchoolPortalSession(user.id));
    } finally {
      setIsSchoolPortalLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading) queueMicrotask(() => refreshSchoolPortal());
  }, [isLoading, refreshSchoolPortal]);

  const value = useMemo<SchoolPortalContextValue>(
    () => ({ session, isSchoolPortalLoading, refreshSchoolPortal }),
    [isSchoolPortalLoading, refreshSchoolPortal, session],
  );
  return <SchoolPortalContext.Provider value={value}>{children}</SchoolPortalContext.Provider>;
}
