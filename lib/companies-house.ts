import { sicLabel } from "@/lib/sic"
import { withTTL } from "@/lib/cache"
import {
  DEFAULT_FILTERS,
  type Bucket,
  type Company,
  type Filters,
  type Insights,
  type RadarResponse,
  type RangeKey,
  type TrendPoint,
} from "@/lib/types"

const API_BASE = "https://api.company-information.service.gov.uk"

const SIGNAL_TERMS = [
  "AI",
  "Tech",
  "Studio",
  "Labs",
  "Digital",
  "Capital",
  "Ventures",
  "Property",
  "Cloud",
  "Crypto",
  "Health",
  "Energy",
  "Green",
  "Quantum",
  "Robotics",
]

const REGION_MAP: Array<{ match: RegExp; region: string }> = [
  { match: /london|wc\d|ec\d|sw\d|se\d|nw\d|n\d|w\d|e\d/i, region: "London" },
  { match: /manchester|liverpool|preston|blackpool|chester/i, region: "North West" },
  { match: /leeds|sheffield|york|hull|bradford/i, region: "Yorkshire & Humber" },
  { match: /birmingham|coventry|wolverhampton|stoke/i, region: "West Midlands" },
  { match: /nottingham|leicester|derby/i, region: "East Midlands" },
  { match: /bristol|bath|exeter|plymouth|cornwall/i, region: "South West" },
  { match: /oxford|brighton|reading|guildford|southampton|portsmouth|kent|surrey|sussex/i, region: "South East" },
  { match: /cambridge|norwich|peterborough|chelmsford|essex|hertfordshire|bedford/i, region: "East of England" },
  { match: /newcastle|durham|sunderland|middlesbrough/i, region: "North East" },
  { match: /cardiff|swansea|newport|wales/i, region: "Wales" },
  { match: /edinburgh|glasgow|aberdeen|dundee|scotland/i, region: "Scotland" },
  { match: /belfast|derry|lisburn|northern ireland/i, region: "Northern Ireland" },
]

// How many days we sample for the trend line per range.
const TREND_DAYS: Record<Exclude<RangeKey, "custom">, number> = {
  today: 1,
  yesterday: 1,
  last7: 7,
  last30: 30,
}

// Max items we request per filtered page query.
const TABLE_QUERY_SIZE = 100
const INSIGHTS_SAMPLE_SIZE = 500

function ymd(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function resolveRange(filters: Filters) {
  if (filters.range === "custom" && filters.customStart && filters.customEnd) {
    return { start: filters.customStart, end: filters.customEnd }
  }
  const now = new Date()
  now.setUTCHours(12, 0, 0, 0)
  if (filters.range === "today") return { start: ymd(now), end: ymd(now) }
  if (filters.range === "yesterday") {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - 1)
    return { start: ymd(d), end: ymd(d) }
  }
  const days = filters.range === "last7" ? 6 : 29
  const start = new Date(now)
  start.setUTCDate(start.getUTCDate() - days)
  return { start: ymd(start), end: ymd(now) }
}

function eachDate(startISO: string, endISO: string, max?: number): string[] {
  const out: string[] = []
  const start = new Date(`${startISO}T12:00:00Z`)
  const end = new Date(`${endISO}T12:00:00Z`)
  const cursor = new Date(start)
  while (cursor.getTime() <= end.getTime()) {
    out.push(ymd(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  if (max && out.length > max) {
    // Subsample evenly so trend line stays ~max points
    const step = out.length / max
    const sampled: string[] = []
    for (let i = 0; i < max; i++) sampled.push(out[Math.floor(i * step)])
    return sampled
  }
  return out
}

interface CHItem {
  company_name?: string
  company_number?: string
  date_of_creation?: string
  company_status?: string
  company_type?: string
  registered_office_address?: {
    address_line_1?: string
    address_line_2?: string
    locality?: string
    region?: string
    postal_code?: string
    country?: string
  }
  sic_codes?: string[]
}

interface CHResponse {
  hits?: number
  items?: CHItem[]
}

// ─── HTTP layer with retries + timeout ───────────────────────────────────────
async function callCompaniesHouse(
  apiKey: string,
  params: URLSearchParams
): Promise<CHResponse> {
  const url = `${API_BASE}/advanced-search/companies?${params.toString()}`
  const auth = Buffer.from(`${apiKey}:`).toString("base64")

  let lastError: unknown = null
  let lastStatus = 0
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 9000)
      const res = await fetch(url, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
        signal: controller.signal,
      })
      clearTimeout(timer)
      lastStatus = res.status
      if (res.ok) return (await res.json()) as CHResponse
      if (res.status === 401) {
        throw new Error("Companies House rejected the API key.")
      }
      if (res.status === 404) return { hits: 0, items: [] }
      if (res.status < 500 && res.status !== 429) {
        throw new Error(`Companies House error ${res.status}.`)
      }
      lastError = new Error(`status ${res.status}`)
    } catch (err) {
      lastError = err
      if (err instanceof Error && err.message.startsWith("Companies House rejected")) {
        throw err
      }
    }
    // 429s back off way harder than 5xx — the CH rate limit window is 5 min.
    const baseDelay = lastStatus === 429 ? 1500 : 300
    await new Promise((r) => setTimeout(r, baseDelay + attempt * 600))
  }
  console.warn("Companies House: skipping after retries", params.toString(), lastError)
  return { hits: 0, items: [] }
}

