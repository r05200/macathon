import { Outlet, useLocation } from "react-router-dom"
import NavItem from "../components/NavItem"
import Badge from "../components/Badge"

const NAV_ITEMS = [
  { path: "/app/overview", label: "Overview" },
  { path: "/app/trackers", label: "Trackers" },
  { path: "/app/companies", label: "Companies" },
  { path: "/app/trends", label: "Trends" },
  { path: "/app/geography", label: "Geography" },
  { path: "/app/settings", label: "Settings" },
]

const PAGE_TITLES: Record<string, string> = {
  "/app/overview": "Overview",
  "/app/trackers": "Trackers",
  "/app/companies": "Companies",
  "/app/trends": "Trends",
  "/app/geography": "Geography",
  "/app/settings": "Settings",
}

export default function AppShell() {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] ?? "Tracker Dashboard"

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-white">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-900">Tracker Dashboard</h2>
        </div>
        <nav className="px-2 py-1 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.path} to={item.path} label={item.label} />
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-6 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          <Badge>Mock data</Badge>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
