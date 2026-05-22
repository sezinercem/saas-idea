import { Menu } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "../ui/Button";
import { ThemeToggle } from "../ui/ThemeToggle";
import { Logo } from "./Logo";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

export function LandingNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <ButtonLink to="/login" variant="ghost">
            Login
          </ButtonLink>
          <ButtonLink to="/signup">Start Free Trial</ButtonLink>
        </div>
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 md:hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
        >
          <Menu className="size-5" />
        </button>
      </nav>
      {isOpen ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                {item.label}
              </a>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <ThemeToggle />
              <ButtonLink to="/login" variant="outline" className="flex-1">
                Login
              </ButtonLink>
              <ButtonLink to="/signup" className="flex-1">
                Start Trial
              </ButtonLink>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
