import { useState, useMemo } from "react"
import Panel from "../components/Panel.tsx"

// ===== SUB-TAB TYPE =====
type SubTab = "trackers" | "cookies"

// ===== TYPES =====
type Tracker = {
  id: string
  name: string
  domain: string
  company: string
  category: string
  occurrences: number
  isThirdParty: boolean
  isBlocked: boolean
  isPotential: boolean
  detectionSource: string
  firstSeen: string
  lastSeen: string
}

type Cookie = {
  id: string
  name: string
  domain: string
  company: string
  category: string
  value: string
  httpOnly: boolean
  secure: boolean
  sameSite: string
  expiration: string
  isThirdParty: boolean
  isBlocked: boolean
  detectionSource: string
  firstSeen: string
  lastSeen: string
}

type TrackerStats = {
  totalTrackers: number
  totalBlocked: number
  topByInitiator: { initiator: string; count: number }[]
  topByDomain: { domain: string; company: string; count: number }[]
  trackersPerDay: { date: string; count: number }[]
}

type CompanyGroup = {
  company: string
  domains: {
    domain: string
    trackers: Tracker[]
    cookies: { id: string; name: string; domain: string; category: string }[]
  }[]
}

// ===== MOCK DATA =====
const MOCK_STATS: TrackerStats = {
  totalTrackers: 47,
  totalBlocked: 12,
  topByInitiator: [
    { initiator: "cnn.com", count: 523 },
    { initiator: "nytimes.com", count: 412 },
    { initiator: "reddit.com", count: 387 },
    { initiator: "youtube.com", count: 301 },
    { initiator: "twitter.com", count: 289 },
  ],
  topByDomain: [
    { domain: "doubleclick.net", company: "Google", count: 1247 },
    { domain: "facebook.com", company: "Meta", count: 892 },
    { domain: "google-analytics.com", company: "Google", count: 734 },
    { domain: "amazon-adsystem.com", company: "Amazon", count: 521 },
    { domain: "scorecardresearch.com", company: "Comscore", count: 467 },
  ],
  trackersPerDay: [],
}

const MOCK_TRACKERS: Tracker[] = [
  { id: "1", name: "DoubleClick", domain: "doubleclick.net", company: "Google", category: "advertising", occurrences: 1247, isThirdParty: true, isBlocked: true, isPotential: false, detectionSource: "duckduckgo", firstSeen: "2026-01-15T10:23:00Z", lastSeen: "2026-02-07T18:45:00Z" },
  { id: "2", name: "Facebook Pixel", domain: "facebook.com", company: "Meta", category: "tracking", occurrences: 892, isThirdParty: true, isBlocked: true, isPotential: false, detectionSource: "hardcoded", firstSeen: "2026-01-12T08:15:00Z", lastSeen: "2026-02-07T19:12:00Z" },
  { id: "3", name: "Google Analytics", domain: "google-analytics.com", company: "Google", category: "analytics", occurrences: 734, isThirdParty: true, isBlocked: false, isPotential: false, detectionSource: "duckduckgo", firstSeen: "2026-01-10T14:32:00Z", lastSeen: "2026-02-07T20:01:00Z" },
  { id: "4", name: "Amazon Advertising", domain: "amazon-adsystem.com", company: "Amazon", category: "advertising", occurrences: 521, isThirdParty: true, isBlocked: true, isPotential: false, detectionSource: "pattern", firstSeen: "2026-01-18T11:45:00Z", lastSeen: "2026-02-07T17:30:00Z" },
  { id: "5", name: "Scorecard Research", domain: "scorecardresearch.com", company: "Comscore", category: "analytics", occurrences: 467, isThirdParty: true, isBlocked: false, isPotential: true, detectionSource: "pattern", firstSeen: "2026-01-20T09:12:00Z", lastSeen: "2026-02-07T16:22:00Z" },
  { id: "6", name: "Twitter Widget", domain: "twitter.com", company: "X Corp", category: "social", occurrences: 398, isThirdParty: true, isBlocked: false, isPotential: false, detectionSource: "duckduckgo", firstSeen: "2026-01-22T13:05:00Z", lastSeen: "2026-02-07T15:50:00Z" },
  { id: "7", name: "Taboola", domain: "taboola.com", company: "Taboola", category: "advertising", occurrences: 312, isThirdParty: true, isBlocked: true, isPotential: false, detectionSource: "hardcoded", firstSeen: "2026-01-25T10:40:00Z", lastSeen: "2026-02-07T14:18:00Z" },
  { id: "8", name: "Hotjar", domain: "hotjar.com", company: "Hotjar", category: "analytics", occurrences: 287, isThirdParty: true, isBlocked: false, isPotential: false, detectionSource: "pixel", firstSeen: "2026-01-28T12:22:00Z", lastSeen: "2026-02-07T13:45:00Z" },
]

