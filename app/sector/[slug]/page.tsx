import { redirect, notFound } from "next/navigation"
import type { Metadata } from "next"
import { SIC, sicLabel } from "@/lib/sic"
import { sectorFilters, sectorDescription, sectorMetaTitle, SECTOR_SLUGS } from "@/lib/seo-landings"

interface PageProps {
  params: Promise<{ slug: string }>
}

export const dynamic = "force-static"
export const revalidate = 3600

export function generateStaticParams() {
  return SECTOR_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  if (!SIC[slug]) {
    return { title: "Sector · Startup Search" }
  }
  const title = sectorMetaTitle(slug)
  const description = sectorDescription(slug)
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://startupsearch.co.uk/sector/${slug}`,
      siteName: "Startup Search",
    },
    alternates: {
      canonical: `https://startupsearch.co.uk/sector/${slug}`,
    },
  }
}

export default async function SectorPage({ params }: PageProps) {
  const { slug } = await params
  const f = sectorFilters(slug)
  if (!f) notFound()

  const sp = new URLSearchParams()
  sp.set("range", "last30")
  sp.set("sic", slug)
  sp.set("seoSource", `sector:${slug}`) // optional analytics tag
  redirect(`/?${sp.toString()}`)
}
