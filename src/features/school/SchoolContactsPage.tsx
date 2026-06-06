import { Plus, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Select } from "../../components/forms/Select";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { useSchoolPortal } from "../../hooks/useSchoolPortal";
import { useToast } from "../../hooks/useToast";
import { createSchoolContact, listSchoolContacts } from "../../lib/schoolPortal";
import type { SchoolContact, SchoolContactInput } from "../../types/operations";

const roles = ["School Admin", "Business Manager", "Cover Manager", "Department Lead"];

export function SchoolContactsPage() {
  const { session } = useSchoolPortal();
  const { notify } = useToast();
  const [rows, setRows] = useState<SchoolContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      setRows(await listSchoolContacts(session));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load contacts.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify, session]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  const save = async (input: SchoolContactInput) => {
    if (!session) return;
    await createSchoolContact(session, input);
    notify("Contact saved.", "success");
    setIsOpen(false);
    await load();
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Contacts</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">School contacts</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Manage cover managers, department heads, and business managers.</p>
        </div>
        <Button onClick={() => setIsOpen(true)}><Plus className="size-4" />Add contact</Button>
      </div>
      <Card className="mt-8">
        {isLoading ? <Skeleton className="h-56 w-full" /> : rows.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((contact) => (
              <div key={contact.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{contact.name}</p><p className="mt-1 text-sm text-slate-500">{contact.email || "No email"} · {contact.phone || "No phone"}</p></div><Badge>{contact.role}</Badge></div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={UsersRound} title="No contacts yet" body="Add the people your agency should coordinate with." />}
      </Card>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add school contact">
        <ContactForm onCancel={() => setIsOpen(false)} onSubmit={save} />
      </Modal>
    </div>
  );
}

function ContactForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (input: SchoolContactInput) => Promise<void> }) {
  const [form, setForm] = useState<SchoolContactInput>({ name: "", email: "", phone: "", role: "Cover Manager" });
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <Input label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <Input label="Email" type="email" value={form.email ?? ""} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <Input label="Phone" value={form.phone ?? ""} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      <Select label="Role" value={form.role} options={roles.map((value) => ({ label: value, value }))} onChange={(event) => setForm({ ...form, role: event.target.value as SchoolContactInput["role"] })} />
      <div className="flex justify-end gap-3"><Button variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving || !form.name}>{saving ? "Saving..." : "Save contact"}</Button></div>
    </form>
  );
}
