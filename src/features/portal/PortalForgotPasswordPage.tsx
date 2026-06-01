import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { sendPortalPasswordReset } from "../../lib/portal";

export function PortalForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);
    try {
      await sendPortalPasswordReset(email);
      setMessage("If this email belongs to an active candidate portal account, a reset link is on its way.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send password reset email.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <Link className="font-bold" to="/portal/login">RecruitFlow Candidate Portal</Link>
        <ThemeToggle />
      </div>
      <Card className="mx-auto mt-16 max-w-md">
        <p className="text-sm font-semibold uppercase text-brand-600 dark:text-brand-100">Candidate access</p>
        <h1 className="mt-3 text-2xl font-bold">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Enter the email your agency invited to the school placement portal.</p>
        {message ? <Alert className="mt-5" tone="success">{message}</Alert> : null}
        {error ? <Alert className="mt-5" tone="error">{error}</Alert> : null}
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Button className="w-full" type="submit" disabled={isSaving}>{isSaving ? "Sending..." : "Send reset link"}</Button>
        </form>
        <Link className="mt-5 block text-center text-sm font-semibold text-brand-600 dark:text-brand-100" to="/portal/login">
          Back to portal login
        </Link>
      </Card>
    </main>
  );
}
