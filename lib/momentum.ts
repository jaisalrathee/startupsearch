import { sicLabel } from "@/lib/sic"
import { withTTL } from "@/lib/cache"

const API_BASE = "https://api.company-information.service.gov.uk"

export interface MomentumPoint {
  code: string
  label: string
  recent: number // last 7d count
  prior: number // 8-30d count
  recentRate: number // per day in last 7d
  priorRate: number // per day in 8-30d
  delta: number // (recentRate / priorRate) - 1, capped sensibly
  signal: "accelerating" | "cooling" | "flat"
}

// SIC codes worth tracking momentum on. Mix of high-volume and emerging.
const TRACKED = [
  "62012", // Software dev
  "62020", // IT consultancy
  "62090", // Other IT
  "63110", // Data hosting
  "63120", // Web portals
  "68100", // Real estate sale
  "68209", // Letting
  "68310", // Real estate agency
  "70229", // Management consultancy
  "74100", // Specialised design
  "73110", // Advertising
  "47910", // Online retail
  "56101", // Restaurants
  "56103", // Takeaways
  "85590", // Other education
  "86220", // Medical specialist
  "82990", // Other business support
  "41202", // Domestic construction
  "43210", // Electrical install
  "96090", // Other services
]

function ymd(d: Date) {
  return d.toISOString().slice(0, 10)
}

async function countHits(apiKey: string, sic: string, from: string, to: string): Promise<number> {
  const params = new URLSearchParams({
    incorporated_from: from,
    incorporated_to: to,
    sic_codes: sic,
    size: "1",
  })
  const url = `${API_BASE}/advanced-search/companies?${params.toString()}`
  const auth = Buffer.from(`${apiKey}:`).toString("base64")

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(url, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (res.ok) {
        const j = await res.json()
        return j.hits ?? 0
      }
      if (res.status === 404) return 0
      if (res.status === 401) throw new Error("API key rejected")
    } catch {
      // fall through to retry
    }
    await new Promise((r) => setTimeout(r, 250 + attempt * 300))
  }
  return 0
}

export async function fetchMomentum(): Promise<MomentumPoint[]> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY
  if (!apiKey) return demoMomentum()

  // Cache for 30 minutes — this is a slow-moving aggregate.
  return withTTL("momentum:v1", 30 * 60 * 1000, async () => {
    const now = new Date()
    now.setUTCHours(12, 0, 0, 0)
    const today = ymd(now)
    const d7 = new Date(now)
    d7.setUTCDate(d7.getUTCDate() - 6)
    const d8 = new Date(now)
    d8.setUTCDate(d8.getUTCDate() - 7)
    const d30 = new Date(now)
    d30.setUTCDate(d30.getUTCDate() - 29)

    const recentFrom = ymd(d7)
    const priorFrom = ymd(d30)
    const priorTo = ymd(d8)

    // Strictly sequential — Companies House throttles at ~600 req / 5 min.
    const results: MomentumPoint[] = []
    for (const code of TRACKED) {
      const recent = await countHits(apiKey, code, recentFrom, today)
      const prior = await countHits(apiKey, code, priorFrom, priorTo)
      const recentRate = recent / 7
      const priorRate = prior / 23
      const delta = priorRate > 0 ? recentRate / priorRate - 1 : recentRate > 0 ? 1 : 0
      const signal: MomentumPoint["signal"] =
        delta > 0.15 ? "accelerating" : delta < -0.15 ? "cooling" : "flat"
      results.push({
        code,
        label: sicLabel(code),
        recent,
        prior,
        recentRate,
        priorRate,
        delta,
        signal,
      })
    }

    return results
      .filter((p) => p.recent + p.prior >= 20)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  })
}

function demoMomentum(): MomentumPoint[] {
  return TRACKED.slice(0, 10).map((code, i) => ({
    code,
    label: sicLabel(code),
    recent: 200 - i * 12,
    prior: 600 - i * 30,
    recentRate: (200 - i * 12) / 7,
    priorRate: (600 - i * 30) / 23,
    delta: 0.3 - i * 0.07,
    signal: i < 4 ? "accelerating" : i > 6 ? "cooling" : "flat",
  }))
}
