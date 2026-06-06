import { Building2, Clipboard, ExternalLink, MailPlus, Plus, School2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Select } from "../../components/forms/Select";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAgency } from "../../hooks/useAgency";
import { useToast } from "../../hooks/useToast";
import { formatDate } from "../../lib/format";
import {
  createAgencySchool,
  createSchoolInvite,
  listAgencySchoolInvites,
  listAgencySchools,
  listAgencySchoolUsers,
} from "../../lib/schoolPortal";
import type { School, SchoolInvite, SchoolUser, SchoolUserRole } from "../../types/operations";

const schoolRoles: SchoolUserRole[] = ["School Admin", "Business Manager", "Cover Manager", "Department Lead"];

export function SchoolsPage() {
  const { agency, role } = useAgency();
  const { notify } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [invites, setInvites] = useState<SchoolInvite[]>([]);
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [inviteSchool, setInviteSchool] = useState<School | null>(null);
  const [createdInviteLink, setCreatedInviteLink] = useState("");
  const canManage = role === "owner" || role === "admin" || role === "recruiter";

  const loadSchools = useCallback(async () => {
    if (!agency) return;
    setIsLoading(true);
    try {
      const [schoolRows, inviteRows, userRows] = await Promise.all([
        listAgencySchools(agency.id),
        listAgencySchoolInvites(agency.id),
        listAgencySchoolUsers(agency.id),
      ]);
      setSchools(schoolRows);
      setInvites(inviteRows);
      setUsers(userRows);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load schools.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [agency, notify]);

  useEffect(() => {
    queueMicrotask(() => {
      loadSchools();
    });
  }, [loadSchools]);

  const inviteCounts = useMemo(() => {
    return invites.reduce<Record<string, number>>((acc, invite) => {
      if (!invite.used_at && new Date(invite.expires_at) > new Date()) acc[invite.school_id] = (acc[invite.school_id] ?? 0) + 1;
      return acc;
    }, {});
  }, [invites]);

  const activeUsers = useMemo(() => {
    return users.reduce<Record<string, number>>((acc, user) => {
      if (user.portal_status === "Active") acc[user.school_id] = (acc[user.school_id] ?? 0) + 1;
      return acc;
    }, {});
  }, [users]);

  const addSchool = async (input: Pick<School, "name" | "location" | "contact_name" | "contact_email">) => {
    if (!agency) return;
    const school = await createAgencySchool(agency.id, input);
    setIsSchoolModalOpen(false);
    setInviteSchool(school);
    await loadSchools();
    notify("School added. You can now invite their portal user.", "success");
  };

  const inviteUser = async (email: string, inviteRole: SchoolUserRole) => {
    if (!inviteSchool) return;
    const invite = await createSchoolInvite(inviteSchool.id, email, inviteRole);
    setCreatedInviteLink(invite.link);
    await loadSchools();
    notify("School invite created. Send the link to the school contact.", "success");
  };

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(createdInviteLink);
    notify("Invite link copied.", "success");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Schools</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">School CRM and portal access</h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
            Add schools, create invite-only school portal logins, and keep each school tied to this agency workspace.
          </p>
        </div>
        <Button disabled={!canManage} onClick={() => setIsSchoolModalOpen(true)}>
          <Plus className="size-4" />
          Add school
        </Button>
      </div>

      <Alert className="mt-6" tone="info">
        School users do not self-sign up. Create the school here, then issue an invite link to the school contact.
      </Alert>

      <div className="mt-8">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : schools.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {schools.map((school) => (
              <Card key={school.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-100">
                      <School2 className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold">{school.name}</h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{school.location || "No location added"}</p>
                    </div>
                  </div>
                  <Badge tone={activeUsers[school.id] ? "green" : "amber"}>
                    {activeUsers[school.id] ? `${activeUsers[school.id]} active` : "No login yet"}
                  </Badge>
                </div>

                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <Info label="Contact" value={school.contact_name || "Not added"} />
                  <Info label="Email" value={school.contact_email || "Not added"} />
                  <Info label="Pending invites" value={String(inviteCounts[school.id] ?? 0)} />
                  <Info label="Added" value={formatDate(school.created_at)} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button disabled={!canManage} onClick={() => setInviteSchool(school)}>
                    <MailPlus className="size-4" />
                    Invite school user
                  </Button>
                  <Button variant="outline" onClick={() => window.open("/school/login", "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="size-4" />
                    School login
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            title="No schools yet"
            body="Add your first school, then invite their cover manager or business manager into the school portal."
            action={<Button disabled={!canManage} onClick={() => setIsSchoolModalOpen(true)}>Add school</Button>}
          />
        )}
      </div>

      <Card className="mt-6">
        <div className="flex items-center gap-2">
          <MailPlus className="size-5 text-brand-600 dark:text-brand-100" />
          <h2 className="text-lg font-semibold">Recent school invitations</h2>
        </div>
        <div className="mt-5 space-y-3">
          {invites.slice(0, 6).map((invite) => (
            <div key={invite.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <div>
                <p className="font-semibold">{invite.email}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {schoolName(invite.school_id, schools)} · {invite.role} · Expires {formatDate(invite.expires_at)}
                </p>
              </div>
              <Badge tone={invite.used_at ? "green" : new Date(invite.expires_at) < new Date() ? "red" : "blue"}>
                {invite.used_at ? "Used" : new Date(invite.expires_at) < new Date() ? "Expired" : "Pending"}
              </Badge>
            </div>
          ))}
          {!invites.length ? <p className="text-sm text-slate-500 dark:text-slate-400">No school portal invites have been created yet.</p> : null}
        </div>
      </Card>

      <Modal isOpen={isSchoolModalOpen} onClose={() => setIsSchoolModalOpen(false)} title="Add school" description="Create the school first, then invite a school portal user.">
        <SchoolForm onCancel={() => setIsSchoolModalOpen(false)} onSubmit={addSchool} />
      </Modal>

      <Modal
        isOpen={Boolean(inviteSchool)}
        onClose={() => {
          setInviteSchool(null);
          setCreatedInviteLink("");
        }}
        title={createdInviteLink ? "School invite ready" : "Invite school user"}
        description={inviteSchool ? `Create a portal login invite for ${inviteSchool.name}.` : undefined}
      >
        {createdInviteLink ? (
          <div className="space-y-4">
            <Alert tone="success">Invite created. Send this secure link to the school contact.</Alert>
            <Input label="Invite link" readOnly value={createdInviteLink} />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCreatedInviteLink("")}>Create another</Button>
              <Button onClick={copyInviteLink}>
                <Clipboard className="size-4" />
                Copy link
              </Button>
            </div>
          </div>
        ) : (
          <SchoolInviteForm defaultEmail={inviteSchool?.contact_email ?? ""} onCancel={() => setInviteSchool(null)} onSubmit={inviteUser} />
        )}
      </Modal>
    </div>
  );
}

function SchoolForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (input: Pick<School, "name" | "location" | "contact_name" | "contact_email">) => Promise<void>;
}) {
  const [form, setForm] = useState({ name: "", location: "", contact_name: "", contact_email: "" });
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({
        name: form.name,
        location: form.location || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Input label="School name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      <Input label="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
      <Input label="Main contact" value={form.contact_name} onChange={(event) => setForm({ ...form, contact_name: event.target.value })} />
      <Input label="Contact email" type="email" value={form.contact_email} onChange={(event) => setForm({ ...form, contact_email: event.target.value })} />
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>{isSaving ? "Adding..." : "Add school"}</Button>
      </div>
    </form>
  );
}

function SchoolInviteForm({
  defaultEmail,
  onCancel,
  onSubmit,
}: {
  defaultEmail: string;
  onCancel: () => void;
  onSubmit: (email: string, role: SchoolUserRole) => Promise<void>;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [role, setRole] = useState<SchoolUserRole>("Cover Manager");
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
      <Input label="School user email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Select label="Portal role" value={role} options={schoolRoles.map((value) => ({ label: value, value }))} onChange={(event) => setRole(event.target.value as SchoolUserRole)} />
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>{isSaving ? "Creating..." : "Create invite"}</Button>
      </div>
    </form>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}

function schoolName(schoolId: string, schools: School[]) {
  return schools.find((school) => school.id === schoolId)?.name ?? "School";
}
