import { useContext } from "react";
import { SchoolPortalContext } from "../context/school-portal-context";

export function useSchoolPortal() {
  const context = useContext(SchoolPortalContext);
  if (!context) throw new Error("useSchoolPortal must be used within SchoolPortalProvider");
  return context;
}
