import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { sendSchoolPasswordReset } from "../../lib/schoolPortal";

export function SchoolForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await sendSchoolPasswordReset(email);
      setMessage("Password reset email sent.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send reset email.");
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950 dark:text-white">
      <Card className="mx-auto mt-12 max-w-md">
        <p className="text-sm font-semibold uppercase text-brand-600 dark:text-brand-100">School access</p>
        <h1 className="mt-3 text-2xl font-bold">Reset password</h1>
        {message ? <Alert className="mt-5" tone="success">{message}</Alert> : null}
        {error ? <Alert className="mt-5" tone="error">{error}</Alert> : null}
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Button className="w-full" type="submit" disabled={isSaving}>{isSaving ? "Sending..." : "Send reset link"}</Button>
        </form>
        <Link className="mt-5 block text-center text-sm font-semibold text-brand-600 dark:text-brand-100" to="/school/login">Back to login</Link>
      </Card>
    </main>
  );
}
