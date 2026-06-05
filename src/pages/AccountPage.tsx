import { useState, type FormEvent } from "react";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { useAgency } from "../hooks/useAgency";
import { updateAgencyBranding } from "../lib/agency";

const portalColourPresets = ["#1d4ed8", "#2563eb", "#7c3aed", "#0f766e", "#16a34a", "#f59e0b", "#ef4444", "#e11d48"];

function isHexColour(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

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
  const colourPreview = isHexColour(resolvedPrimaryColour) ? resolvedPrimaryColour : "#1d4ed8";

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
    if (!isHexColour(resolvedPrimaryColour)) {
      setError("Choose a valid 6 digit hex colour before saving.");
      return;
    }
    setIsSaving(true);
    try {
      await updateAgencyBranding(agency.id, { logo_url: resolvedLogoUrl, primary_colour: resolvedPrimaryColour });
      await refreshAgency();
      setPrimaryColour(resolvedPrimaryColour);
      setLogoUrl(resolvedLogoUrl);
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
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="grid gap-5 lg:grid-cols-[160px_1fr]">
                <div className="flex flex-col items-center gap-3">
                  <label
                    className="relative flex size-32 cursor-pointer items-center justify-center rounded-full border border-white/70 shadow-inner ring-1 ring-slate-200 dark:border-slate-900 dark:ring-slate-700"
                    style={{
                      background:
                        "conic-gradient(from 90deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #2563eb, #7c3aed, #ec4899, #ef4444)",
                    }}
                  >
                    <input
                      aria-label="Pick primary portal colour"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      type="color"
                      value={colourPreview}
                      onChange={(event) => setPrimaryColour(event.target.value)}
                    />
                    <span
                      className="flex size-16 items-center justify-center rounded-full border-4 border-white text-xs font-bold text-white shadow-lg dark:border-slate-950"
                      style={{ backgroundColor: colourPreview }}
                    >
                      Pick
                    </span>
                  </label>
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400">Click the wheel to choose a colour.</p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Primary colour"
                    value={resolvedPrimaryColour}
                    placeholder="#1d4ed8"
                    onChange={(event) => setPrimaryColour(event.target.value)}
                  />
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Quick colours</p>
                    <div className="flex flex-wrap gap-2">
                      {portalColourPresets.map((colour) => (
                        <button
                          key={colour}
                          type="button"
                          aria-label={`Use ${colour}`}
                          className="size-9 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-950 dark:ring-slate-700"
                          style={{ backgroundColor: colour }}
                          onClick={() => setPrimaryColour(colour)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-sm font-semibold">Candidate portal preview</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: colourPreview }}>
                        {agency?.name?.charAt(0) ?? "R"}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{agency?.name ?? "RecruitFlow"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Candidate clearance portal</p>
                      </div>
                      <span className="ml-auto rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: colourPreview }}>
                        Cleared
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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