// Build params shared between table/insights/trend queries.
function buildBaseParams(filters: Filters, range: { start: string; end: string }) {
  const params = new URLSearchParams({
    incorporated_from: range.start,
    incorporated_to: range.end,
  })

  if (filters.sic.length) {
    // CH supports a repeated sic_codes param
    for (const code of filters.sic) params.append("sic_codes", code)
  }

  if (filters.nameIncludes) params.set("company_name_includes", filters.nameIncludes)
  if (filters.nameExcludes) params.set("company_name_excludes", filters.nameExcludes)

  if (filters.status !== "any") params.set("company_status", filters.status)
  if (filters.kind !== "any") params.set("company_type", filters.kind)

  // City + region + postcode all flow through `location`.
  // CH's location is a free-text match; we send our best guess.
  const locationGuesses: string[] = []
  if (filters.postcode) locationGuesses.push(filters.postcode)
  if (filters.cities.length) locationGuesses.push(...filters.cities)
  // We can only send a single location term, so pick the first non-empty.
  if (locationGuesses[0]) params.set("location", locationGuesses[0])

  return params
}

// ─── Normalisation ───────────────────────────────────────────────────────────
function titleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/(\s|-)/)
    .map((p) => (p.length > 0 && /[a-z]/.test(p[0]) ? p[0].toUpperCase() + p.slice(1) : p))
    .join("")
}

function pickRegion(text: string): string {
  for (const entry of REGION_MAP) if (entry.match.test(text)) return entry.region
  return "Other UK"
}

function pickCity(addr: CHItem["registered_office_address"]): string {
  const locality = addr?.locality?.trim()
  if (locality && locality.length > 0) return titleCase(locality)
  return "Unknown"
}

function findSignals(name: string): string[] {
  const upper = name.toUpperCase()
  return SIGNAL_TERMS.filter((s) => upper.includes(s.toUpperCase()))
}

function postcodePrefix(pc: string | undefined): string {
  if (!pc) return ""
  // Take the outward code (first half before the space)
  return pc.split(" ")[0]?.toUpperCase() ?? ""
}

function toCompany(item: CHItem): Company {
  const addr = item.registered_office_address ?? {}
  const city = pickCity(addr)
  const fullLoc = [addr.locality, addr.region, addr.postal_code, addr.country]
    .filter(Boolean)
    .join(" ")
  const name = item.company_name ?? "Unnamed company"
  const addressLine = [addr.address_line_1, addr.address_line_2, addr.locality, addr.postal_code]
    .filter(Boolean)
    .join(", ")
  return {
    name: titleCase(name),
    number: item.company_number ?? "—",
    incorporatedOn: item.date_of_creation ?? "",
    status: item.company_status ?? "unknown",
    type: item.company_type ?? "unknown",
    city,
    region: pickRegion(fullLoc),
    postcode: postcodePrefix(addr.postal_code),
    addressLine: addressLine || addr.country || "Unknown",
    sicCodes: item.sic_codes ?? [],
    signals: findSignals(name),
    trustScore: 0,
    trustReasons: [],
  }
}

