import { useState, useEffect, useMemo } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts"
import Panel from "../components/Panel.tsx"

const TIME_RANGES = ["24h", "7d", "30d"] as const
type Range = (typeof TIME_RANGES)[number]

type DailyCount = { date: string; count: number }
type MergedPoint = { date: string; trackers: number; cookies: number }

function generateMockDaily(days: number): DailyCount[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return { date: d.toISOString().slice(0, 10), count: 30 + Math.round(Math.random() * 60) }
  })
}

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

  useEffect(() => {
    // Future: replace with API calls
    const days = rangeToDays(range)
    setTrackerDaily(generateMockDaily(days))
    setCookieDaily(generateMockDaily(days))
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

        {merged.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-[var(--cyber-text-muted)] text-sm">
            <span className="text-2xl mb-2 opacity-40">[ ]</span>
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
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
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--cyber-surface)",
                  border: "1px solid var(--cyber-border)",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "var(--cyber-text)",
                }}
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
