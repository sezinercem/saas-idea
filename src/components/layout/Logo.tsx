import { BriefcaseBusiness } from "lucide-react";
import { Link } from "react-router-dom";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-slate-950 dark:text-white">
      <span className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white">
        <BriefcaseBusiness className="size-5" />
      </span>
      <span className="text-base font-bold tracking-tight">RecruitFlow</span>
    </Link>
  );
}
