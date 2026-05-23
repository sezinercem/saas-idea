import { createContext } from "react";
import type { CandidatePortalSession } from "../types/portal";

export type PortalContextValue = {
  session: CandidatePortalSession | null;
  isPortalLoading: boolean;
  refreshPortal: () => Promise<void>;
};

export const PortalContext = createContext<PortalContextValue | undefined>(undefined);