// ─── Trust scoring ───────────────────────────────────────────────────────────
function scoreTrust(companies: Company[]): void {
  // Cluster addresses: same address_line + postcode appearing more than once
  // in the *same window* is a strong formation-agent signal.
  const addressCounts = new Map<string, number>()
  for (const c of companies) {
    const key = `${c.addressLine}|${c.postcode}`.toLowerCase()
    addressCounts.set(key, (addressCounts.get(key) ?? 0) + 1)
  }

  const GENERIC_SIC = new Set(["82990", "70229", "64209", "99999"])

  for (const c of companies) {
    let score = 100
    const reasons: string[] = []

    const addrKey = `${c.addressLine}|${c.postcode}`.toLowerCase()
    const cluster = addressCounts.get(addrKey) ?? 1
    if (cluster >= 10) {
      score -= 50
      reasons.push(`${cluster} companies share this address`)
    } else if (cluster >= 4) {
      score -= 30
      reasons.push(`${cluster} share this address`)
    } else if (cluster >= 2) {
      score -= 10
      reasons.push(`address shared with ${cluster - 1} other`)
    }

    if (c.sicCodes.length === 0) {
      score -= 15
      reasons.push("no SIC code declared")
    } else if (c.sicCodes.every((code) => GENERIC_SIC.has(code))) {
      score -= 10
      reasons.push("only generic SIC codes")
    }

    if (/(consulting|holdings|properties|ventures)/i.test(c.name) && c.sicCodes.length === 0) {
      score -= 5
      reasons.push("generic name + no SIC")
    }

    c.trustScore = Math.max(0, Math.min(100, score))
    c.trustReasons = reasons
  }
}

