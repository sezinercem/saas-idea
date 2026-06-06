import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/feedback/ErrorBoundary";
import { ToastProvider } from "./components/feedback/ToastProvider";
import { AppLayout } from "./components/layout/AppLayout";
import { OnboardingRoute } from "./components/layout/OnboardingRoute";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { PortalRoute } from "./components/layout/PortalRoute";
import { RoleGuard } from "./components/layout/RoleGuard";
import { SchoolRoute } from "./components/layout/SchoolRoute";
import { AgencyProvider } from "./context/AgencyContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PortalProvider } from "./context/PortalContext";
import { SchoolPortalProvider } from "./context/SchoolPortalContext";
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
const ApplicationsPage = lazy(() => import("./features/applications/ApplicationsPage").then((module) => ({ default: module.ApplicationsPage })));
const AvailabilityPage = lazy(() => import("./features/availability/AvailabilityPage").then((module) => ({ default: module.AvailabilityPage })));
const BookingRequestsPage = lazy(() => import("./features/bookings/BookingRequestsPage").then((module) => ({ default: module.BookingRequestsPage })));
const BookingsPage = lazy(() => import("./features/bookings/BookingsPage").then((module) => ({ default: module.BookingsPage })));
const InvoicesPage = lazy(() => import("./features/invoices/InvoicesPage").then((module) => ({ default: module.InvoicesPage })));
const JobDetailPage = lazy(() => import("./features/jobs/JobDetailPage").then((module) => ({ default: module.JobDetailPage })));
const JobsPage = lazy(() => import("./features/jobs/JobsPage").then((module) => ({ default: module.JobsPage })));
const PayrollPage = lazy(() => import("./features/payroll/PayrollPage").then((module) => ({ default: module.PayrollPage })));
const PlacementsPage = lazy(() => import("./features/placements/PlacementsPage").then((module) => ({ default: module.PlacementsPage })));
const ShiftsPage = lazy(() => import("./features/shifts/ShiftsPage").then((module) => ({ default: module.ShiftsPage })));
const TimesheetsPage = lazy(() => import("./features/timesheets/TimesheetsPage").then((module) => ({ default: module.TimesheetsPage })));
const TeamPage = lazy(() => import("./features/team/TeamPage").then((module) => ({ default: module.TeamPage })));
const CompliancePage = lazy(() => import("./features/compliance/CompliancePage").then((module) => ({ default: module.CompliancePage })));
const ComplianceReviewPage = lazy(() =>
  import("./features/compliance/ComplianceReviewPage").then((module) => ({ default: module.ComplianceReviewPage })),
);
const FollowUpsPage = lazy(() => import("./features/followups/FollowUpsPage").then((module) => ({ default: module.FollowUpsPage })));
const ReportsPage = lazy(() => import("./features/reports/ReportsPage").then((module) => ({ default: module.ReportsPage })));
const PortalAcceptPage = lazy(() => import("./features/portal/PortalAcceptPage").then((module) => ({ default: module.PortalAcceptPage })));
const PortalForgotPasswordPage = lazy(() =>
  import("./features/portal/PortalForgotPasswordPage").then((module) => ({ default: module.PortalForgotPasswordPage })),
);
const PortalLoginPage = lazy(() => import("./features/portal/PortalLoginPage").then((module) => ({ default: module.PortalLoginPage })));
const PortalResetPasswordPage = lazy(() =>
  import("./features/portal/PortalResetPasswordPage").then((module) => ({ default: module.PortalResetPasswordPage })),
);
const PortalLayout = lazy(() => import("./features/portal/PortalLayout").then((module) => ({ default: module.PortalLayout })));
const PortalDashboardPage = lazy(() => import("./features/portal/PortalDashboardPage").then((module) => ({ default: module.PortalDashboardPage })));
const PortalCompliancePage = lazy(() => import("./features/portal/PortalCompliancePage").then((module) => ({ default: module.PortalCompliancePage })));
const PortalJobsPage = lazy(() => import("./features/portal/PortalJobsPage").then((module) => ({ default: module.PortalJobsPage })));
const PortalShiftsPage = lazy(() => import("./features/portal/PortalShiftsPage").then((module) => ({ default: module.PortalShiftsPage })));
const PortalApplicationsPage = lazy(() => import("./features/portal/PortalApplicationsPage").then((module) => ({ default: module.PortalApplicationsPage })));
const PortalBookingsPage = lazy(() => import("./features/portal/PortalBookingsPage").then((module) => ({ default: module.PortalBookingsPage })));
const PortalDocumentsPage = lazy(() => import("./features/portal/PortalDocumentsPage").then((module) => ({ default: module.PortalDocumentsPage })));
const PortalProfilePage = lazy(() => import("./features/portal/PortalProfilePage").then((module) => ({ default: module.PortalProfilePage })));
const SchoolAcceptInvitePage = lazy(() => import("./features/school/SchoolAcceptInvitePage").then((module) => ({ default: module.SchoolAcceptInvitePage })));
const SchoolBookingsPage = lazy(() => import("./features/school/SchoolBookingsPage").then((module) => ({ default: module.SchoolBookingsPage })));
const SchoolCandidatesPage = lazy(() => import("./features/school/SchoolCandidatesPage").then((module) => ({ default: module.SchoolCandidatesPage })));
const SchoolContactsPage = lazy(() => import("./features/school/SchoolContactsPage").then((module) => ({ default: module.SchoolContactsPage })));
const SchoolDashboardPage = lazy(() => import("./features/school/SchoolDashboardPage").then((module) => ({ default: module.SchoolDashboardPage })));
const SchoolForgotPasswordPage = lazy(() => import("./features/school/SchoolForgotPasswordPage").then((module) => ({ default: module.SchoolForgotPasswordPage })));
const SchoolInvoicesPage = lazy(() => import("./features/school/SchoolInvoicesPage").then((module) => ({ default: module.SchoolInvoicesPage })));
const SchoolLayout = lazy(() => import("./features/school/SchoolLayout").then((module) => ({ default: module.SchoolLayout })));
const SchoolLoginPage = lazy(() => import("./features/school/SchoolLoginPage").then((module) => ({ default: module.SchoolLoginPage })));
const SchoolRequestsPage = lazy(() => import("./features/school/SchoolRequestsPage").then((module) => ({ default: module.SchoolRequestsPage })));
const SchoolResetPasswordPage = lazy(() => import("./features/school/SchoolResetPasswordPage").then((module) => ({ default: module.SchoolResetPasswordPage })));
const SchoolTimesheetsPage = lazy(() => import("./features/school/SchoolTimesheetsPage").then((module) => ({ default: module.SchoolTimesheetsPage })));

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
          <PortalProvider>
            <SchoolPortalProvider>
              <AgencyProvider>
                <ToastProvider>
              <BrowserRouter>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignUpPage />} />
                    <Route path="/portal/login" element={<PortalLoginPage />} />
                    <Route path="/portal/accept" element={<PortalAcceptPage />} />
                    <Route path="/portal/forgot-password" element={<PortalForgotPasswordPage />} />
                    <Route path="/portal/reset-password" element={<PortalResetPasswordPage />} />
                    <Route path="/school/login" element={<SchoolLoginPage />} />
                    <Route path="/school/accept-invite" element={<SchoolAcceptInvitePage />} />
                    <Route path="/school/forgot-password" element={<SchoolForgotPasswordPage />} />
                    <Route path="/school/reset-password" element={<SchoolResetPasswordPage />} />
                    <Route
                      element={
                        <PortalRoute>
                          <PortalLayout />
                        </PortalRoute>
                      }
                    >
                      <Route path="/portal" element={<PortalDashboardPage />} />
                      <Route path="/portal/compliance" element={<PortalCompliancePage />} />
                      <Route path="/portal/jobs" element={<PortalJobsPage />} />
                      <Route path="/portal/shifts" element={<PortalShiftsPage />} />
                      <Route path="/portal/applications" element={<PortalApplicationsPage />} />
                      <Route path="/portal/bookings" element={<PortalBookingsPage />} />
                      <Route path="/portal/documents" element={<PortalDocumentsPage />} />
                      <Route path="/portal/profile" element={<PortalProfilePage />} />
                    </Route>
                    <Route
                      element={
                        <SchoolRoute>
                          <SchoolLayout />
                        </SchoolRoute>
                      }
                    >
                      <Route path="/school" element={<SchoolDashboardPage />} />
                      <Route path="/school/requests" element={<SchoolRequestsPage />} />
                      <Route path="/school/bookings" element={<SchoolBookingsPage />} />
                      <Route path="/school/candidates" element={<SchoolCandidatesPage />} />
                      <Route path="/school/timesheets" element={<SchoolTimesheetsPage />} />
                      <Route path="/school/invoices" element={<SchoolInvoicesPage />} />
                      <Route path="/school/contacts" element={<SchoolContactsPage />} />
                    </Route>
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
                      <Route path="/availability" element={<AvailabilityPage />} />
                      <Route path="/applications" element={<ApplicationsPage />} />
                      <Route path="/booking-requests" element={<BookingRequestsPage />} />
                      <Route path="/bookings" element={<BookingsPage />} />
                      <Route path="/jobs" element={<JobsPage />} />
                      <Route path="/jobs/:id" element={<JobDetailPage />} />
                      <Route path="/placements" element={<PlacementsPage />} />
                      <Route
                        path="/shifts"
                        element={
                          <RoleGuard allowed={["owner", "admin", "recruiter"]}>
                            <ShiftsPage />
                          </RoleGuard>
                        }
                      />
                      <Route
                        path="/compliance"
                        element={<CompliancePage />}
                      />
                      <Route
                        path="/compliance/review"
                        element={
                          <RoleGuard allowed={["owner", "admin", "compliance"]}>
                            <ComplianceReviewPage />
                          </RoleGuard>
                        }
                      />
                      <Route path="/timesheets" element={<TimesheetsPage />} />
                      <Route
                        path="/payroll"
                        element={
                          <RoleGuard allowed={["owner", "admin"]}>
                            <PayrollPage />
                          </RoleGuard>
                        }
                      />
                      <Route
                        path="/invoices"
                        element={
                          <RoleGuard allowed={["owner", "admin"]}>
                            <InvoicesPage />
                          </RoleGuard>
                        }
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
            </SchoolPortalProvider>
          </PortalProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
