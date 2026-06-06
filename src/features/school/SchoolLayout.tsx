import { Bell, CalendarCheck, ClipboardList, FileText, Home, LogOut, UsersRound } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { useAuth } from "../../hooks/useAuth";
import { useSchoolPortal } from "../../hooks/useSchoolPortal";
import { cn } from "../../lib/utils";

const navigation = [
  { label: "Dashboard", to: "/school", icon: Home },
  { label: "Requests", to: "/school/requests", icon: ClipboardList },
  { label: "Bookings", to: "/school/bookings", icon: CalendarCheck },
  { label: "Candidates", to: "/school/candidates", icon: UsersRound },
  { label: "Timesheets", to: "/school/timesheets", icon: CalendarCheck },
  { label: "Invoices", to: "/school/invoices", icon: FileText },
  { label: "Contacts", to: "/school/contacts", icon: UsersRound },
];

export function SchoolLayout() {
  const { signOut } = useAuth();
  const { session } = useSchoolPortal();
  const navigate = useNavigate();
  if (!session) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/school/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div>
            <p className="text-sm font-bold">{session.school.name}</p>
            <p className="text-xs text-slate-500">School Portal · {session.schoolUser.role}</p>
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
              end={to === "/school"}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition dark:text-slate-300",
                  isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100" : "hover:bg-slate-100 dark:hover:bg-slate-900",
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
