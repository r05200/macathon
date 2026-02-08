const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

// ---------- Types ----------

export type Cookie = {
  id: string
  name: string
  domain: string
  company: string
  category: "tracking" | "advertising" | "analytics" | "social" | "functional" | "unknown"
  value: string
  httpOnly: boolean
  secure: boolean
  sameSite: "strict" | "lax" | "none" | "unknown"
  expiration: string
  isThirdParty: boolean
  isBlocked: boolean
  detectionSource: "hardcoded" | "duckduckgo" | "pattern" | "pixel"
  firstSeen: string
  lastSeen: string
}

export type DailyCount = {
  date: string
  count: number
}

export type CookieStats = {
  totalCookies: number
  totalBlocked: number
  cookiesPerDay: DailyCount[]
}

export type CookieListResponse = {
  cookies: Cookie[]
  total: number
  page: number
  pageSize: number
}

// ---------- API Calls ----------

export async function fetchCookieStats(range?: string): Promise<CookieStats> {
  const query = new URLSearchParams()
  if (range) query.set("range", range)
  const res = await fetch(`${BASE_URL}/cookies/stats?${query}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function fetchCookies(params?: {
  search?: string
  page?: number
  pageSize?: number
}): Promise<CookieListResponse> {
  const query = new URLSearchParams()
  if (params?.search) query.set("search", params.search)
  if (params?.page) query.set("page", String(params.page))
  if (params?.pageSize) query.set("pageSize", String(params.pageSize))

  const res = await fetch(`${BASE_URL}/cookies?${query}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}
