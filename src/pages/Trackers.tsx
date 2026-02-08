import { useState, useEffect, useMemo } from "react"
import Panel from "../components/Panel.tsx"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

// ===== SUB-TAB TYPE =====
type SubTab = "trackers" | "cookies"

// ===== TYPES =====
type TrackerRow = {
  id: string
  domain: string
  fullUrl: string
  initiator: string
  company: string
  category: string
  occurrences: number
  createdAt: string
}

type TopInitiator = { initiator: string; count: number }
type TopDomain = { domain: string; company: string; count: number }

type CompanyGroup = {
  company: string
  domains: { domain: string; category: string; totalHits: number; entryCount: number }[]
}

type BreakdownData = {
  totalTrackers: number
  topByInitiator: TopInitiator[]
  topByDomain: TopDomain[]
  companyGroups: CompanyGroup[]
  allTrackers: TrackerRow[]
}

export default function Trackers() {
  const [activeTab, setActiveTab] = useState<SubTab>("trackers")
  const [search, setSearch] = useState("")
  const [data, setData] = useState<BreakdownData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/api/breakdown`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error("Failed to fetch breakdown:", err))
      .finally(() => setLoading(false))
  }, [])

  const filteredTrackers = useMemo(() => {
    if (!data) return []
    if (!search) return data.allTrackers
    const q = search.toLowerCase()
    return data.allTrackers.filter(
      (t) =>
        t.domain.toLowerCase().includes(q) ||
        t.company.toLowerCase().includes(q) ||
        t.initiator.toLowerCase().includes(q)
    )
  }, [search, data])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--cyber-text-muted)]">
        Loading breakdown...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex gap-2">
        {(["trackers", "cookies"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium tracking-wide transition-colors capitalize ${
              activeTab === tab
                ? "bg-[var(--cyber-accent)]/10 text-[var(--cyber-accent)] border border-[var(--cyber-accent)]/30"
                : "text-[var(--cyber-text-muted)] hover:bg-white/5 border border-transparent"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "cookies" ? (
        /* Cookies tab - no data available */
        <Panel title="Cookies" delay={1}>
          <div className="h-64 flex flex-col items-center justify-center text-[var(--cyber-text-muted)] text-sm border border-dashed border-[var(--cyber-border)] rounded-md bg-[var(--cyber-bg)]/50">
            <span className="text-3xl mb-3 opacity-40">[ ]</span>
            <span className="text-sm font-medium">No cookie data available</span>
            <span className="text-xs mt-1 opacity-60">Cookie tracking data will appear here once collection is enabled</span>
          </div>
        </Panel>
      ) : (
        <>
          {/* Top 5 ranking tables side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Top 5 — By Initiator" delay={1}>
              {!data || data.topByInitiator.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-[var(--cyber-text-muted)] text-sm">
                  <span className="text-2xl mb-2 opacity-40">[ ]</span>
                  No data yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--cyber-border)] text-left text-xs font-medium uppercase tracking-widest text-[var(--cyber-accent)]">
                        <th className="pb-2 pr-4 w-12">#</th>
                        <th className="pb-2 pr-4">Initiator Site</th>
                        <th className="pb-2 text-right">Occurrences</th>
                      </tr>
                    </thead>
                    <tbody className="text-[var(--cyber-text-muted)]">
                      {data.topByInitiator.slice(0, 5).map((item, idx) => (
                        <tr
                          key={item.initiator}
                          className="border-b border-[var(--cyber-border)]/30 hover:bg-white/[0.02] transition-colors animate-slide-up"
                          style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                          <td className="py-2.5 pr-4 text-[var(--cyber-accent)] font-bold tabular-nums">{idx + 1}</td>
                          <td className="py-2.5 pr-4 text-[var(--cyber-text)] font-medium font-mono text-xs">{item.initiator}</td>
                          <td className="py-2.5 text-right text-[var(--cyber-text)] font-bold tabular-nums">{item.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Top 5 — By Domain" delay={2}>
              {!data || data.topByDomain.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-[var(--cyber-text-muted)] text-sm">
                  <span className="text-2xl mb-2 opacity-40">[ ]</span>
                  No data yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--cyber-border)] text-left text-xs font-medium uppercase tracking-widest text-[var(--cyber-accent-green)]">
                        <th className="pb-2 pr-4 w-12">#</th>
                        <th className="pb-2 pr-4">Tracker Domain</th>
                        <th className="pb-2 pr-4">Company</th>
                        <th className="pb-2 text-right">Occurrences</th>
                      </tr>
                    </thead>
                    <tbody className="text-[var(--cyber-text-muted)]">
                      {data.topByDomain.slice(0, 5).map((item, idx) => (
                        <tr
                          key={item.domain}
                          className="border-b border-[var(--cyber-border)]/30 hover:bg-white/[0.02] transition-colors animate-slide-up"
                          style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                          <td className="py-2.5 pr-4 text-[var(--cyber-accent-green)] font-bold tabular-nums">{idx + 1}</td>
                          <td className="py-2.5 pr-4 text-[var(--cyber-text)] font-medium font-mono text-xs">{item.domain}</td>
                          <td className="py-2.5 pr-4 text-[var(--cyber-text-muted)] text-xs">{item.company}</td>
                          <td className="py-2.5 text-right text-[var(--cyber-text)] font-bold tabular-nums">{item.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          {/* Company-aggregated accordion */}
          <Panel title="By Company" delay={3}>
            {!data || data.companyGroups.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-[var(--cyber-text-muted)] text-sm">
                <span className="text-2xl mb-2 opacity-40">[ ]</span>
                No data yet
              </div>
            ) : (
              <div className="space-y-1">
                {data.companyGroups.map((group) => (
                  <CompanyAccordion key={group.company} group={group} />
                ))}
              </div>
            )}
          </Panel>

          {/* Main data table — All Trackers */}
          <Panel title="All Trackers" delay={4}>
            <div className="flex items-center gap-4 mb-4">
              <input
                type="search"
                placeholder="Search trackers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full max-w-xs rounded-md border border-[var(--cyber-border)] bg-[var(--cyber-bg)] px-3 py-2 text-sm text-[var(--cyber-text)] placeholder-[var(--cyber-text-muted)] focus:border-[var(--cyber-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--cyber-accent)]"
              />
            </div>

            <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--cyber-surface)]">
                  <tr className="border-b border-[var(--cyber-border)] text-left text-xs font-medium uppercase tracking-widest text-[var(--cyber-accent)]">
                    <th className="pb-3 pr-4">Domain</th>
                    <th className="pb-3 pr-4">Initiator</th>
                    <th className="pb-3 pr-4">Company</th>
                    <th className="pb-3 pr-4">Category</th>
                    <th className="pb-3 pr-4 text-right">Hits</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--cyber-text-muted)]">
                  {filteredTrackers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-lg opacity-40">[ ]</span>
                          <span className="text-[var(--cyber-text-muted)]">No data yet</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTrackers.map((t) => (
                      <tr key={t.id} className="border-b border-[var(--cyber-border)]/50 hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 pr-4 font-mono text-xs text-[var(--cyber-text)]">{t.domain}</td>
                        <td className="py-2.5 pr-4 font-mono text-xs">{t.initiator}</td>
                        <td className="py-2.5 pr-4">{t.company}</td>
                        <td className="py-2.5 pr-4"><CategoryBadge category={t.category} /></td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--cyber-text)]">{t.occurrences.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}

// ---------- Company Accordion ----------

function CompanyAccordion({ group }: { group: CompanyGroup }) {
  const [open, setOpen] = useState(false)
  const totalItems = group.domains.reduce((sum, d) => sum + d.entryCount, 0)

  return (
    <div className="border border-[var(--cyber-border)]/50 rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[var(--cyber-accent)] text-xs font-mono">{open ? "v" : ">"}</span>
          <span className="text-sm font-medium text-[var(--cyber-text)]">{group.company}</span>
          <span className="text-xs text-[var(--cyber-text-muted)]">
            {group.domains.length} domain{group.domains.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="text-xs text-[var(--cyber-text-muted)] tabular-nums">{totalItems} entries</span>
      </button>
      {open && (
        <div className="border-t border-[var(--cyber-border)]/30 pl-6">
          {group.domains.map((d) => (
            <div key={d.domain} className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--cyber-border)]/20 last:border-b-0 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-[var(--cyber-text)]">{d.domain}</span>
                <CategoryBadge category={d.category} />
              </div>
              <span className="text-xs text-[var(--cyber-text-muted)] tabular-nums">{d.totalHits.toLocaleString()} hits</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Inline badge helpers ----------

const CATEGORY_COLORS: Record<string, string> = {
  tracking: "var(--cyber-danger)",
  advertising: "#f59e0b",
  analytics: "var(--cyber-accent)",
  social: "#818cf8",
  functional: "var(--cyber-accent-green)",
  unknown: "var(--cyber-text-muted)",
}

function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.unknown
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider border"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
      }}
    >
      {category}
    </span>
  )
}
