import { CheckCircle2, UsersRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Select } from "../../components/forms/Select";
import { Logo } from "../../components/layout/Logo";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useAgency } from "../../hooks/useAgency";
import { useToast } from "../../hooks/useToast";
import { completeAgencyOnboarding } from "../../lib/agency";

const teamSizes = ["1-5", "6-20", "21-50", "51+"].map((value) => ({ label: value, value }));

export function OnboardingPage() {
  const { agency, refreshAgency } = useAgency();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(agency?.name ?? "");
  const [recruitmentNiche, setRecruitmentNiche] = useState(agency?.recruitment_niche ?? "");
  const [teamSize, setTeamSize] = useState(agency?.team_size ?? "1-5");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleFinish = async (event: FormEvent) => {
    event.preventDefault();
    if (!agency) return;

    setError("");
    setIsSaving(true);
    try {
      await completeAgencyOnboarding(agency.id, { name, recruitment_niche: recruitmentNiche, team_size: teamSize });
      await refreshAgency();
      notify("Agency setup complete.", "success");
      navigate("/dashboard");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to finish onboarding.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl">
        <Logo />
        <Card className="mt-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Agency onboarding</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Set up your recruitment workspace</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">A few basics help RecruitFlow behave like an agency operating system.</p>

          {error ? (
            <Alert className="mt-6" tone="error">
              {error}
            </Alert>
          ) : null}

          <form className="mt-8 space-y-6" onSubmit={handleFinish}>
            {step === 0 ? (
              <Input label="Agency name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Northstar Staffing" />
            ) : null}
            {step === 1 ? (
              <Input
                label="Recruitment niche"
                value={recruitmentNiche}
                onChange={(event) => setRecruitmentNiche(event.target.value)}
                placeholder="Healthcare, industrial, education..."
              />
            ) : null}
            {step === 2 ? <Select label="Team size" value={teamSize} onChange={(event) => setTeamSize(event.target.value)} options={teamSizes} /> : null}
            {step === 3 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
                <UsersRound className="mx-auto size-8 text-brand-600 dark:text-brand-100" />
                <h2 className="mt-4 text-lg font-semibold">Invite team members</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Team invitations are coming soon. You can finish setup now and manage roles from the Team page.
                </p>
              </div>
            ) : null}
            {step === 4 ? (
              <div className="rounded-lg bg-emerald-50 p-6 text-center text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                <CheckCircle2 className="mx-auto size-8" />
                <h2 className="mt-4 text-lg font-semibold">Ready to launch</h2>
                <p className="mt-2 text-sm">Finish setup to enter the command centre.</p>
              </div>
            ) : null}

            <div className="flex justify-between gap-3">
              <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>
                Back
              </Button>
              {step < 4 ? (
                <Button type="button" onClick={() => setStep((current) => current + 1)}>
                  Continue
                </Button>
              ) : (
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Finishing..." : "Finish setup"}
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
