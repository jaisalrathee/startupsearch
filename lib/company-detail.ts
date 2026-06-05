import { chFetch } from "@/lib/ch-fetch"
import { withTTL } from "@/lib/cache"
import { sicLabel } from "@/lib/sic"

export interface CompanyProfile {
  number: string
  name: string
  status: string
  type: string
  incorporatedOn: string
  jurisdiction: string
  addressLine: string
  postcode: string
  sicCodes: string[]
  sicDescriptions: string[]
  // Optional richness
  accountsNextDue?: string
  accountsLastMadeUpTo?: string
  confirmationStatementNextDue?: string
  hasInsolvencyHistory?: boolean
  hasCharges?: boolean
  registeredOfficeIsInDispute?: boolean
}

export interface OfficerLite {
  id: string // CH officer_id, parsed from links.officer.appointments
  name: string
  role: string
  appointedOn?: string
  resignedOn?: string
  nationality?: string
  countryOfResidence?: string
  occupation?: string
  dob?: { year?: number; month?: number }
}

export interface FilingItem {
  date: string
  category: string
  description: string
  type?: string
  paperFiled?: boolean
}

export interface PSC {
  name: string
  kind: string
  natureOfControl: string[]
  countryOfResidence?: string
  nationality?: string
  notifiedOn?: string
  ceasedOn?: string
}

export interface AddressNeighbor {
  number: string
  name: string
  status: string
  incorporatedOn: string
}

export interface CompanyDetail {
  source: "live" | "demo" | "not_found"
  profile: CompanyProfile
  officers: OfficerLite[]
  filings: FilingItem[]
  psc: PSC[]
  neighbors: AddressNeighbor[]
  similar: AddressNeighbor[]
}

interface CHProfileResponse {
  company_name?: string
  company_number?: string
  company_status?: string
  type?: string
  date_of_creation?: string
  jurisdiction?: string
  sic_codes?: string[]
  has_insolvency_history?: boolean
  has_charges?: boolean
  registered_office_is_in_dispute?: boolean
  accounts?: {
    next_due?: string
    last_accounts?: { made_up_to?: string }
  }
  confirmation_statement?: { next_due?: string }
  registered_office_address?: {
    address_line_1?: string
    address_line_2?: string
    locality?: string
    region?: string
    postal_code?: string
    country?: string
  }
}

interface CHOfficersList {
  items?: Array<{
    name?: string
    officer_role?: string
    appointed_on?: string
    resigned_on?: string
    nationality?: string
    country_of_residence?: string
    occupation?: string
    date_of_birth?: { year?: number; month?: number }
    links?: { officer?: { appointments?: string } }
  }>
}

interface CHFilingHistory {
  items?: Array<{
    date?: string
    category?: string
    description?: string
    type?: string
    paper_filed?: boolean
  }>
}

interface CHPSCList {
  items?: Array<{
    name?: string
    kind?: string
    natures_of_control?: string[]
    country_of_residence?: string
    nationality?: string
    notified_on?: string
    ceased_on?: string
  }>
}

interface CHAdvancedSearch {
  hits?: number
  items?: Array<{
    company_name?: string
    company_number?: string
    company_status?: string
    date_of_creation?: string
    registered_office_address?: { locality?: string; postal_code?: string }
  }>
}

function fmtAddress(addr: CHProfileResponse["registered_office_address"]): string {
  if (!addr) return ""
  return [addr.address_line_1, addr.address_line_2, addr.locality, addr.region, addr.postal_code, addr.country]
    .filter(Boolean)
    .join(", ")
}

function postcodePrefix(pc: string | undefined): string {
  if (!pc) return ""
  return pc.split(" ")[0]?.toUpperCase() ?? ""
}

// Extract officer_id from a path like /officers/{id}/appointments
function officerIdFromPath(path: string | undefined): string {
  if (!path) return ""
  const m = path.match(/\/officers\/([^/]+)/)
  return m ? m[1] : ""
}

