import { useState } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts"
import Panel from "../components/Panel.tsx"
import { useUserEmail } from "../hooks/useUserEmail"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

type DomainScore = {
  domain: string
  score: number
  reason: string
}

type SecurityReportData = {
  overallScore: number
  summary: string
  top3Least: DomainScore[]
  domainScores: DomainScore[]
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--cyber-accent-green)"
  if (score >= 50) return "#f59e0b"
  return "var(--cyber-danger)"
}

function ScoreRing({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = scoreColor(score)

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke="var(--cyber-border)"
          strokeWidth="8"
        />
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text
          x="70" y="70"
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize="32"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {score}
        </text>
      </svg>
      <span className="text-xs text-[var(--cyber-text-muted)] mt-1 tracking-wider uppercase">
        Security Score
      </span>
    </div>
  )
}

export default function SecurityReport() {
  const email = useUserEmail()
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })
  const [report, setReport] = useState<SecurityReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const generateReport = () => {
    if (!email) return
    setLoading(true)
    setError("")
    setReport(null)

    const params = new URLSearchParams({ email, start_date: startDate })
    fetch(`${API_URL}/api/security-report?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setReport(data)
      })
      .catch((err) => {
        console.error("Failed to generate security report:", err)
        setError(err.message || "Failed to generate report")
      })
      .finally(() => setLoading(false))
  }

  if (!email) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--cyber-text-muted)]">
        Please log in to generate a security report.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date picker + generate button */}
      <Panel title="Generate Report" delay={1}>
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-xs text-[var(--cyber-text-muted)] mb-1 uppercase tracking-wider">
              Start date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-[var(--cyber-border)] bg-[var(--cyber-bg)] px-3 py-2 text-sm text-[var(--cyber-text)] focus:border-[var(--cyber-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--cyber-accent)]"
            />
          </div>
          <div className="text-xs text-[var(--cyber-text-muted)] pb-2">to today</div>
          <button
            onClick={generateReport}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--cyber-accent)]/10 text-[var(--cyber-accent)] border border-[var(--cyber-accent)]/30 hover:bg-[var(--cyber-accent)]/20 transition-colors disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Generate Report"}
          </button>
        </div>
        {error && (
          <div className="mt-3 text-sm text-[var(--cyber-danger)]">{error}</div>
        )}
      </Panel>

      {loading && (
        <div className="h-64 flex flex-col items-center justify-center text-[var(--cyber-text-muted)] text-sm">
          <div className="w-8 h-8 border-2 border-[var(--cyber-accent)]/30 border-t-[var(--cyber-accent)] rounded-full animate-spin mb-4" />
          Analyzing your tracking data with AI...
        </div>
      )}

      {report && (
        <>
          {/* Overall Score + Summary */}
          <Panel title="Overall Security Assessment" delay={2}>
            <div className="flex items-start gap-8">
              <ScoreRing score={report.overallScore} />
              <div className="flex-1">
                <p className="text-sm text-[var(--cyber-text)] leading-relaxed whitespace-pre-line">
                  {report.summary}
                </p>
              </div>
            </div>
          </Panel>

          {/* Top 3 Least Secure Sites */}
          <Panel title="Top 3 Least Secure Sites" delay={3}>
            {report.top3Least.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-[var(--cyber-text-muted)] text-sm">
                No data available
              </div>
            ) : (
              <div className="space-y-0">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={report.top3Least}
                    layout="vertical"
                    margin={{ left: 10, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--cyber-border)" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: "var(--cyber-text-muted)", fontSize: 10 }}
                      stroke="var(--cyber-border)"
                    />
                    <YAxis
                      type="category"
                      dataKey="domain"
                      tick={{ fill: "var(--cyber-text-muted)", fontSize: 10 }}
                      stroke="var(--cyber-border)"
                      width={140}
                    />
                    <Bar dataKey="score" name="Security Score" radius={[0, 4, 4, 0]}>
                      {report.top3Least.map((entry) => (
                        <Cell key={entry.domain} fill={scoreColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {report.top3Least.map((site) => (
                    <div key={site.domain} className="flex items-start gap-3 px-2">
                      <span
                        className="text-xs font-bold tabular-nums min-w-[2rem] text-right"
                        style={{ color: scoreColor(site.score) }}
                      >
                        {site.score}
                      </span>
                      <span className="text-xs font-mono text-[var(--cyber-text)]">{site.domain}</span>
                      <span className="text-xs text-[var(--cyber-text-muted)] flex-1">{site.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          {/* All Domain Scores */}
          <Panel title="Domain Security Scores" delay={4}>
            {report.domainScores.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-[var(--cyber-text-muted)] text-sm">
                No data available
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={Math.max(300, report.domainScores.length * 28)}>
                  <BarChart
                    data={report.domainScores}
                    layout="vertical"
                    margin={{ left: 10, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--cyber-border)" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: "var(--cyber-text-muted)", fontSize: 10 }}
                      stroke="var(--cyber-border)"
                    />
                    <YAxis
                      type="category"
                      dataKey="domain"
                      tick={{ fill: "var(--cyber-text-muted)", fontSize: 9 }}
                      stroke="var(--cyber-border)"
                      width={160}
                    />
                    <Bar dataKey="score" name="Score" radius={[0, 4, 4, 0]}>
                      {report.domainScores.map((entry) => (
                        <Cell key={entry.domain} fill={scoreColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </Panel>
        </>
      )}
    </div>
  )
}
