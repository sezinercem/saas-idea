import { useState, type FormEvent } from "react";
import { Building2, GraduationCap, UsersRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";

type LocationState = {
  from?: { pathname?: string };
};

export function LoginPage() {
  const { isConfigured, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from?.pathname ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to log in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full">
        <div className="mb-6 grid gap-3">
          <PortalChoice
            icon={UsersRound}
            title="Recruiter workspace"
            body="Agency owners, admins, recruiters, and compliance teams."
            to="/login"
            active
          />
          <PortalChoice
            icon={Building2}
            title="School portal"
            body="School users sign in or accept an agency-issued invite."
            to="/school/login"
          />
          <PortalChoice
            icon={GraduationCap}
            title="Candidate portal"
            body="Candidates use an agency invite or access code to see only their agency's jobs and compliance."
            to="/portal/login"
          />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log in to your workspace</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Access your education recruitment and candidate clearance workspace.
          </p>
        </div>

        {!isConfigured ? (
          <Alert className="mt-6" tone="info">
            Add Supabase environment variables before authentication can run.
          </Alert>
        ) : null}
        {error ? (
          <Alert className="mt-6" tone="error">
            {error}
          </Alert>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Email"
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
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div className="flex justify-end">
            <a href="mailto:support@example.com" className="text-sm font-semibold text-brand-600 dark:text-brand-100">
              Forgot password?
            </a>
          </div>
          <Button className="w-full" type="submit" disabled={!isConfigured || isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
          New to RecruitFlow?{" "}
          <Link className="font-semibold text-brand-600 dark:text-brand-100" to="/signup">
            Start Free Trial
          </Link>
        </p>
        <p className="mt-3 text-center text-sm text-slate-600 dark:text-slate-300">
          Candidate invited by an agency?{" "}
          <Link className="font-semibold text-brand-600 dark:text-brand-100" to="/portal/login">
            Open Candidate Portal
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
}

function PortalChoice({
  active,
  body,
  icon: Icon,
  title,
  to,
}: {
  active?: boolean;
  body: string;
  icon: typeof UsersRound;
  title: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className={`flex items-start gap-3 rounded-lg border p-3 transition ${
        active
          ? "border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100"
          : "border-slate-200 hover:border-brand-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-brand-500/30 dark:hover:bg-slate-900"
      }`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 dark:bg-slate-950 dark:text-brand-100">
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-400">{body}</span>
      </span>
    </Link>
  );
}
