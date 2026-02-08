// ============================================
// Tracker API Service
// Replace BASE_URL with your actual backend URL
// ============================================

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

// ---------- Types ----------

export type Tracker = {
  id: string
  name: string
  domain: string
  company: string
  category: "tracking" | "advertising" | "analytics" | "social" | "functional" | "unknown"
  occurrences: number
  isThirdParty: boolean
  isBlocked: boolean
  isPotential: boolean
  detectionSource: "hardcoded" | "duckduckgo" | "pattern" | "pixel"
  firstSeen: string
  lastSeen: string
}

export type TopTrackerByInitiator = {
  initiator: string   // the site that triggered the tracker (e.g. "cnn.com")
  count: number
}

export type TopTrackerByDomain = {
  domain: string       // the tracker domain (e.g. "doubleclick.net")
  company: string
  count: number
}

export type DailyCount = {
  date: string
  count: number
}

export type TrackerStats = {
  totalTrackers: number
  totalBlocked: number
  topByInitiator: TopTrackerByInitiator[]
  topByDomain: TopTrackerByDomain[]
  trackersPerDay: DailyCount[]
}

export type TrackerListResponse = {
  trackers: Tracker[]
  total: number
  page: number
  pageSize: number
}

export type CompanyDomain = {
  domain: string
  trackers: Tracker[]
  cookies: { id: string; name: string; domain: string; category: string }[]
}

export type CompanyGroup = {
  company: string
  domains: CompanyDomain[]
}

// ---------- API Calls ----------

export async function fetchTrackerStats(range?: string): Promise<TrackerStats> {
  const query = new URLSearchParams()
  if (range) query.set("range", range)
  const res = await fetch(`${BASE_URL}/trackers/stats?${query}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function fetchCompanyGroups(): Promise<CompanyGroup[]> {
  const res = await fetch(`${BASE_URL}/trackers/companies`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function fetchTrackers(params?: {
  search?: string
  page?: number
  pageSize?: number
}): Promise<TrackerListResponse> {
  const query = new URLSearchParams()
  if (params?.search) query.set("search", params.search)
  if (params?.page) query.set("page", String(params.page))
  if (params?.pageSize) query.set("pageSize", String(params.pageSize))

  const res = await fetch(`${BASE_URL}/trackers?${query}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}
