import { ArrowLeft, CheckCircle2, ClipboardCheck, Settings2, ShieldCheck, UserRound } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Select } from "../../components/forms/Select";
import { Logo } from "../../components/layout/Logo";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useAgency } from "../../hooks/useAgency";
import { usePortal } from "../../hooks/usePortal";
import { useToast } from "../../hooks/useToast";
import { completeAgencyOnboarding, saveAgencyOnboardingProgress } from "../../lib/agency";
import type { Agency, OnboardingStep } from "../../types/agency";

const steps: Array<{ key: Exclude<OnboardingStep, "Completed">; label: string; required: boolean; icon: typeof UserRound }> = [
  { key: "Profile Setup", label: "Profile Setup", required: true, icon: UserRound },
  { key: "Agency Setup", label: "Agency Setup", required: true, icon: ClipboardCheck },
  { key: "Preferences", label: "Preferences", required: false, icon: Settings2 },
  { key: "Compliance Settings", label: "Compliance Settings", required: false, icon: ShieldCheck },
];

const teamSizes = ["", "1-5", "6-20", "21-50", "51+"].map((value) => ({ label: value || "Choose later", value }));

export function OnboardingPage() {
  const { agency } = useAgency();
  const { session } = usePortal();

  if (session) return <Navigate to="/portal" replace />;
  if (!agency) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Loading onboarding...
      </main>
    );
  }

  return <OnboardingForm agency={agency} />;
}