// ─── Insights ────────────────────────────────────────────────────────────────
function bucketize<T>(values: T[], key: (v: T) => string | string[]): Bucket[] {
  const map = new Map<string, number>()
  for (const v of values) {
    const k = key(v)
    const keys = Array.isArray(k) ? k : [k]
    for (const item of keys) {
      if (!item) continue
      map.set(item, (map.get(item) ?? 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

function prettyType(type: string): string {
  const map: Record<string, string> = {
    ltd: "Limited company",
    llp: "LLP",
    plc: "Public limited",
    "private-limited-guarant-nsc": "Guarantee company",
    "private-unlimited": "Unlimited",
  }
  return map[type] ?? type.replace(/-/g, " ")
}

function buildInsights(sample: Company[], total: number, trend: TrendPoint[]): Insights {
  const byCity = bucketize(sample, (c) => c.city).slice(0, 8)
  const byRegion = bucketize(sample, (c) => c.region).slice(0, 8)
  const bySic = bucketize(sample, (c) => (c.sicCodes.length ? c.sicCodes : ["Unclassified"]))
    .slice(0, 8)
    .map((b) => ({
      label: b.label === "Unclassified" ? b.label : `${b.label} · ${sicLabel(b.label)}`,
      count: b.count,
    }))
  const bySignal = SIGNAL_TERMS.map((term) => ({
    label: term,
    count: sample.filter((c) => c.signals.includes(term)).length,
  }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count)
  const byType = bucketize(sample, (c) => prettyType(c.type)).slice(0, 5)
  return { total, byCity, byRegion, bySic, bySignal, byType, trend }
}

// ─── Main entry ──────────────────────────────────────────────────────────────
export async function fetchRadar(input: Partial<Filters> = {}): Promise<RadarResponse> {
  const filters: Filters = { ...DEFAULT_FILTERS, ...input }
  const range = resolveRange(filters)
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY

  if (!apiKey) {
    const companies = demoCompanies(range.end)
    scoreTrust(companies)
    return {
      source: "demo",
      range,
      filters,
      pagination: {
        page: 1,
        pageSize: companies.length,
        pageCount: 1,
        totalMatched: companies.length,
      },
      companies,
      insights: buildInsights(companies, companies.length, demoTrend(companies)),
    }
  }

  // 1) Trend: per-day hit counts (filters applied so trend reflects the view).
  //    Cache by (filter signature + dates) since the same window is often re-fetched.
  const baseParams = buildBaseParams(filters, range)
  const trendDates = eachDate(range.start, range.end, 30)
  const cacheKey = `trend:${baseParams.toString()}:${range.start}:${range.end}`
  const trend: TrendPoint[] = await withTTL(cacheKey, 10 * 60 * 1000, async () => {
    const out: TrendPoint[] = []
    // Sequential to keep within Companies House rate limits.
    for (const date of trendDates) {
      const p = new URLSearchParams(baseParams)
      p.set("incorporated_from", date)
      p.set("incorporated_to", date)
      p.set("size", "1")
      const r = await callCompaniesHouse(apiKey, p)
      out.push({ date, count: r.hits ?? r.items?.length ?? 0 })
    }
    return out.sort((a, b) => a.date.localeCompare(b.date))
  })

  // 2) Insights sample + 3) table page: do it with two queries so we get both
  //    a stable insight sample AND fresh page rows.
  const samplePromise = (async () => {
    const p = new URLSearchParams(baseParams)
    p.set("size", String(INSIGHTS_SAMPLE_SIZE))
    p.set("start_index", "0")
    const r = await callCompaniesHouse(apiKey, p)
    return r
  })()

  const pagePromise = (async () => {
    const p = new URLSearchParams(baseParams)
    const pageSize = filters.pageSize
    const startIndex = (filters.page - 1) * pageSize
    p.set("size", String(Math.min(pageSize, TABLE_QUERY_SIZE)))
    p.set("start_index", String(startIndex))
    const r = await callCompaniesHouse(apiKey, p)
    return r
  })()

  const [sampleRes, pageRes] = await Promise.all([samplePromise, pagePromise])

  let sample = (sampleRes.items ?? []).map(toCompany)
  let pageCompanies = (pageRes.items ?? []).map(toCompany)

  // Apply region filter client-side (CH location is locality, not our region
  // bucket) plus optional formation-agent filter — both run against the data
  // we already have.
  scoreTrust(sample)
  scoreTrust(pageCompanies)

  if (filters.regions.length) {
    const set = new Set(filters.regions)
    sample = sample.filter((c) => set.has(c.region))
    pageCompanies = pageCompanies.filter((c) => set.has(c.region))
  }

  if (filters.excludeFormationAgents) {
    sample = sample.filter((c) => c.trustScore >= 50)
    pageCompanies = pageCompanies.filter((c) => c.trustScore >= 50)
  }

  const totalMatched = sampleRes.hits ?? sample.length
  const pageSize = filters.pageSize
  const pageCount = Math.max(1, Math.ceil(totalMatched / pageSize))

  return {
    source: "live",
    range,
    filters,
    pagination: {
      page: filters.page,
      pageSize,
      pageCount,
      totalMatched,
    },
    companies: pageCompanies,
    insights: buildInsights(sample, totalMatched, trend),
  }
}

// ─── Demo fallback (unchanged shape) ─────────────────────────────────────────
function demoCompanies(endISO: string): Company[] {
  const seeds: Array<[string, string, string, string, string, string]> = [
    ["Northwind AI Labs Ltd", "16240001", "62012", "London", "London", "EC1A 1AA"],
    ["Brighton Digital Studio Ltd", "16240002", "74100", "Brighton", "South East", "BN1 1AA"],
    ["Mercian Property Ventures Ltd", "16240003", "68100", "Birmingham", "West Midlands", "B1 1AA"],
    ["Aurora Tech Partners Ltd", "16240004", "62020", "Leeds", "Yorkshire & Humber", "LS1 1AA"],
    ["Cambrian Capital Holdings Ltd", "16240005", "64209", "Cambridge", "East of England", "CB1 1AA"],
    ["Signal Cloud Systems Ltd", "16240006", "63110", "Cambridge", "East of England", "CB1 2BB"],
    ["Foundry Ventures Group Ltd", "16240007", "70229", "Bristol", "South West", "BS1 1AA"],
    ["Kinetic Property Group Ltd", "16240008", "68100", "Cardiff", "Wales", "CF10 1AA"],
    ["Northstar Digital Ltd", "16240009", "73110", "Edinburgh", "Scotland", "EH1 1AA"],
    ["Atlas Tech Labs Ltd", "16240010", "62090", "Newcastle", "North East", "NE1 1AA"],
    ["Mercury Studio Works Ltd", "16240011", "74100", "Glasgow", "Scotland", "G1 1AA"],
    ["Harbour Business Support Ltd", "16240012", "82990", "Liverpool", "North West", "L1 1AA"],
    ["Ridgeline Health Co Ltd", "16240013", "86220", "Oxford", "South East", "OX1 1AA"],
    ["Beacon Energy Partners Ltd", "16240014", "70229", "Aberdeen", "Scotland", "AB10 1AA"],
    ["Lighthouse Crypto Labs Ltd", "16240015", "62012", "London", "London", "EC2A 1AA"],
    ["Halcyon Ventures Ltd", "16240016", "64209", "London", "London", "EC3A 1AA"],
  ]
  const end = new Date(`${endISO}T12:00:00Z`)
  return seeds.map(([name, number, sic, city, region, pc], i) => {
    const d = new Date(end)
    d.setUTCDate(d.getUTCDate() - (i % 6))
    return {
      name,
      number,
      incorporatedOn: ymd(d),
      status: "active",
      type: "ltd",
      city,
      region,
      postcode: postcodePrefix(pc),
      addressLine: `${city}, ${pc}`,
      sicCodes: [sic],
      signals: findSignals(name),
      trustScore: 0,
      trustReasons: [],
    }
  })
}

function demoTrend(companies: Company[]): TrendPoint[] {
  const map = new Map<string, number>()
  for (const c of companies) {
    const k = c.incorporatedOn || "unknown"
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
