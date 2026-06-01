import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../hooks/useAuth";
import { usePortal } from "../../hooks/usePortal";
import { acceptPortalInvite, previewPortalInvite, signUpPortalCandidate } from "../../lib/portal";

type Preview = Awaited<ReturnType<typeof previewPortalInvite>>;

export function PortalAcceptPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || sessionStorage.getItem("candidate-portal-invite-token") || "";
  const { user } = useAuth();
  const { refreshPortal } = usePortal();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(token ? "" : "This invitation link is missing its secure token.");
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    sessionStorage.setItem("candidate-portal-invite-token", token);
    previewPortalInvite(token)
      .then((result) => {
        if (!result) setError("This invitation is invalid or has expired.");
        else if (result.invite_state === "Expired") setError("This invitation has expired. Ask your agency to resend it.");
        else if (result.invite_state === "Used") setError("This invitation has already been used. Log in to your candidate portal.");
        setPreview(result);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to verify invitation."))
      .finally(() => setIsLoading(false));
  }, [token]);

  const acceptExisting = async () => {
    setError("");
    setIsSaving(true);
    try {
      await acceptPortalInvite(token);
      sessionStorage.removeItem("candidate-portal-invite-token");
      await refreshPortal();
      window.location.assign("/portal");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to accept invitation.");
    } finally {
      setIsSaving(false);
    }
  };

  const createAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      const session = await signUpPortalCandidate(email, password);
      if (session) {
        await acceptExisting();
        return;
      }
      setMessage("Check your email to confirm your account, then return to this invitation link and log in.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create portal account.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950 dark:text-white">
      <Card className="mx-auto mt-10 max-w-lg">
        {isLoading ? <Skeleton className="h-44 w-full" /> : (
          <>
            <p className="text-sm font-semibold uppercase text-brand-600 dark:text-brand-100">Candidate invitation</p>
            <h1 className="mt-3 text-2xl font-bold">{preview?.agency_name || "Candidate Portal"}</h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {preview ? `Hello ${preview.candidate_first_name || "there"}, set up your account to complete safer recruitment checks and view school opportunities.` : "Your agency invitation could not be loaded."}
            </p>
            {error ? <Alert className="mt-5" tone="error">{error}</Alert> : null}
            {message ? <Alert className="mt-5" tone="success">{message}</Alert> : null}
            {preview && preview.invite_state === "Valid" && user ? (
              <Button className="mt-6 w-full" disabled={isSaving} onClick={acceptExisting}>
                {isSaving ? "Activating..." : "Accept invitation"}
              </Button>
            ) : preview && preview.invite_state === "Valid" ? (
              <form className="mt-6 space-y-4" onSubmit={createAccount}>
                <Input label="Invited email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                <Input label="Create password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
                <Button className="w-full" type="submit" disabled={isSaving}>
                  {isSaving ? "Creating account..." : "Create candidate account"}
                </Button>
              </form>
            ) : null}
          </>
        )}
      </Card>
    </main>
  );
}
