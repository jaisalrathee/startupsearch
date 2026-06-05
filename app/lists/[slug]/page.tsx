import { redirect, notFound } from "next/navigation"
import { CURATED, curatedFilters } from "@/lib/curated"

export function generateStaticParams() {
  return CURATED.map((c) => ({ slug: c.slug }))
}

export default async function CuratedRedirect({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const f = curatedFilters(slug)
  if (!f) notFound()

  // Build a query string from the curated filters and redirect to the dashboard
  // so the same filter rail / UI handles it.
  const sp = new URLSearchParams()
  if (f.range && f.range !== "last7") sp.set("range", f.range)
  if (f.sic.length) sp.set("sic", f.sic.join(","))
  if (f.regions.length) sp.set("regions", f.regions.join(","))
  if (f.nameIncludes) sp.set("nameIncludes", f.nameIncludes)
  if (f.nameExcludes) sp.set("nameExcludes", f.nameExcludes)
  if (f.status !== "any") sp.set("status", f.status)
  if (f.kind !== "any") sp.set("kind", f.kind)
  if (f.excludeFormationAgents) sp.set("clean", "1")

  redirect(`/?${sp.toString()}`)
}
