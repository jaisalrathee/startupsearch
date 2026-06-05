import type { Filters } from "@/lib/types"
import { DEFAULT_FILTERS } from "@/lib/types"

export interface CuratedList {
  slug: string
  title: string
  blurb: string
  emoji: string
  filters: Partial<Filters>
}

export const CURATED: CuratedList[] = [
  {
    slug: "ai-startups",
    title: "AI startups this week",
    blurb: "Companies registered with software / IT SIC codes whose name signals AI focus.",
    emoji: "✦",
    filters: {
      range: "last7",
      sic: ["62012", "62020", "62090", "63110"],
      nameIncludes: "AI",
      excludeFormationAgents: true,
    },
  },
  {
    slug: "london-software",
    title: "London software co's",
    blurb: "New software developers headquartered in London.",
    emoji: "◐",
    filters: {
      range: "last7",
      sic: ["62012", "62020", "62090"],
      regions: ["London"],
      excludeFormationAgents: true,
    },
  },
  {
    slug: "scotland-fintech",
    title: "Scotland fintech",
    blurb: "Financial / IT-finance co's incorporated in Scotland.",
    emoji: "◇",
    filters: {
      range: "last30",
      sic: ["64209", "66190", "62012"],
      regions: ["Scotland"],
      excludeFormationAgents: true,
    },
  },
  {
    slug: "uk-property",
    title: "UK property fresh starts",
    blurb: "Real estate buying/selling co's across the UK.",
    emoji: "▣",
    filters: {
      range: "last7",
      sic: ["68100", "68209", "68310", "68320"],
      excludeFormationAgents: true,
    },
  },
  {
    slug: "creative-studios",
    title: "Creative studios",
    blurb: "New design, advertising, and creative agencies.",
    emoji: "◉",
    filters: {
      range: "last7",
      sic: ["73110", "74100"],
      excludeFormationAgents: true,
    },
  },
  {
    slug: "health-clinics",
    title: "Health & clinics",
    blurb: "Medical practice and health activity registrations.",
    emoji: "+",
    filters: {
      range: "last30",
      sic: ["86220", "86900"],
      excludeFormationAgents: true,
    },
  },
  {
    slug: "green-energy",
    title: "Green & energy",
    blurb: "Companies whose names signal green / energy / solar focus.",
    emoji: "✿",
    filters: {
      range: "last30",
      nameIncludes: "Green",
      excludeFormationAgents: true,
    },
  },
  {
    slug: "crypto-web3",
    title: "Crypto / Web3",
    blurb: "Companies whose names signal Web3 / crypto focus.",
    emoji: "◈",
    filters: {
      range: "last30",
      nameIncludes: "Crypto",
      excludeFormationAgents: true,
    },
  },
]

export function findCurated(slug: string): CuratedList | undefined {
  return CURATED.find((c) => c.slug === slug)
}

export function curatedFilters(slug: string): Filters | undefined {
  const c = findCurated(slug)
  if (!c) return undefined
  return { ...DEFAULT_FILTERS, ...c.filters }
}
