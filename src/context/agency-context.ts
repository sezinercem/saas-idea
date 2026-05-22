import { createContext } from "react";
import type { Agency, AgencyMember, AgencyRole } from "../types/agency";

export type AgencyContextValue = {
  agency: Agency | null;
  membership: AgencyMember | null;
  role: AgencyRole | null;
  isAgencyLoading: boolean;
  refreshAgency: () => Promise<void>;
};

export const AgencyContext = createContext<AgencyContextValue | undefined>(undefined);
