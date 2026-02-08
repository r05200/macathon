import { useState, useEffect, useMemo } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import Panel from "../components/Panel.tsx"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const TIME_RANGES = ["24h", "7d", "30d"] as const
type Range = (typeof TIME_RANGES)[number]

type DailyCount = { date: string; count: number }
type MergedPoint = { date: string; trackers: number; cookies: number }

function rangeToDays(range: Range): number {
  if (range === "24h") return 1
  if (range === "7d") return 7
  return 30
}

function mergeDaily(trackers: DailyCount[], cookies: DailyCount[]): MergedPoint[] {
  const map = new Map<string, MergedPoint>()
  for (const t of trackers) {
    map.set(t.date, { date: t.date, trackers: t.count, cookies: 0 })
  }
  for (const c of cookies) {
    const existing = map.get(c.date)
    if (existing) {
      existing.cookies = c.count
    } else {
      map.set(c.date, { date: c.date, trackers: 0, cookies: c.count })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export default function Trends() {
  const [range, setRange] = useState<Range>("7d")
  const [trackerDaily, setTrackerDaily] = useState<DailyCount[]>([])
  const [cookieDaily, setCookieDaily] = useState<DailyCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const days = rangeToDays(range)
    setLoading(true)
    fetch(`${API_URL}/api/trends?days=${days}`)
      .then((res) => res.json())
      .then((data) => {
        setTrackerDaily(data.trackerDaily || [])
        setCookieDaily(data.cookieDaily || [])
      })
      .catch((err) => {
        console.error("Failed to fetch trends:", err)
      })
      .finally(() => setLoading(false))
  }, [range])

  const merged = useMemo(() => mergeDaily(trackerDaily, cookieDaily), [trackerDaily, cookieDaily])

  return (
    <div className="space-y-6">
      <Panel title="Time-based trends" delay={1}>
        <div className="flex gap-2 mb-4">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium tracking-wide transition-colors ${
                range === r
                  ? "bg-[var(--cyber-accent)]/10 text-[var(--cyber-accent)] border border-[var(--cyber-accent)]/30"
                  : "text-[var(--cyber-text-muted)] hover:bg-white/5 border border-transparent"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-[var(--cyber-text-muted)] text-sm">
            Loading trends...
          </div>
        ) : merged.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-[var(--cyber-text-muted)] text-sm">
            <span className="text-2xl mb-2 opacity-40">[ ]</span>
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={merged}>
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
                width={40}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "var(--cyber-text-muted)" }}
              />
              <Line
                type="monotone"
                dataKey="trackers"
                stroke="var(--cyber-accent)"
                strokeWidth={2}
                dot={false}
                name="Trackers / day"
              />
              <Line
                type="monotone"
                dataKey="cookies"
                stroke="var(--cyber-accent-green)"
                strokeWidth={2}
                dot={false}
                name="Cookies / day"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  )
}
