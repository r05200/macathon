import { useState, useEffect } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts"
import Panel from "../components/Panel.tsx"
import KpiCard from "../components/KpiCard.tsx"
import { useUserEmail } from "../hooks/useUserEmail"

// ===== TYPES =====
type OverviewStats = {
  totalEvents: number
  uniqueSites: number
  totalTrackers: number
  totalCookies: number
}

type TimeSeriesPoint = {
  date: string
  value: number
}

type CategoryPoint = {
  category: string
  count: number
}

const CATEGORY_COLORS: Record<string, string> = {
  advertising: "#f59e0b",
  analytics: "var(--cyber-accent)",
  tracking: "var(--cyber-danger)",
  social: "#818cf8",
  functional: "var(--cyber-accent-green)",
  unknown: "var(--cyber-text-muted)",
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

export default function Overview() {
  const email = useUserEmail()
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([])
  const [categories, setCategories] = useState<CategoryPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!email) {
      setLoading(false)
      setStats(null)
      setTimeSeries([])
      setCategories([])
      return
    }

    setLoading(true)
    const params = new URLSearchParams({ email })
    fetch(`${API_URL}/api/overview?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setStats({
          totalEvents: data.totalEvents,
          uniqueSites: data.uniqueSites,
          totalTrackers: data.totalTrackers,
          totalCookies: data.totalCookies,
        })
        setTimeSeries(data.timeSeries)
        setCategories(data.categories)
      })
      .catch((err) => {
        console.error("Failed to fetch overview:", err)
      })
      .finally(() => setLoading(false))
  }, [email])

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--cyber-text-muted)]">
        Loading overview...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total events"
          value={stats.totalEvents.toLocaleString()}
          delay={1}
        />
        <KpiCard
          label="Unique sites"
          value={stats.uniqueSites.toLocaleString()}
          delay={2}
        />
        <KpiCard
          label="Trackers"
          value={stats.totalTrackers.toLocaleString()}
          delay={3}
        />
        <KpiCard
          label="Cookies"
          value={stats.totalCookies.toLocaleString()}
          delay={4}
        />
      </div>

      <Panel title="Total Events (7d)" delay={5}>
        {timeSeries.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-[var(--cyber-text-muted)] text-sm">
            <span className="text-2xl mb-2 opacity-40">[ ]</span>
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--cyber-border)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--cyber-text-muted)", fontSize: 10 }}
                tickFormatter={(v: string) => v.slice(5)}
                stroke="var(--cyber-border)"
              />
              <YAxis
                tick={{ fill: "var(--cyber-text-muted)", fontSize: 10 }}
                stroke="var(--cyber-border)"
                width={45}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--cyber-accent)"
                strokeWidth={2}
                dot={false}
                name="Events"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel title="Categories" delay={6}>
        {categories.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-[var(--cyber-text-muted)] border border-dashed border-[var(--cyber-border)] rounded-md bg-[var(--cyber-bg)]/50">
            No category data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categories} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--cyber-border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "var(--cyber-text-muted)", fontSize: 10 }}
                stroke="var(--cyber-border)"
              />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fill: "var(--cyber-text-muted)", fontSize: 10 }}
                stroke="var(--cyber-border)"
                width={80}
              />
              <Bar dataKey="count" name="Trackers" radius={[0, 4, 4, 0]}>
                {categories.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={CATEGORY_COLORS[entry.category] || "var(--cyber-text-muted)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  )
}
