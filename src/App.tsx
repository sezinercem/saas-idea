import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/feedback/ErrorBoundary";
import { ToastProvider } from "./components/feedback/ToastProvider";
import { AppLayout } from "./components/layout/AppLayout";
import { OnboardingRoute } from "./components/layout/OnboardingRoute";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { RoleGuard } from "./components/layout/RoleGuard";
import { AgencyProvider } from "./context/AgencyContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignUpPage } from "./pages/SignUpPage";

const AccountPage = lazy(() => import("./pages/AccountPage").then((module) => ({ default: module.AccountPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const OnboardingPage = lazy(() => import("./features/auth/OnboardingPage").then((module) => ({ default: module.OnboardingPage })));
const CandidateDetailPage = lazy(() =>
  import("./features/candidates/CandidateDetailPage").then((module) => ({ default: module.CandidateDetailPage })),
);
const CandidatesPage = lazy(() => import("./features/candidates/CandidatesPage").then((module) => ({ default: module.CandidatesPage })));
const JobDetailPage = lazy(() => import("./features/jobs/JobDetailPage").then((module) => ({ default: module.JobDetailPage })));
const JobsPage = lazy(() => import("./features/jobs/JobsPage").then((module) => ({ default: module.JobsPage })));
const PlacementsPage = lazy(() => import("./features/placements/PlacementsPage").then((module) => ({ default: module.PlacementsPage })));
const TeamPage = lazy(() => import("./features/team/TeamPage").then((module) => ({ default: module.TeamPage })));
const CompliancePage = lazy(() => import("./features/compliance/CompliancePage").then((module) => ({ default: module.CompliancePage })));
const FollowUpsPage = lazy(() => import("./features/followups/FollowUpsPage").then((module) => ({ default: module.FollowUpsPage })));
const ReportsPage = lazy(() => import("./features/reports/ReportsPage").then((module) => ({ default: module.ReportsPage })));

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
      Loading workspace...
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <AgencyProvider>
            <ToastProvider>
              <BrowserRouter>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignUpPage />} />
                    <Route
                      path="/onboarding"
                      element={
                        <ProtectedRoute>
                          <OnboardingPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      element={
                        <ProtectedRoute>
                          <OnboardingRoute>
                            <AppLayout />
                          </OnboardingRoute>
                        </ProtectedRoute>
                      }
                    >
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/candidates" element={<CandidatesPage />} />
                      <Route path="/candidates/:id" element={<CandidateDetailPage />} />
                      <Route path="/jobs" element={<JobsPage />} />
                      <Route path="/jobs/:id" element={<JobDetailPage />} />
                      <Route path="/placements" element={<PlacementsPage />} />
                      <Route
                        path="/compliance"
                        element={<CompliancePage />}
                      />
                      <Route path="/follow-ups" element={<FollowUpsPage />} />
                      <Route path="/reports" element={<ReportsPage />} />
                      <Route
                        path="/team"
                        element={
                          <RoleGuard allowed={["owner", "admin"]}>
                            <TeamPage />
                          </RoleGuard>
                        }
                      />
                      <Route path="/account" element={<AccountPage />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </ToastProvider>
          </AgencyProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
