import { MailPlus, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Select } from "../../components/forms/Select";
import { Badge, type BadgeTone } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAgency } from "../../hooks/useAgency";
import { useToast } from "../../hooks/useToast";
import { listAgencyMembers, updateAgencyMemberRole } from "../../lib/agency";
import type { AgencyMemberWithProfile, AgencyRole } from "../../types/agency";

const roles: AgencyRole[] = ["owner", "admin", "recruiter", "compliance"];
const roleOptions = roles.map((role) => ({ label: role, value: role }));

export function TeamPage() {
  const { agency, role } = useAgency();
  const { notify } = useToast();
  const [members, setMembers] = useState<AgencyMemberWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!agency) return;
    queueMicrotask(async () => {
      setIsLoading(true);
      try {
        setMembers(await listAgencyMembers(agency.id));
      } catch (error) {
        notify(error instanceof Error ? error.message : "Unable to load team.", "error");
      } finally {
        setIsLoading(false);
      }
    });
  }, [agency, notify]);

  const canManage = role === "owner" || role === "admin";

  const handleRoleChange = async (memberId: string, nextRole: AgencyRole) => {
    await updateAgencyMemberRole(memberId, nextRole);
    setMembers((current) => current.map((member) => (member.id === memberId ? { ...member, role: nextRole } : member)));
    notify("Role updated.", "success");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Team</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Agency members</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Manage access and roles for your recruitment workspace.</p>
        </div>
        <Button onClick={() => notify("Team invites are coming soon.", "info")}>
          <MailPlus className="size-4" />
          Invite user
        </Button>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : members.length ? (
          <Card className="divide-y divide-slate-200 p-0 dark:divide-slate-800">
            {members.map((member) => (
              <div key={member.id} className="grid gap-4 px-6 py-4 md:grid-cols-[1fr_180px_120px] md:items-center">
                <div>
                  <p className="font-semibold">{member.profiles?.full_name || member.profiles?.email || "Agency user"}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{member.profiles?.email}</p>
                </div>
                {canManage && member.role !== "owner" ? (
                  <Select label="Role" value={member.role} options={roleOptions} onChange={(event) => handleRoleChange(member.id, event.target.value as AgencyRole)} />
                ) : (
                  <Badge tone={roleTone(member.role)}>{member.role}</Badge>
                )}
                <Button variant="outline" disabled={!canManage || member.role === "owner"} onClick={() => notify("Member removal is coming soon.", "info")}>
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState icon={UsersRound} title="No team members yet" body="Invite teammates to collaborate on candidates, jobs, placements, and compliance." />
        )}
      </div>

      <Card className="mt-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-emerald-500" />
          <h2 className="text-lg font-semibold">Role model</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Owners and admins can manage agency records. Recruiters can work candidates, jobs, and placements. Compliance users focus on checks and documents.
        </p>
      </Card>
    </div>
  );
}

function roleTone(role: AgencyRole): BadgeTone {
  if (role === "owner") return "green";
  if (role === "admin") return "blue";
  if (role === "compliance") return "amber";
  return "slate";
}
