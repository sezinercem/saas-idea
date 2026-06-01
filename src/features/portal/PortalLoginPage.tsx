import { useState, type FormEvent } from "react";
import { Navigate, Link } from "react-router-dom";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { useAuth } from "../../hooks/useAuth";
import { usePortal } from "../../hooks/usePortal";
import { acceptPortalInvite } from "../../lib/portal";

export function PortalLoginPage() {
  const { signIn, user } = useAuth();
  const { session } = usePortal();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  if (session) return <Navigate to="/portal" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await signIn(email, password);
      const token = sessionStorage.getItem("candidate-portal-invite-token");
      if (token) {
        await acceptPortalInvite(token);
        sessionStorage.removeItem("candidate-portal-invite-token");
      }
      window.location.assign("/portal");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to access your portal.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <Link className="font-bold" to="/">RecruitFlow Candidate Portal</Link>
        <ThemeToggle />
      </div>
      <Card className="mx-auto mt-16 max-w-md">
        <p className="text-sm font-semibold uppercase text-brand-600 dark:text-brand-100">School opportunities</p>
        <h1 className="mt-3 text-2xl font-bold">Log in to your portal</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Manage clearance, applications and booked shifts with your agency.</p>
        {user && !session ? <Alert className="mt-5" tone="info">This account is not linked to an active candidate portal invite.</Alert> : null}
        {error ? <Alert className="mt-5" tone="error">{error}</Alert> : null}
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button className="w-full" type="submit" disabled={isSaving}>{isSaving ? "Signing in..." : "Log in"}</Button>
        </form>
        <Link className="mt-4 block text-center text-sm font-semibold text-brand-600 dark:text-brand-100" to="/portal/forgot-password">
          Forgot password?
        </Link>
        <p className="mt-5 text-center text-sm text-slate-500">Need access? Your agency must invite you first.</p>
      </Card>
    </main>
  );
}
