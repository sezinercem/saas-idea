import { useState, type FormEvent } from "react";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { useAgency } from "../hooks/useAgency";
import { updateAgencyBranding } from "../lib/agency";

export function AccountPage() {
  const { isConfigured, profile, updateProfile, user } = useAuth();
  const { agency, refreshAgency } = useAgency();
  const [fullName, setFullName] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColour, setPrimaryColour] = useState<string | null>(null);
  const resolvedFullName = fullName ?? profile?.full_name ?? "";
  const resolvedCompanyName = companyName ?? profile?.company_name ?? "";
  const resolvedLogoUrl = logoUrl ?? agency?.logo_url ?? "";
  const resolvedPrimaryColour = primaryColour ?? agency?.primary_colour ?? "#1d4ed8";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    setIsSaving(true);
    try {
      await updateProfile({ full_name: resolvedFullName, company_name: resolvedCompanyName });
      setMessage("Profile saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBrandingSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!agency) return;
    setError("");
    setMessage("");
    setIsSaving(true);
    try {
      await updateAgencyBranding(agency.id, { logo_url: resolvedLogoUrl, primary_colour: resolvedPrimaryColour });
      await refreshAgency();
      setMessage("Candidate portal branding saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save branding.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1fr_380px]">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Account</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Profile settings</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Store the basic workspace profile fields in Supabase.
        </p>

        <Card className="mt-8">
          {!isConfigured ? (
            <Alert tone="info">Add Supabase environment variables before profile updates can run.</Alert>
          ) : null}
          {message ? (
            <Alert className="mt-4" tone="success">
              {message}
            </Alert>
          ) : null}
          {error ? (
            <Alert className="mt-4" tone="error">
              {error}
            </Alert>
          ) : null}

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <Input label="Email" name="email" value={user?.email ?? ""} disabled />
            <Input
              label="User name"
              name="full_name"
              value={resolvedFullName}
              placeholder="Alex Morgan"
              onChange={(event) => setFullName(event.target.value)}
            />
            <Input
              label="Company name"
              name="company_name"
              value={resolvedCompanyName}
              placeholder="Northstar Staffing"
              onChange={(event) => setCompanyName(event.target.value)}
            />
            <Button type="submit" disabled={!isConfigured || isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </Card>
        <Card className="mt-6">
          <h2 className="text-lg font-semibold">Candidate portal branding</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Candidates see this agency identity when viewing school opportunities and clearance.</p>
          <form className="mt-5 space-y-4" onSubmit={handleBrandingSubmit}>
            <Input label="Logo URL" value={resolvedLogoUrl} placeholder="https://..." onChange={(event) => setLogoUrl(event.target.value)} />
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input label="Primary colour" value={resolvedPrimaryColour} placeholder="#1d4ed8" onChange={(event) => setPrimaryColour(event.target.value)} />
              </div>
              <span className="mb-1 size-10 rounded-lg border border-slate-200" style={{ backgroundColor: resolvedPrimaryColour }} />
            </div>
            <Button type="submit" disabled={!agency || isSaving}>{isSaving ? "Saving..." : "Save portal branding"}</Button>
          </form>
        </Card>
      </section>

      <aside className="space-y-6">
        <Card>
          <p className="text-sm font-semibold text-brand-600 dark:text-brand-100">Subscription</p>
          <h2 className="mt-2 text-xl font-semibold">Starter trial</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Placeholder subscription panel for billing, usage, and plan controls.
          </p>
          <div className="mt-5 rounded-lg bg-slate-100 p-4 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Billing integration not connected yet.
          </div>
        </Card>
      </aside>
    </div>
  );
}
