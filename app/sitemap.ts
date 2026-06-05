import type { MetadataRoute } from "next"
import { CURATED } from "@/lib/curated"
import { REGION_SLUGS, SECTOR_SLUGS } from "@/lib/seo-landings"

const BASE = "https://startupsearch.co.uk"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const lastModified = now

  const staticPaths: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/lists`, lastModified, changeFrequency: "weekly", priority: 0.8 },
  ]

  const listPaths: MetadataRoute.Sitemap = CURATED.map((c) => ({
    url: `${BASE}/lists/${c.slug}`,
    lastModified,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }))

  const sectorPaths: MetadataRoute.Sitemap = SECTOR_SLUGS.map((slug) => ({
    url: `${BASE}/sector/${slug}`,
    lastModified,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }))

  const regionPaths: MetadataRoute.Sitemap = REGION_SLUGS.map((slug) => ({
    url: `${BASE}/region/${slug}`,
    lastModified,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }))

  return [...staticPaths, ...listPaths, ...sectorPaths, ...regionPaths]
}
