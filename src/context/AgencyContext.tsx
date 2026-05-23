import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AgencyContext, type AgencyContextValue } from "./agency-context";
import { useAuth } from "../hooks/useAuth";
import { createAgencyForExistingUser, getCurrentAgency } from "../lib/agency";
import { isActiveCandidatePortalUser } from "../lib/portal";
import type { Agency, AgencyMember } from "../types/agency";

export function AgencyProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [membership, setMembership] = useState<AgencyMember | null>(null);
  const [isAgencyLoading, setIsAgencyLoading] = useState(true);

  const refreshAgency = useCallback(async () => {
    if (!user) {
      setAgency(null);
      setMembership(null);
      setIsAgencyLoading(false);
      return;
    }

    setIsAgencyLoading(true);
    try {
      const isPortalUser = Boolean(user.user_metadata?.candidate_portal) || (await isActiveCandidatePortalUser(user.id));
      if (isPortalUser) {
        setAgency(null);
        setMembership(null);
        return;
      }
      const result = await getCurrentAgency(user.id);
      if (!result.agency && user.email) {
        const createdAgency = await createAgencyForExistingUser(user.id, user.email);
        setAgency(createdAgency);
        const refreshed = await getCurrentAgency(user.id);
        setMembership(refreshed.membership);
      } else {
        setAgency(result.agency);
        setMembership(result.membership);
      }
    } finally {
      setIsAgencyLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isLoading) return;
    queueMicrotask(() => {
      refreshAgency();
    });
  }, [isLoading, refreshAgency]);

  const value = useMemo<AgencyContextValue>(
    () => ({
      agency,
      membership,
      role: membership?.role ?? null,
      isAgencyLoading,
      refreshAgency,
    }),
    [agency, isAgencyLoading, membership, refreshAgency],
  );

  return <AgencyContext.Provider value={value}>{children}</AgencyContext.Provider>;
}