const MOCK_COOKIES: Cookie[] = [
  { id: "c1", name: "_ga", domain: "google-analytics.com", company: "Google", category: "analytics", value: "GA1.2.xxx", httpOnly: false, secure: true, sameSite: "lax", expiration: "2026-08-07T00:00:00Z", isThirdParty: true, isBlocked: false, detectionSource: "duckduckgo", firstSeen: "2026-01-10T14:32:00Z", lastSeen: "2026-02-07T20:01:00Z" },
  { id: "c2", name: "_fbp", domain: "facebook.com", company: "Meta", category: "tracking", value: "fb.1.xxx", httpOnly: false, secure: true, sameSite: "none", expiration: "2026-05-07T00:00:00Z", isThirdParty: true, isBlocked: true, detectionSource: "hardcoded", firstSeen: "2026-01-12T08:15:00Z", lastSeen: "2026-02-07T19:12:00Z" },
  { id: "c3", name: "IDE", domain: "doubleclick.net", company: "Google", category: "advertising", value: "xxx", httpOnly: true, secure: true, sameSite: "none", expiration: "2026-08-07T00:00:00Z", isThirdParty: true, isBlocked: true, detectionSource: "duckduckgo", firstSeen: "2026-01-15T10:23:00Z", lastSeen: "2026-02-07T18:45:00Z" },
  { id: "c4", name: "ad-id", domain: "amazon-adsystem.com", company: "Amazon", category: "advertising", value: "xxx", httpOnly: false, secure: true, sameSite: "lax", expiration: "2026-08-07T00:00:00Z", isThirdParty: true, isBlocked: true, detectionSource: "pattern", firstSeen: "2026-01-18T11:45:00Z", lastSeen: "2026-02-07T17:30:00Z" },
  { id: "c5", name: "UID", domain: "scorecardresearch.com", company: "Comscore", category: "analytics", value: "xxx", httpOnly: false, secure: false, sameSite: "unknown", expiration: "2026-06-07T00:00:00Z", isThirdParty: true, isBlocked: false, detectionSource: "pattern", firstSeen: "2026-01-20T09:12:00Z", lastSeen: "2026-02-07T16:22:00Z" },
  { id: "c6", name: "_hjid", domain: "hotjar.com", company: "Hotjar", category: "analytics", value: "xxx", httpOnly: false, secure: true, sameSite: "lax", expiration: "2026-08-07T00:00:00Z", isThirdParty: true, isBlocked: false, detectionSource: "pixel", firstSeen: "2026-01-28T12:22:00Z", lastSeen: "2026-02-07T13:45:00Z" },
]

