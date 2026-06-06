import { createContext } from "react";
import type { SchoolPortalSession } from "../types/operations";

export type SchoolPortalContextValue = {
  session: SchoolPortalSession | null;
  isSchoolPortalLoading: boolean;
  refreshSchoolPortal: () => Promise<void>;
};

export const SchoolPortalContext = createContext<SchoolPortalContextValue | null>(null);
