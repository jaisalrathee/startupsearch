import { chFetch } from "@/lib/ch-fetch"
import { withTTL } from "@/lib/cache"

export interface Appointment {
  companyNumber: string
  companyName: string
  companyStatus: string
  role: string
  appointedOn?: string
  resignedOn?: string
}

export interface OfficerProfile {
  id: string
  name: string
  totalAppointments: number
  active: number
  resigned: number
  dissolved: number
  inOffice: number
  nationality?: string
  countryOfResidence?: string
  occupation?: string
  dob?: { year?: number; month?: number }
  appointments: Appointment[]
  // Serial-founder heuristic score, 0–100. Higher = more credible serial founder.
  serialFounderScore: number
  signals: string[]
}

interface CHAppointmentsResponse {
  name?: string
  nationality?: string
  country_of_residence?: string
  occupation?: string
  date_of_birth?: { year?: number; month?: number }
  total_results?: number
  items?: Array<{
    appointed_on?: string
    resigned_on?: string
    officer_role?: string
    appointed_to?: {
      company_name?: string
      company_number?: string
      company_status?: string
    }
  }>
}

export async function fetchOfficer(id: string): Promise<OfficerProfile | null> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY
  if (!apiKey) return demoOfficer(id)

  const cleanId = id.trim()
  if (!/^[A-Za-z0-9_-]{5,50}$/.test(cleanId)) return null

  return withTTL(`officer:${cleanId}`, 30 * 60 * 1000, async () => {
    const res = await chFetch<CHAppointmentsResponse>(apiKey, `/officers/${cleanId}/appointments`, {
      params: { items_per_page: 50 },
    })
    if (!res) return null

    const appointments: Appointment[] = (res.items ?? []).map((a) => ({
      companyNumber: a.appointed_to?.company_number ?? "",
      companyName: a.appointed_to?.company_name ?? "Unknown",
      companyStatus: a.appointed_to?.company_status ?? "unknown",
      role: a.officer_role ?? "director",
      appointedOn: a.appointed_on,
      resignedOn: a.resigned_on,
    }))

    const active = appointments.filter((a) => !a.resignedOn).length
    const resigned = appointments.filter((a) => !!a.resignedOn).length
    const dissolved = appointments.filter((a) => a.companyStatus === "dissolved").length
    const inOffice = appointments.filter(
      (a) => !a.resignedOn && a.companyStatus === "active"
    ).length

    const { score, signals } = scoreSerialFounder({
      total: appointments.length,
      active,
      dissolved,
      resigned,
      inOffice,
    })

    return {
      id: cleanId,
      name: res.name ?? "Unknown officer",
      totalAppointments: res.total_results ?? appointments.length,
      active,
      resigned,
      dissolved,
      inOffice,
      nationality: res.nationality,
      countryOfResidence: res.country_of_residence,
      occupation: res.occupation,
      dob: res.date_of_birth ? { year: res.date_of_birth.year, month: res.date_of_birth.month } : undefined,
      appointments: appointments.sort((a, b) => (b.appointedOn ?? "").localeCompare(a.appointedOn ?? "")),
      serialFounderScore: score,
      signals,
    }
  })
}

function scoreSerialFounder(stats: {
  total: number
  active: number
  dissolved: number
  resigned: number
  inOffice: number
}): { score: number; signals: string[] } {
  let score = 0
  const signals: string[] = []

  // Base: appointment count, log-scaled.
  // 1 appt = 5, 3 = 30, 5 = 50, 10 = 70, 20+ = 90
  const base = Math.min(90, Math.round(Math.log2(Math.max(1, stats.total)) * 18))
  score += base

  if (stats.total >= 5 && stats.dissolved / stats.total < 0.5) {
    signals.push("Most ventures still standing")
    score += 5
  }
  if (stats.dissolved >= 5 && stats.dissolved / stats.total > 0.7) {
    signals.push("High dissolution rate")
    score -= 15
  }
  if (stats.inOffice >= 3) {
    signals.push(`Currently runs ${stats.inOffice} active companies`)
    score += 5
  }
  if (stats.total >= 20) {
    signals.push("Possibly a formation agent")
    score -= 10
  }
  if (stats.total === 1) {
    signals.push("First-time founder")
  }

  return { score: Math.max(0, Math.min(100, score)), signals }
}

function demoOfficer(id: string): OfficerProfile {
  return {
    id,
    name: "Demo Director",
    totalAppointments: 4,
    active: 3,
    resigned: 1,
    dissolved: 1,
    inOffice: 2,
    nationality: "British",
    countryOfResidence: "England",
    occupation: "Director",
    appointments: [
      {
        companyNumber: "16240001",
        companyName: "Northwind AI Labs Ltd",
        companyStatus: "active",
        role: "director",
        appointedOn: "2024-04-12",
      },
      {
        companyNumber: "16240002",
        companyName: "Brighton Digital Studio Ltd",
        companyStatus: "active",
        role: "director",
        appointedOn: "2023-01-08",
      },
    ],
    serialFounderScore: 48,
    signals: ["Currently runs 2 active companies"],
  }
}
