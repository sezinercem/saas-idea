import { useContext } from "react";
import { AgencyContext } from "../context/agency-context";

export function useAgency() {
  const context = useContext(AgencyContext);

  if (!context) {
    throw new Error("useAgency must be used within AgencyProvider");
  }

  return context;
}
