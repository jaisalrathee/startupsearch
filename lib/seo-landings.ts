import { SIC, sicLabel } from "@/lib/sic"
import { REGION_LIST } from "@/lib/types"
import type { Filters } from "@/lib/types"
import { DEFAULT_FILTERS } from "@/lib/types"

// Sector slugs we render as `/sector/[code]`. Keep to a sensible set so
// generateStaticParams doesn't explode.
export const SECTOR_SLUGS = Object.keys(SIC)

export function sectorFilters(code: string): Filters | null {
  if (!SIC[code]) return null
  return {
    ...DEFAULT_FILTERS,
    range: "last30",
    sic: [code],
  }
}

export function sectorMetaTitle(code: string): string {
  return `New UK ${sicLabel(code)} companies · Startup Search`
}

export function sectorDescription(code: string): string {
  return `Every UK company registered in the last 30 days under SIC ${code} (${sicLabel(code)}). Director profiles, trust scores, address neighbors, and naming trends — straight from Companies House.`
}

// ── Regions ─────────────────────────────────────────────────────────────

export function regionSlug(region: string): string {
  return region
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export const REGION_SLUGS = REGION_LIST.map((r) => regionSlug(r))

export function regionFromSlug(slug: string): string | null {
  const idx = REGION_SLUGS.indexOf(slug)
  return idx >= 0 ? REGION_LIST[idx] : null
}

export function regionFilters(region: string): Filters {
  return {
    ...DEFAULT_FILTERS,
    range: "last30",
    regions: [region],
  }
}

export function regionMetaTitle(region: string): string {
  return `New ${region} companies · Startup Search`
}

export function regionDescription(region: string): string {
  return `Every UK company incorporated in ${region} in the last 30 days. Filter by sector, postcode, and director — straight from Companies House.`
}
