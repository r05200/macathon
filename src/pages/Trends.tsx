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
import { useUserEmail } from "../hooks/useUserEmail"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const TIME_RANGES = ["7d", "30d", "6m"] as const
type Range = (typeof TIME_RANGES)[number]

type DailyCount = { date: string; count: number; isReal?: boolean }
type MergedPoint = { date: string; trackers: number; cookies: number; trackersReal?: boolean; cookiesReal?: boolean }

function rangeToDays(range: Range): number {
  if (range === "7d") return 7
  if (range === "30d") return 30
  return 180
}

function mergeDaily(trackers: DailyCount[], cookies: DailyCount[]): MergedPoint[] {
  const map = new Map<string, MergedPoint>()
  for (const t of trackers) {
    map.set(t.date, { date: t.date, trackers: t.count, cookies: 0, trackersReal: t.isReal, cookiesReal: false })
  }
  for (const c of cookies) {
    const existing = map.get(c.date)
    if (existing) {
      existing.cookies = c.count
      existing.cookiesReal = c.isReal
    } else {
      map.set(c.date, { date: c.date, trackers: 0, cookies: c.count, trackersReal: false, cookiesReal: c.isReal })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export default function Trends() {
  const email = useUserEmail()
  const [range, setRange] = useState<Range>("7d")
  const [trackerDaily, setTrackerDaily] = useState<DailyCount[]>([])
  const [cookieDaily, setCookieDaily] = useState<DailyCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!email) {
      setLoading(false)
      setTrackerDaily([])
      setCookieDaily([])
      return
    }

    const days = rangeToDays(range)
    setLoading(true)
    const params = new URLSearchParams({ email, days: String(days) })
    fetch(`${API_URL}/api/trends?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setTrackerDaily(data.trackerDaily || [])
        setCookieDaily(data.cookieDaily || [])
      })
      .catch((err) => {
        console.error("Failed to fetch trends:", err)
      })
      .finally(() => setLoading(false))
  }, [range, email])

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
          <>
            <div className="flex items-center gap-4 mb-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--cyber-accent)]" />
                <span className="text-[var(--cyber-text-muted)]">Real Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[var(--cyber-accent)] opacity-50" />
                <span className="text-[var(--cyber-text-muted)]">Demo Data</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={merged}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cyber-border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--cyber-text-muted)", fontSize: 10 }}
                  tickFormatter={(v: string) => v.slice(5)}
                  stroke="var(--cyber-border)"
                  interval={range === "6m" ? 13 : range === "30d" ? 2 : undefined}
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
                  dot={(props: any) => {
                    const { cx, cy, payload } = props
                    if (payload.trackersReal) {
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill="var(--cyber-accent)"
                          stroke="var(--cyber-bg)"
                          strokeWidth={2}
                        />
                      )
                    }
                    return null
                  }}
                  name="Trackers / day"
                />
                <Line
                  type="monotone"
                  dataKey="cookies"
                  stroke="var(--cyber-accent-green)"
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props
                    if (payload.cookiesReal) {
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill="var(--cyber-accent-green)"
                          stroke="var(--cyber-bg)"
                          strokeWidth={2}
                        />
                      )
                    }
                    return null
                  }}
                  name="Cookies / day"
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </Panel>
    </div>
  )
}