function OnboardingForm({ agency }: { agency: Agency }) {
  const { refreshAgency } = useAgency();
  const { notify } = useToast();
  const navigate = useNavigate();
  const initialIndex = Math.max(0, steps.findIndex((step) => step.key === agency.onboarding_step));
  const [stepIndex, setStepIndex] = useState(initialIndex);
  const [name, setName] = useState(agency.name ?? "");
  const [recruitmentNiche, setRecruitmentNiche] = useState(agency.recruitment_niche ?? "");
  const [teamSize, setTeamSize] = useState(agency.team_size ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const completedSteps = useMemo(
    () =>
      [
        name.trim().length >= 2,
        Boolean(recruitmentNiche.trim()),
        Boolean(teamSize),
        Boolean(agency.onboarding_completed || agency.onboarding_complete),
      ].filter(Boolean).length,
    [agency.onboarding_complete, agency.onboarding_completed, name, recruitmentNiche, teamSize],
  );
  const completionPercent = Math.round((completedSteps / steps.length) * 100);
  const currentStep = steps[stepIndex] ?? steps[0];

  const validateCurrent = () => {
    if (currentStep.key === "Profile Setup" && name.trim().length < 2) return "Agency name is required before continuing.";
    if (currentStep.key === "Agency Setup" && !recruitmentNiche.trim()) return "Add an education staffing focus, or use Skip for Now.";
    return "";
  };

  const save = async (nextStep: OnboardingStep, complete = false) => {
    setError("");
    setIsSaving(true);
    try {
      if (complete) {
        await completeAgencyOnboarding(agency.id, { name, recruitment_niche: recruitmentNiche, team_size: teamSize });
      } else {
        await saveAgencyOnboardingProgress(agency.id, {
          name,
          recruitment_niche: recruitmentNiche,
          team_size: teamSize,
          onboarding_step: nextStep,
        });
      }
      await refreshAgency();
      notify(complete ? "Onboarding complete. Welcome to your dashboard." : "Onboarding progress saved.", "success");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to save onboarding progress.";
      setError(message);
      throw caught;
    } finally {
      setIsSaving(false);
    }
  };

  const goNext = async (persist: boolean) => {
    const validation = validateCurrent();
    if (validation) {
      setError(validation);
      return;
    }
    const nextIndex = Math.min(steps.length - 1, stepIndex + 1);
    if (persist) await save(steps[nextIndex]?.key ?? "Completed");
    setStepIndex(nextIndex);
  };

  const skip = async () => {
    const nextIndex = Math.min(steps.length - 1, stepIndex + 1);
    await save(steps[nextIndex]?.key ?? "Completed");
    setStepIndex(nextIndex);
  };

  const saveAndExit = async () => {
    await save(steps[stepIndex]?.key ?? "Profile Setup");
    navigate("/dashboard");
  };

  const finish = async (event?: FormEvent) => {
    event?.preventDefault();
    if (name.trim().length < 2) {
      setError("Agency name is required before finishing setup.");
      return;
    }
    await save("Completed", true);
    navigate("/dashboard");
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <ButtonLink to="/dashboard" variant="outline">Save & Exit</ButtonLink>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          <Card className="h-fit">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Setup progress</p>
            <div className="mt-5 flex items-end justify-between">
              <span className="text-4xl font-bold">{completionPercent}%</span>
              <Badge tone={agency?.onboarding_completed ? "green" : "amber"}>{agency?.onboarding_completed ? "Complete" : "In progress"}</Badge>
            </div>
            <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-2 rounded-full bg-brand-600 transition-all dark:bg-brand-100" style={{ width: `${completionPercent}%` }} />
            </div>
            <div className="mt-6 space-y-2">
              {steps.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setStepIndex(index)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                    index === stepIndex
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <step.icon className="size-4" />
                  <span>{step.label}</span>
                  {!step.required ? <span className="ml-auto text-xs text-slate-400">Optional</span> : null}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <form onSubmit={finish}>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">Agency onboarding</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">{currentStep.label}</h1>
              <p className="mt-3 text-slate-600 dark:text-slate-300">
                Set up the operational basics for education recruitment. You can leave and return to this page whenever you need.
              </p>

              {error ? <Alert className="mt-6" tone="error">{error}</Alert> : null}

              <div className="mt-8">
                {currentStep.key === "Profile Setup" ? (
                  <StepBlock title="Name your agency" body="This appears in the recruiter workspace and candidate portal invitation emails.">
                    <Input label="Agency name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Northstar Education" />
                  </StepBlock>
                ) : null}
                {currentStep.key === "Agency Setup" ? (
                  <StepBlock title="Education staffing focus" body="Keep this broad; you can refine sector-specific settings later.">
                    <Input
                      label="Focus"
                      value={recruitmentNiche}
                      onChange={(event) => setRecruitmentNiche(event.target.value)}
                      placeholder="Primary supply, SEND, teaching assistants..."
                    />
                  </StepBlock>
                ) : null}
                {currentStep.key === "Preferences" ? (
                  <StepBlock title="Team size" body="This helps shape future reporting defaults. It is optional for now.">
                    <Select label="Team size" value={teamSize} onChange={(event) => setTeamSize(event.target.value)} options={teamSizes} />
                  </StepBlock>
                ) : null}
                {currentStep.key === "Compliance Settings" ? (
                  <StepBlock title="Safer recruitment settings" body="Default education compliance checks are already installed by migration.">
                    <div className="rounded-lg border border-dashed border-slate-300 p-6 dark:border-slate-700">
                      <ShieldCheck className="size-8 text-brand-600 dark:text-brand-100" />
                      <h2 className="mt-4 text-lg font-semibold">DBS, safeguarding and Right to Work defaults</h2>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        You can tune compliance rules from the Compliance Centre after setup. Finish now to return to Dashboard.
                      </p>
                    </div>
                  </StepBlock>
                ) : null}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="outline" disabled={stepIndex === 0 || isSaving} onClick={() => setStepIndex((current) => Math.max(0, current - 1))}>
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
                <div className="flex flex-wrap justify-end gap-3">
                  {!currentStep.required ? (
                    <Button type="button" variant="ghost" disabled={isSaving} onClick={skip}>
                      Skip for Now
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" disabled={isSaving} onClick={saveAndExit}>
                    Save & Exit
                  </Button>
                  {stepIndex < steps.length - 1 ? (
                    <>
                      <Button type="button" variant="outline" disabled={isSaving} onClick={() => goNext(false)}>
                        Continue
                      </Button>
                      <Button type="button" disabled={isSaving} onClick={() => goNext(true)}>
                        {isSaving ? "Saving..." : "Save & Continue"}
                      </Button>
                    </>
                  ) : (
                    <Button type="submit" disabled={isSaving}>
                      <CheckCircle2 className="size-4" />
                      {isSaving ? "Saving..." : "Finish Setup"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}

function StepBlock({ body, children, title }: { body: string; children: ReactNode; title: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{body}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
