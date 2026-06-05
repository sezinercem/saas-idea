import { Bell, BriefcaseBusiness, CalendarDays, ClipboardCheck, FileText, Home, LogOut, UserRound } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { useAuth } from "../../hooks/useAuth";
import { usePortal } from "../../hooks/usePortal";
import { brandStyleVars } from "../../lib/brand";
import { cn } from "../../lib/utils";

const navigation = [
  { label: "Dashboard", to: "/portal", icon: Home },
  { label: "My Compliance", to: "/portal/compliance", icon: ClipboardCheck },
  { label: "Available Jobs", to: "/portal/jobs", icon: BriefcaseBusiness },
  { label: "Available Shifts", to: "/portal/shifts", icon: CalendarDays },
  { label: "Applications", to: "/portal/applications", icon: FileText },
  { label: "Bookings", to: "/portal/bookings", icon: CalendarDays },
  { label: "Documents", to: "/portal/documents", icon: FileText },
  { label: "Profile", to: "/portal/profile", icon: UserRound },
];

export function PortalLayout() {
  const { session } = usePortal();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  if (!session) return null;
  const brandColour = session.agency.primary_colour || "#1d4ed8";

  const handleSignOut = async () => {
    await signOut();
    navigate("/portal/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white" style={brandStyleVars(brandColour)}>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {session.agency.logo_url ? (
              <img alt="" className="size-9 rounded-lg object-cover" src={session.agency.logo_url} />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: brandColour }}>
                <ClipboardCheck className="size-5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{session.agency.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Candidate Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-slate-400" />
            <ThemeToggle />
            <Button variant="ghost" className="h-10 px-2 sm:px-3" onClick={handleSignOut}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
          {navigation.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              end={to === "/portal"}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition dark:text-slate-300",
                  isActive ? "shadow-sm" : "hover:bg-slate-100 dark:hover:bg-slate-900",
                )
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      backgroundColor: `${brandColour}18`,
                      color: brandColour,
                    }
                  : undefined
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="h-1" style={{ backgroundColor: brandColour }} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
