const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

// ---------- Types ----------

export type OverviewStats = {
  totalEvents: number
  uniqueSites: number
  totalTrackers: number
  totalCookies: number
}

export type TimeSeriesPoint = {
  date: string
  value: number
}

// ---------- API Calls ----------

export async function fetchOverviewStats(): Promise<OverviewStats> {
  const res = await fetch(`${BASE_URL}/overview/stats`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function fetchOverviewTimeSeries(range: string = "7d"): Promise<TimeSeriesPoint[]> {
  const res = await fetch(`${BASE_URL}/overview/timeseries?range=${range}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}
