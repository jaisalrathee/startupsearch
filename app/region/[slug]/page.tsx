import { redirect, notFound } from "next/navigation"
import type { Metadata } from "next"
import {
  REGION_SLUGS,
  regionDescription,
  regionFilters,
  regionFromSlug,
  regionMetaTitle,
} from "@/lib/seo-landings"

interface PageProps {
  params: Promise<{ slug: string }>
}

export const dynamic = "force-static"
export const revalidate = 3600

export function generateStaticParams() {
  return REGION_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const region = regionFromSlug(slug)
  if (!region) {
    return { title: "Region · Startup Search" }
  }
  const title = regionMetaTitle(region)
  const description = regionDescription(region)
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://startupsearch.co.uk/region/${slug}`,
      siteName: "Startup Search",
    },
    alternates: {
      canonical: `https://startupsearch.co.uk/region/${slug}`,
    },
  }
}

export default async function RegionPage({ params }: PageProps) {
  const { slug } = await params
  const region = regionFromSlug(slug)
  if (!region) notFound()

  const sp = new URLSearchParams()
  sp.set("range", "last30")
  sp.set("regions", region)
  sp.set("seoSource", `region:${slug}`)
  redirect(`/?${sp.toString()}`)
}
