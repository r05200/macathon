import { useState, useEffect } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import Panel from "../components/Panel.tsx"
import KpiCard from "../components/KpiCard.tsx"

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

// ===== MOCK DATA =====
const MOCK_STATS: OverviewStats = {
  totalEvents: 12847,
  uniqueSites: 423,
  totalTrackers: 156,
  totalCookies: 891,
}

const MOCK_TIMESERIES: TimeSeriesPoint[] = Array.from({ length: 7 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (6 - i))
  return {
    date: d.toISOString().slice(0, 10),
    value: 1200 + Math.round(Math.random() * 800),
  }
})

export default function Overview() {
  const [stats, setStats] = useState<OverviewStats>(MOCK_STATS)
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>(MOCK_TIMESERIES)

  useEffect(() => {
    // Future: replace with API call
    setStats(MOCK_STATS)
    setTimeSeries(MOCK_TIMESERIES)
  }, [])

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Total Events (7d)" delay={5}>
          {timeSeries.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-[var(--cyber-text-muted)] text-sm">
              <span className="text-2xl mb-2 opacity-40">[ ]</span>
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--cyber-surface)",
                    border: "1px solid var(--cyber-border)",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "var(--cyber-text)",
                  }}
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
          <div className="h-48 flex items-center justify-center text-sm text-[var(--cyber-text-muted)] border border-dashed border-[var(--cyber-border)] rounded-md bg-[var(--cyber-bg)]/50">
            Category breakdown placeholder
          </div>
        </Panel>
      </div>
    </div>
  )
}
