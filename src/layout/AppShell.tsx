import { Outlet, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import NavItem from "../components/NavItem";
import Badge from "../components/Badge";
import CyberTitle from "../components/CyberTitle";

const authDisabled = import.meta.env.VITE_AUTH_DISABLED === "true";

const NAV_ITEMS = [
  { path: "/app/overview", label: "Overview" },
  { path: "/app/trackers", label: "Breakdown" },
  { path: "/app/companies", label: "Companies" },
  { path: "/app/trends", label: "Trends" },
  { path: "/app/settings", label: "Settings" },
];

const PAGE_TITLES: Record<string, string> = {
  "/app/overview": "Overview",
  "/app/trackers": "Breakdown",
  "/app/companies": "Companies",
  "/app/trends": "Trends",
  "/app/settings": "Settings",
};

export default function AppShell() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? "Privacy Shield";
  const { logout } = authDisabled ? { logout: () => {} } : useAuth0();

  return (
    <div className="min-h-screen bg-[var(--cyber-bg)] flex">
      <aside className="w-56 flex-shrink-0 border-r border-[var(--cyber-border)] bg-[var(--cyber-surface)]">
        <div className="p-4 border-b border-[var(--cyber-border)]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--cyber-accent-green)] glow-pulse" />
            <h2 className="text-sm font-bold text-[var(--cyber-accent)] tracking-widest uppercase">
              Privacy Shield
            </h2>
          </div>
          <p className="text-[10px] text-[var(--cyber-text-muted)] mt-1 tracking-wider">
            TRACKER MONITOR v0.2
          </p>
        </div>
        <nav className="px-2 py-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.path} to={item.path} label={item.label} />
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-6 border-b border-[var(--cyber-border)] bg-[var(--cyber-surface)]/80 backdrop-blur-md">
          <CyberTitle
            key={location.pathname}
            text={title}
            as="h1"
            className="text-lg font-bold text-[var(--cyber-text)]"
          />
          <div className="flex items-center gap-3">
            <Badge>Mock data</Badge>
            {!authDisabled && (
              <button
                onClick={() =>
                  logout({ logoutParams: { returnTo: window.location.origin } })
                }
                className="px-3 py-1.5 text-xs font-medium tracking-wide text-[var(--cyber-text-muted)] hover:text-[var(--cyber-text)] border border-[var(--cyber-border)] hover:border-[var(--cyber-accent)]/30 rounded-md transition-colors"
              >
                Log out
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <Outlet key={location.pathname} />
          </div>
        </div>
      </main>
    </div>
  );
}