export async function fetchCompanyDetail(number: string): Promise<CompanyDetail | null> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY
  if (!apiKey) return demoCompanyDetail(number)

  const cleanNumber = number.trim().toUpperCase()
  if (!/^[A-Z0-9]{1,10}$/.test(cleanNumber)) return null

  return withTTL(`detail:${cleanNumber}`, 10 * 60 * 1000, async () => {
    // 1. Profile (sequential because everything downstream depends on it)
    const profile = await chFetch<CHProfileResponse>(apiKey, `/company/${cleanNumber}`)
    if (!profile) return null

    // 2. Fan out officers, filings, PSC in parallel (all small)
    const [officers, filings, psc] = await Promise.all([
      chFetch<CHOfficersList>(apiKey, `/company/${cleanNumber}/officers`, {
        params: { items_per_page: 50 },
      }),
      chFetch<CHFilingHistory>(apiKey, `/company/${cleanNumber}/filing-history`, {
        params: { items_per_page: 20 },
      }),
      chFetch<CHPSCList>(apiKey, `/company/${cleanNumber}/persons-with-significant-control`, {
        params: { items_per_page: 20 },
      }),
    ])

    // 3. Address neighbors — other companies at the same address
    const pcPrefix = postcodePrefix(profile.registered_office_address?.postal_code)
    let neighbors: AddressNeighbor[] = []
    if (pcPrefix) {
      const neighborRes = await chFetch<CHAdvancedSearch>(apiKey, `/advanced-search/companies`, {
        params: {
          location: pcPrefix,
          size: 20,
        },
      })
      neighbors = (neighborRes?.items ?? [])
        .filter((n) => n.company_number !== cleanNumber)
        .slice(0, 8)
        .map((n) => ({
          number: n.company_number ?? "",
          name: n.company_name ?? "",
          status: n.company_status ?? "unknown",
          incorporatedOn: n.date_of_creation ?? "",
        }))
    }

    // 4. Similar companies via SIC + region
    let similar: AddressNeighbor[] = []
    if (profile.sic_codes && profile.sic_codes.length) {
      const similarRes = await chFetch<CHAdvancedSearch>(apiKey, `/advanced-search/companies`, {
        params: {
          sic_codes: profile.sic_codes[0],
          location: profile.registered_office_address?.locality ?? "",
          size: 12,
        },
      })
      similar = (similarRes?.items ?? [])
        .filter((s) => s.company_number !== cleanNumber)
        .slice(0, 6)
        .map((s) => ({
          number: s.company_number ?? "",
          name: s.company_name ?? "",
          status: s.company_status ?? "unknown",
          incorporatedOn: s.date_of_creation ?? "",
        }))
    }

    return {
      source: "live",
      profile: {
        number: profile.company_number ?? cleanNumber,
        name: profile.company_name ?? "Unknown",
        status: profile.company_status ?? "unknown",
        type: profile.type ?? "unknown",
        incorporatedOn: profile.date_of_creation ?? "",
        jurisdiction: profile.jurisdiction ?? "",
        addressLine: fmtAddress(profile.registered_office_address) || "Unknown",
        postcode: postcodePrefix(profile.registered_office_address?.postal_code),
        sicCodes: profile.sic_codes ?? [],
        sicDescriptions: (profile.sic_codes ?? []).map(sicLabel),
        accountsNextDue: profile.accounts?.next_due,
        accountsLastMadeUpTo: profile.accounts?.last_accounts?.made_up_to,
        confirmationStatementNextDue: profile.confirmation_statement?.next_due,
        hasInsolvencyHistory: profile.has_insolvency_history,
        hasCharges: profile.has_charges,
        registeredOfficeIsInDispute: profile.registered_office_is_in_dispute,
      },
      officers: (officers?.items ?? []).map((o) => ({
        id: officerIdFromPath(o.links?.officer?.appointments),
        name: o.name ?? "Unknown",
        role: o.officer_role ?? "unknown",
        appointedOn: o.appointed_on,
        resignedOn: o.resigned_on,
        nationality: o.nationality,
        countryOfResidence: o.country_of_residence,
        occupation: o.occupation,
        dob: o.date_of_birth ? { year: o.date_of_birth.year, month: o.date_of_birth.month } : undefined,
      })),
      filings: (filings?.items ?? []).slice(0, 15).map((f) => ({
        date: f.date ?? "",
        category: f.category ?? "other",
        description: humanizeFilingDescription(f.description ?? ""),
        type: f.type,
        paperFiled: f.paper_filed,
      })),
      psc: (psc?.items ?? []).map((p) => ({
        name: p.name ?? "Unknown",
        kind: p.kind ?? "unknown",
        natureOfControl: p.natures_of_control ?? [],
        countryOfResidence: p.country_of_residence,
        nationality: p.nationality,
        notifiedOn: p.notified_on,
        ceasedOn: p.ceased_on,
      })),
      neighbors,
      similar,
    }
  })
}

function humanizeFilingDescription(s: string): string {
  // CH descriptions are sometimes raw keys like "annual-return-made-up-to"
  return s.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}

function demoCompanyDetail(number: string): CompanyDetail {
  return {
    source: "demo",
    profile: {
      number,
      name: "Demo Holdings Limited",
      status: "active",
      type: "ltd",
      incorporatedOn: "2024-01-15",
      jurisdiction: "england-wales",
      addressLine: "1 Demo Street, London, EC1A 1AA",
      postcode: "EC1A",
      sicCodes: ["62012"],
      sicDescriptions: ["Business and domestic software development"],
    },
    officers: [
      { id: "demo-1", name: "Jane Demo", role: "director", appointedOn: "2024-01-15" },
      { id: "demo-2", name: "John Demo", role: "secretary", appointedOn: "2024-01-15" },
    ],
    filings: [
      { date: "2024-12-15", category: "accounts", description: "Accounts for a small company" },
      { date: "2024-01-15", category: "incorporation", description: "Incorporation" },
    ],
    psc: [
      {
        name: "Jane Demo",
        kind: "individual-person-with-significant-control",
        natureOfControl: ["ownership-of-shares-75-to-100-percent"],
      },
    ],
    neighbors: [],
    similar: [],
  }
}
