import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { updatePortalPassword } from "../../lib/portal";

export function PortalResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsSaving(true);
    try {
      await updatePortalPassword(password);
      navigate("/portal/login", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update password.");
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
        <h1 className="mt-3 text-2xl font-bold">Choose a new password</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Use the reset link from your email, then save a new portal password.</p>
        {error ? <Alert className="mt-5" tone="error">{error}</Alert> : null}
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Input label="Confirm password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          <Button className="w-full" type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save password"}</Button>
        </form>
      </Card>
    </main>
  );
}
