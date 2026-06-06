import { useState, type FormEvent } from "react";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { updateSchoolPassword } from "../../lib/schoolPortal";

export function SchoolResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      await updateSchoolPassword(password);
      setMessage("Password updated. You can now sign in.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update password.");
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950 dark:text-white">
      <Card className="mx-auto mt-12 max-w-md">
        <p className="text-sm font-semibold uppercase text-brand-600 dark:text-brand-100">School access</p>
        <h1 className="mt-3 text-2xl font-bold">Create a new password</h1>
        {message ? <Alert className="mt-5" tone="success">{message}</Alert> : null}
        {error ? <Alert className="mt-5" tone="error">{error}</Alert> : null}
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button className="w-full" type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Update password"}</Button>
        </form>
      </Card>
    </main>
  );
}
