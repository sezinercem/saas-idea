import { Building2, Mail, Phone, UserRound } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { usePortal } from "../../hooks/usePortal";
import { fullName } from "../../lib/format";

export function PortalProfilePage() {
  const { session } = usePortal();
  if (!session) return null;
  const candidate = session.candidate;
  const completed = [candidate.first_name, candidate.last_name, candidate.email, candidate.phone].filter(Boolean).length;

  return (
    <div>
      <h1 className="text-3xl font-bold">Profile</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">Your candidate record managed securely by {session.agency.name}.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><UserRound className="size-7" /></span>
            <div>
              <h2 className="text-xl font-semibold">{fullName(candidate.first_name, candidate.last_name)}</h2>
              <p className="text-sm text-slate-500">Education candidate</p>
            </div>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <Detail icon={Mail} label="Email" value={candidate.email || "Not provided"} />
            <Detail icon={Phone} label="Phone" value={candidate.phone || "Not provided"} />
            <Detail icon={Building2} label="Agency" value={session.agency.name} />
          </div>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Profile completion</p>
          <p className="mt-2 text-3xl font-bold">{Math.round((completed / 4) * 100)}%</p>
          <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-2 rounded-full bg-brand-600" style={{ width: `${(completed / 4) * 100}%` }} />
          </div>
          <p className="mt-4 text-sm text-slate-500">Contact your recruiter if your details need updating.</p>
        </Card>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"><Icon className="size-4 text-slate-400" /><p className="mt-3 text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-2 text-sm font-medium">{value}</p></div>;
}
