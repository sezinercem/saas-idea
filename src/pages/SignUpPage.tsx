import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";

export function SignUpPage() {
  const { isConfigured, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email || !password || !confirmPassword) {
      setError("Complete all fields to create your workspace.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(email, password);
      setMessage("Account created. Check your email if confirmation is enabled.");
      setTimeout(() => navigate("/dashboard"), 900);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create your account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Start your free trial</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Create the first administrator for your education recruitment agency.
          </p>
        </div>

        {!isConfigured ? (
          <Alert className="mt-6" tone="info">
            Add Supabase environment variables before signup can run.
          </Alert>
        ) : null}
        {message ? (
          <Alert className="mt-6" tone="success">
            {message}
          </Alert>
        ) : null}
        {error ? (
          <Alert className="mt-6" tone="error">
            {error}
          </Alert>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Work email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@agency.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Input
            label="Confirm password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <Button className="w-full" type="submit" disabled={!isConfigured || isSubmitting}>
            {isSubmitting ? "Creating account..." : "Start Free Trial"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
          Already have an account?{" "}
          <Link className="font-semibold text-brand-600 dark:text-brand-100" to="/login">
            Login
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