const MOCK_COMPANY_GROUPS: CompanyGroup[] = [
  {
    company: "Google",
    domains: [
      {
        domain: "doubleclick.net",
        trackers: [MOCK_TRACKERS[0]],
        cookies: [{ id: "c3", name: "IDE", domain: "doubleclick.net", category: "advertising" }],
      },
      {
        domain: "google-analytics.com",
        trackers: [MOCK_TRACKERS[2]],
        cookies: [{ id: "c1", name: "_ga", domain: "google-analytics.com", category: "analytics" }],
      },
    ],
  },
  {
    company: "Meta",
    domains: [
      {
        domain: "facebook.com",
        trackers: [MOCK_TRACKERS[1]],
        cookies: [{ id: "c2", name: "_fbp", domain: "facebook.com", category: "tracking" }],
      },
    ],
  },
  {
    company: "Amazon",
    domains: [
      {
        domain: "amazon-adsystem.com",
        trackers: [MOCK_TRACKERS[3]],
        cookies: [{ id: "c4", name: "ad-id", domain: "amazon-adsystem.com", category: "advertising" }],
      },
    ],
  },
  {
    company: "Comscore",
    domains: [
      {
        domain: "scorecardresearch.com",
        trackers: [MOCK_TRACKERS[4]],
        cookies: [{ id: "c5", name: "UID", domain: "scorecardresearch.com", category: "analytics" }],
      },
    ],
  },
  {
    company: "X Corp",
    domains: [
      {
        domain: "twitter.com",
        trackers: [MOCK_TRACKERS[5]],
        cookies: [],
      },
    ],
  },
  {
    company: "Taboola",
    domains: [
      {
        domain: "taboola.com",
        trackers: [MOCK_TRACKERS[6]],
        cookies: [],
      },
    ],
  },
  {
    company: "Hotjar",
    domains: [
      {
        domain: "hotjar.com",
        trackers: [MOCK_TRACKERS[7]],
        cookies: [{ id: "c6", name: "_hjid", domain: "hotjar.com", category: "analytics" }],
      },
    ],
  },
]

