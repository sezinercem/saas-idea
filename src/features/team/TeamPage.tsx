import { MailPlus, RefreshCw, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Select } from "../../components/forms/Select";
import { Badge, type BadgeTone } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAgency } from "../../hooks/useAgency";
import { useToast } from "../../hooks/useToast";
import {
  createTeamInvite,
  listAgencyMembers,
  listTeamInvites,
  removeAgencyMember,
  resendTeamInvite,
  revokeTeamInvite,
  updateAgencyMemberRole,
} from "../../lib/agency";
import { formatDate } from "../../lib/format";
import type { AgencyMemberWithProfile, AgencyRole, TeamInvite } from "../../types/agency";

const roles: AgencyRole[] = ["owner", "admin", "recruiter", "compliance"];
const roleOptions = roles.map((role) => ({ label: roleLabel(role), value: role }));
const inviteRoleOptions = roles.filter((role) => role !== "owner").map((role) => ({ label: roleLabel(role), value: role }));

export function TeamPage() {
  const { agency, role } = useAgency();
  const { notify } = useToast();
  const [members, setMembers] = useState<AgencyMemberWithProfile[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const canManage = role === "owner" || role === "admin";

  const loadTeam = useCallback(async () => {
    if (!agency) return;
    setIsLoading(true);
    try {
      const [memberRows, inviteRows] = await Promise.all([listAgencyMembers(agency.id), listTeamInvites(agency.id)]);
      setMembers(memberRows);
      setInvites(inviteRows);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load team.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [agency, notify]);

  useEffect(() => {
    queueMicrotask(() => {
      loadTeam();
    });
  }, [loadTeam]);

  const handleRoleChange = async (memberId: string, nextRole: AgencyRole) => {
    await updateAgencyMemberRole(memberId, nextRole);
    setMembers((current) => current.map((member) => (member.id === memberId ? { ...member, role: nextRole } : member)));
    notify("Role updated.", "success");
  };

  const handleRemove = async (member: AgencyMemberWithProfile) => {
    if (!window.confirm(`Remove ${member.profiles?.email ?? "this member"} from the agency?`)) return;
    await removeAgencyMember(member.id);
    setMembers((current) => current.filter((item) => item.id !== member.id));
    notify("Team member removed.", "success");
  };

  const handleResend = async (invite: TeamInvite) => {
    await resendTeamInvite(invite.id);
    await loadTeam();
    notify("Team invite marked for resend.", "success");
  };

  const handleRevoke = async (invite: TeamInvite) => {
    await revokeTeamInvite(invite.id);
    await loadTeam();
    notify("Team invite revoked.", "success");
  };

  const invite = async (email: string, inviteRole: Exclude<AgencyRole, "owner">) => {
    if (!agency) return;
    await createTeamInvite(agency.id, email, inviteRole);
    await loadTeam();
    setIsInviteOpen(false);
    notify("Team invite created.", "success");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Team</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Agency members</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Manage recruiter, admin, and compliance access for your education workspace.</p>
        </div>
        <Button disabled={!canManage} onClick={() => setIsInviteOpen(true)}>
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
              <div key={member.id} className="grid gap-4 px-6 py-4 md:grid-cols-[1fr_160px_190px_120px] md:items-center">
                <div>
                  <p className="font-semibold">{member.profiles?.full_name || member.profiles?.email || "Agency user"}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{member.profiles?.email || "No profile email"}</p>
                </div>
                <Badge tone={roleTone(member.role)}>{roleLabel(member.role)}</Badge>
                {canManage && member.role !== "owner" ? (
                  <Select label="Change role" value={member.role} options={roleOptions.filter((option) => option.value !== "owner")} onChange={(event) => handleRoleChange(member.id, event.target.value as AgencyRole)} />
                ) : (
                  <span className="text-sm text-slate-500 dark:text-slate-400">Protected</span>
                )}
                <Button variant="outline" disabled={!canManage || member.role === "owner"} onClick={() => handleRemove(member)}>
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
          <MailPlus className="size-5 text-brand-600 dark:text-brand-100" />
          <h2 className="text-lg font-semibold">Pending invitations</h2>
        </div>
        <div className="mt-5 space-y-3">
          {invites.length ? invites.map((invite) => (
            <div key={invite.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <div>
                <p className="font-semibold">{invite.email}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {roleLabel(invite.role)} · Expires {formatDate(invite.expires_at)} · Last sent {formatDate(invite.last_sent_at)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={invite.status === "Pending" ? "blue" : invite.status === "Accepted" ? "green" : "amber"}>{invite.status}</Badge>
                <Button variant="outline" className="h-9 px-3" disabled={!canManage || invite.status !== "Pending"} onClick={() => handleResend(invite)}>
                  <RefreshCw className="size-4" />
                  Resend
                </Button>
                <Button variant="outline" className="h-9 px-3" disabled={!canManage || invite.status !== "Pending"} onClick={() => handleRevoke(invite)}>
                  Revoke
                </Button>
              </div>
            </div>
          )) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No pending team invitations.</p>
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-emerald-500" />
          <h2 className="text-lg font-semibold">Role model</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Owners and admins manage agency settings and team access. Recruiters work candidates, jobs, applications, shifts, and placements. Compliance users focus on clearance review and documents.
        </p>
      </Card>

      <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite team member" size="md">
        <InviteForm onCancel={() => setIsInviteOpen(false)} onSubmit={invite} />
      </Modal>
    </div>
  );
}

function InviteForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (email: string, role: Exclude<AgencyRole, "owner">) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<AgencyRole, "owner">>("recruiter");
  const [isSaving, setIsSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit(email, role);
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Select label="Role" value={role} options={inviteRoleOptions} onChange={(event) => setRole(event.target.value as Exclude<AgencyRole, "owner">)} />
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>{isSaving ? "Inviting..." : "Create invite"}</Button>
      </div>
    </form>
  );
}

function roleLabel(role: AgencyRole) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "compliance") return "Compliance";
  return "Recruiter";
}

function roleTone(role: AgencyRole): BadgeTone {
  if (role === "owner") return "green";
  if (role === "admin") return "blue";
  if (role === "compliance") return "amber";
  return "slate";
}
