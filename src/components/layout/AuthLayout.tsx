import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Logo } from "./Logo";
import { ThemeToggle } from "../ui/ThemeToggle";

export function AuthLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1fr_480px]">
          <section className="hidden max-w-xl lg:block">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-100">
              Workforce command center
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
              Keep candidates, placements, bookings, and compliance moving together.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">
              A focused foundation for staffing teams that need clean workflows before the CRM gets heavy.
            </p>
          </section>
          {children}
        </div>
      </div>
    </main>
  );
}
