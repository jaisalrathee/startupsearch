import { chFetch } from "@/lib/ch-fetch"

export interface SearchHit {
  kind: "company" | "officer"
  id: string // company number or officer id
  title: string
  subtitle?: string
  href: string
}

interface CHCompanySearch {
  items?: Array<{
    title?: string
    company_number?: string
    address_snippet?: string
    company_status?: string
    date_of_creation?: string
  }>
}

interface CHOfficerSearch {
  items?: Array<{
    title?: string
    description?: string
    appointment_count?: number
    links?: { self?: string }
  }>
}

const COMPANY_NUMBER_RE = /^[A-Z0-9]{6,10}$/i

export async function quickSearch(query: string): Promise<SearchHit[]> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY
  const q = query.trim()
  if (!q) return []

  // If the query looks like a company number, surface it as a direct hit at the top
  const directHit: SearchHit[] = COMPANY_NUMBER_RE.test(q.replace(/\s+/g, ""))
    ? [
        {
          kind: "company",
          id: q.toUpperCase().replace(/\s+/g, ""),
          title: `Go to ${q.toUpperCase().replace(/\s+/g, "")}`,
          subtitle: "Direct company number lookup",
          href: `/c/${q.toUpperCase().replace(/\s+/g, "")}`,
        },
      ]
    : []

  if (!apiKey) return [...directHit, ...demoResults(q)]

  const [companies, officers] = await Promise.all([
    chFetch<CHCompanySearch>(apiKey, `/search/companies`, {
      params: { q, items_per_page: 6 },
    }),
    chFetch<CHOfficerSearch>(apiKey, `/search/officers`, {
      params: { q, items_per_page: 4 },
    }),
  ])

  const companyHits: SearchHit[] = (companies?.items ?? []).map((c) => ({
    kind: "company",
    id: c.company_number ?? "",
    title: c.title ?? "Unknown",
    subtitle: [c.company_status, c.address_snippet].filter(Boolean).join(" · "),
    href: `/c/${c.company_number ?? ""}`,
  }))

  const officerHits: SearchHit[] = []
  for (const o of officers?.items ?? []) {
    const selfPath = o.links?.self ?? ""
    const m = selfPath.match(/\/officers\/([^/]+)/)
    const id = m ? m[1] : ""
    if (!id) continue
    officerHits.push({
      kind: "officer",
      id,
      title: o.title ?? "Unknown",
      subtitle: o.appointment_count
        ? `${o.appointment_count} UK directorships`
        : o.description,
      href: `/o/${id}`,
    })
  }

  return [...directHit, ...companyHits, ...officerHits]
}

function demoResults(q: string): SearchHit[] {
  const items = [
    { name: "Demo Holdings Limited", number: "00000001" },
    { name: "Demo Studios LLP", number: "OC000001" },
  ]
  return items
    .filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))
    .map((i) => ({
      kind: "company" as const,
      id: i.number,
      title: i.name,
      subtitle: "Demo result",
      href: `/c/${i.number}`,
    }))
}
