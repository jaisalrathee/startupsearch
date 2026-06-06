export type RangeKey = "today" | "yesterday" | "last7" | "last30" | "custom"

export type Status = "active" | "dissolved" | "liquidation" | "open" | "any"

export type SortKey = "newest" | "oldest" | "name" | "trust"

export const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
  { value: "trust", label: "Trust (high → low)" },
]

export type CompanyKind =
  | "ltd"
  | "llp"
  | "plc"
  | "private-limited-guarant-nsc"
  | "private-unlimited"
  | "private-limited-shares-section-30-exemption"
  | "any"

export interface Filters {
  range: RangeKey
  customStart?: string // YYYY-MM-DD
  customEnd?: string // YYYY-MM-DD
  sic: string[] // SIC codes
  regions: string[] // region labels matching REGION_LIST
  cities: string[] // free-text locality matches
  status: Status
  kind: CompanyKind
  nameIncludes?: string
  nameExcludes?: string
  postcode?: string // postcode prefix (e.g. "EC1", "SW3")
  page: number
  pageSize: number
  excludeFormationAgents: boolean
  sort: SortKey
}

export const DEFAULT_FILTERS: Filters = {
  range: "last7",
  sic: [],
  regions: [],
  cities: [],
  status: "any",
  kind: "any",
  page: 1,
  pageSize: 25,
  excludeFormationAgents: false,
  sort: "newest",
}

export interface Company {
  name: string
  number: string
  incorporatedOn: string
  status: string
  type: string
  city: string
  region: string
  postcode: string
  addressLine: string
  sicCodes: string[]
  signals: string[]
  trustScore: number // 0–100
  trustReasons: string[]
}

export interface Bucket {
  label: string
  count: number
}

export interface TrendPoint {
  date: string
  count: number
}

export interface Insights {
  total: number
  byCity: Bucket[]
  byRegion: Bucket[]
  bySic: Bucket[]
  bySignal: Bucket[]
  byType: Bucket[]
  trend: TrendPoint[]
}

export interface RadarResponse {
  source: "live" | "demo"
  range: { start: string; end: string }
  filters: Filters
  pagination: {
    page: number
    pageSize: number
    pageCount: number
    totalMatched: number
  }
  companies: Company[]
  insights: Insights
}

export const REGION_LIST = [
  "London",
  "South East",
  "South West",
  "East of England",
  "West Midlands",
  "East Midlands",
  "Yorkshire & Humber",
  "North West",
  "North East",
  "Wales",
  "Scotland",
  "Northern Ireland",
  "Other UK",
] as const

export const STATUS_OPTIONS: Array<{ value: Status; label: string }> = [
  { value: "any", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "dissolved", label: "Dissolved" },
  { value: "liquidation", label: "Liquidation" },
  { value: "open", label: "Open" },
]

export const KIND_OPTIONS: Array<{ value: CompanyKind; label: string }> = [
  { value: "any", label: "Any type" },
  { value: "ltd", label: "Limited company" },
  { value: "llp", label: "LLP" },
  { value: "plc", label: "Public limited" },
  { value: "private-limited-guarant-nsc", label: "Guarantee" },
  { value: "private-unlimited", label: "Unlimited" },
]