export default function Trackers() {
  const [activeTab, setActiveTab] = useState<SubTab>("trackers")
  const [search, setSearch] = useState("")

  const filteredTrackers = useMemo(() => {
    if (!search) return MOCK_TRACKERS
    const q = search.toLowerCase()
    return MOCK_TRACKERS.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.domain.toLowerCase().includes(q) ||
        t.company.toLowerCase().includes(q)
    )
  }, [search])

  const filteredCookies = useMemo(() => {
    if (!search) return MOCK_COOKIES
    const q = search.toLowerCase()
    return MOCK_COOKIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q)
    )
  }, [search])

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

      {/* Top 5 ranking tables side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Top 5 — By Initiator" delay={1}>
          {(MOCK_STATS.topByInitiator).length === 0 ? (
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
                  {MOCK_STATS.topByInitiator.slice(0, 5).map((item, idx) => (
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
          {(MOCK_STATS.topByDomain).length === 0 ? (
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
                  {MOCK_STATS.topByDomain.slice(0, 5).map((item, idx) => (
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
        {MOCK_COMPANY_GROUPS.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-[var(--cyber-text-muted)] text-sm">
            <span className="text-2xl mb-2 opacity-40">[ ]</span>
            No data yet
          </div>
        ) : (
          <div className="space-y-1">
            {MOCK_COMPANY_GROUPS.map((group) => (
              <CompanyAccordion key={group.company} group={group} />
            ))}
          </div>
        )}
      </Panel>

      {/* Main data table — Trackers or Cookies depending on sub-tab */}
      <Panel title={activeTab === "trackers" ? "All Trackers" : "All Cookies"} delay={4}>
        <div className="flex items-center gap-4 mb-4">
          <input
            type="search"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs rounded-md border border-[var(--cyber-border)] bg-[var(--cyber-bg)] px-3 py-2 text-sm text-[var(--cyber-text)] placeholder-[var(--cyber-text-muted)] focus:border-[var(--cyber-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--cyber-accent)]"
          />
          <span className="text-xs text-[var(--cyber-text-muted)]">Using demo data</span>
        </div>

        <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
          {activeTab === "trackers" ? (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--cyber-surface)]">
                <tr className="border-b border-[var(--cyber-border)] text-left text-xs font-medium uppercase tracking-widest text-[var(--cyber-accent)]">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Domain</th>
                  <th className="pb-3 pr-4">Company</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Source</th>
                  <th className="pb-3 pr-4 text-right">Hits</th>
                </tr>
              </thead>
              <tbody className="text-[var(--cyber-text-muted)]">
                {filteredTrackers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg opacity-40">[ ]</span>
                        <span className="text-[var(--cyber-text-muted)]">No data yet</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTrackers.map((t) => (
                    <tr key={t.id} className="border-b border-[var(--cyber-border)]/50 hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 pr-4 text-[var(--cyber-text)] font-medium">{t.name}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{t.domain}</td>
                      <td className="py-2.5 pr-4">{t.company}</td>
                      <td className="py-2.5 pr-4"><CategoryBadge category={t.category} /></td>
                      <td className="py-2.5 pr-4"><SourceBadge source={t.detectionSource} /></td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--cyber-text)]">{t.occurrences.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--cyber-surface)]">
                <tr className="border-b border-[var(--cyber-border)] text-left text-xs font-medium uppercase tracking-widest text-[var(--cyber-accent-green)]">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Domain</th>
                  <th className="pb-3 pr-4">Company</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Flags</th>
                  <th className="pb-3 pr-4">SameSite</th>
                </tr>
              </thead>
              <tbody className="text-[var(--cyber-text-muted)]">
                {filteredCookies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg opacity-40">[ ]</span>
                        <span className="text-[var(--cyber-text-muted)]">No data yet</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCookies.map((c) => (
                    <tr key={c.id} className="border-b border-[var(--cyber-border)]/50 hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 pr-4 text-[var(--cyber-text)] font-medium font-mono text-xs">{c.name}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{c.domain}</td>
                      <td className="py-2.5 pr-4">{c.company}</td>
                      <td className="py-2.5 pr-4"><CategoryBadge category={c.category} /></td>
                      <td className="py-2.5 pr-4">
                        <div className="flex gap-1">
                          {c.httpOnly && <FlagBadge label="HttpOnly" />}
                          {c.secure && <FlagBadge label="Secure" />}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="text-xs font-mono text-[var(--cyber-text-muted)]">{c.sameSite}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  )
}

// ---------- Company Accordion ----------

function CompanyAccordion({ group }: { group: CompanyGroup }) {
  const [open, setOpen] = useState(false)
  const totalItems = group.domains.reduce((sum, d) => sum + d.trackers.length + d.cookies.length, 0)

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
        <span className="text-xs text-[var(--cyber-text-muted)] tabular-nums">{totalItems} items</span>
      </button>
      {open && (
        <div className="border-t border-[var(--cyber-border)]/30 pl-6">
          {group.domains.map((d) => (
            <DomainAccordion key={d.domain} domainData={d} />
          ))}
        </div>
      )}
    </div>
  )
}

function DomainAccordion({ domainData }: { domainData: CompanyGroup["domains"][number] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-[var(--cyber-border)]/20 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[var(--cyber-accent-green)] text-xs font-mono">{open ? "v" : ">"}</span>
          <span className="text-xs font-mono text-[var(--cyber-text)]">{domainData.domain}</span>
        </div>
        <span className="text-[10px] text-[var(--cyber-text-muted)]">
          {domainData.cookies.length}c / {domainData.trackers.length}t
        </span>
      </button>
      {open && (
        <div className="pl-8 pb-2 space-y-1">
          {domainData.cookies.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--cyber-accent-green)] mb-1 px-2">Cookies</p>
              {domainData.cookies.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-2 py-1 text-xs text-[var(--cyber-text-muted)] hover:bg-white/[0.02] rounded">
                  <span className="font-mono">{c.name}</span>
                  <CategoryBadge category={c.category} />
                </div>
              ))}
            </div>
          )}
          {domainData.trackers.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--cyber-accent)] mb-1 px-2 mt-2">Trackers</p>
              {domainData.trackers.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-2 py-1 text-xs text-[var(--cyber-text-muted)] hover:bg-white/[0.02] rounded">
                  <span className="font-medium text-[var(--cyber-text)]">{t.name}</span>
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={t.category} />
                    <span className="tabular-nums">{t.occurrences.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {domainData.cookies.length === 0 && domainData.trackers.length === 0 && (
            <p className="text-xs text-[var(--cyber-text-muted)] px-2 py-1">No items</p>
          )}
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

const SOURCE_LABELS: Record<string, string> = {
  hardcoded: "HC",
  duckduckgo: "DDG",
  pattern: "PTN",
  pixel: "PXL",
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-white/5 border border-[var(--cyber-border)] px-2 py-0.5 text-[10px] font-mono tracking-wider text-[var(--cyber-text-muted)]">
      {SOURCE_LABELS[source] ?? source}
    </span>
  )
}

function FlagBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-[var(--cyber-accent-green)]/8 border border-[var(--cyber-accent-green)]/20 px-1.5 py-0.5 text-[9px] font-mono tracking-wider text-[var(--cyber-accent-green)]">
      {label}
    </span>
  )
}
