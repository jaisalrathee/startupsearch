import { withTTL } from "@/lib/cache"

const API_BASE = "https://api.company-information.service.gov.uk"

export interface ZeitgeistPoint {
  term: string
  recent: number
  prior: number
  delta: number // (recent/7) / (prior/23) - 1
  signal: "trending" | "fading" | "flat"
}

const TERMS = [
  "AI",
  "GPT",
  "Quantum",
  "Crypto",
  "Web3",
  "Solar",
  "Green",
  "Carbon",
  "Bio",
  "Pharma",
  "Wellness",
  "Cyber",
  "Cloud",
  "Studio",
  "Labs",
  "Ventures",
  "Capital",
  "Holdings",
  "Property",
  "Robotics",
  "Health",
  "Energy",
  "Digital",
  "Tech",
]

function ymd(d: Date) {
  return d.toISOString().slice(0, 10)
}

async function countHits(apiKey: string, term: string, from: string, to: string): Promise<number> {
  const params = new URLSearchParams({
    incorporated_from: from,
    incorporated_to: to,
    company_name_includes: term,
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
      // retry
    }
    await new Promise((r) => setTimeout(r, 250 + attempt * 300))
  }
  return 0
}

export async function fetchZeitgeist(): Promise<ZeitgeistPoint[]> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY
  if (!apiKey) return demoZeitgeist()

  return withTTL("zeitgeist:v1", 30 * 60 * 1000, async () => {
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

    const results: ZeitgeistPoint[] = []
    for (const term of TERMS) {
      const recent = await countHits(apiKey, term, recentFrom, today)
      const prior = await countHits(apiKey, term, priorFrom, priorTo)
      const recentRate = recent / 7
      const priorRate = prior / 23
      const delta = priorRate > 0 ? recentRate / priorRate - 1 : recentRate > 0 ? 1 : 0
      const signal: ZeitgeistPoint["signal"] =
        delta > 0.2 ? "trending" : delta < -0.2 ? "fading" : "flat"
      results.push({ term, recent, prior, delta, signal })
    }

    return results.sort((a, b) => b.delta - a.delta)
  })
}

function demoZeitgeist(): ZeitgeistPoint[] {
  return TERMS.slice(0, 12).map((term, i) => ({
    term,
    recent: 80 - i * 4,
    prior: 200 - i * 12,
    delta: 0.5 - i * 0.08,
    signal: i < 3 ? "trending" : i > 8 ? "fading" : "flat",
  }))
}
