import { NextResponse } from "next/server"
import { fetchRadar } from "@/lib/companies-house"
import {
  DEFAULT_FILTERS,
  type CompanyKind,
  type Filters,
  type RangeKey,
  type Status,
} from "@/lib/types"

const RANGES: RangeKey[] = ["today", "yesterday", "last7", "last30", "custom"]
const STATUSES: Status[] = ["any", "active", "dissolved", "liquidation", "open"]
const KINDS: CompanyKind[] = [
  "any",
  "ltd",
  "llp",
  "plc",
  "private-limited-guarant-nsc",
  "private-unlimited",
  "private-limited-shares-section-30-exemption",
]

export const dynamic = "force-dynamic"

function parseList(value: string | null): string[] {
  if (!value) return []
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseInt32(value: string | null, fallback: number, min = 1, max = 1_000_000): number {
  if (!value) return fallback
  const n = parseInt(value, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const sp = url.searchParams

  const rawRange = sp.get("range") as RangeKey | null
  const range: RangeKey = rawRange && RANGES.includes(rawRange) ? rawRange : "last7"

  const rawStatus = sp.get("status") as Status | null
  const status: Status = rawStatus && STATUSES.includes(rawStatus) ? rawStatus : "any"

  const rawKind = sp.get("kind") as CompanyKind | null
  const kind: CompanyKind = rawKind && KINDS.includes(rawKind) ? rawKind : "any"

  const filters: Filters = {
    ...DEFAULT_FILTERS,
    range,
    customStart: sp.get("from") ?? undefined,
    customEnd: sp.get("to") ?? undefined,
    sic: parseList(sp.get("sic")),
    regions: parseList(sp.get("regions")),
    cities: parseList(sp.get("cities")),
    status,
    kind,
    nameIncludes: sp.get("nameIncludes") || undefined,
    nameExcludes: sp.get("nameExcludes") || undefined,
    postcode: sp.get("postcode") || undefined,
    page: parseInt32(sp.get("page"), 1, 1, 1000),
    pageSize: parseInt32(sp.get("pageSize"), 25, 5, 100),
    excludeFormationAgents: sp.get("clean") === "1",
  }

  try {
    const data = await fetchRadar(filters)
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
