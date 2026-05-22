import type { ReactNode } from "react";
import { Alert } from "../ui/Alert";
import { useAgency } from "../../hooks/useAgency";
import type { AgencyRole } from "../../types/agency";

export function RoleGuard({ allowed, children }: { allowed: AgencyRole[]; children: ReactNode }) {
  const { role } = useAgency();

  if (!role || !allowed.includes(role)) {
    return <Alert tone="error">You do not have access to this workspace area.</Alert>;
  }

  return children;
}
