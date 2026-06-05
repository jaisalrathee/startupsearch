import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { fetchCompanyDetail } from "@/lib/company-detail"
import { CompanyDetailView } from "@/components/company-detail-view"
import { HeaderSearch } from "@/components/header-search"

interface PageProps {
  params: Promise<{ number: string }>
}

export const dynamic = "force-dynamic"
export const revalidate = 600

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { number } = await params
  const detail = await fetchCompanyDetail(number)
  if (!detail) {
    return {
      title: `${number} · Company not found · Startup Search`,
    }
  }
  const p = detail.profile
  const desc = `${p.name} (${p.number}) — ${p.sicDescriptions[0] ?? "UK company"}. Incorporated ${p.incorporatedOn}, ${p.status}. Directors, filings, ownership, address neighbors.`
  return {
    title: `${p.name} · Startup Search`,
    description: desc,
    openGraph: {
      title: p.name,
      description: desc,
      url: `https://startupsearch.co.uk/c/${p.number}`,
      siteName: "Startup Search",
    },
  }
}

export default async function CompanyPage({ params }: PageProps) {
  const { number } = await params
  const detail = await fetchCompanyDetail(number)
  if (!detail) notFound()

  return (
    <main className="min-h-screen">
      <CompanyDetailHeader />
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <CompanyDetailView detail={detail} />
      </div>
    </main>
  )
}

function CompanyDetailHeader() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-[var(--line)]"
      style={{
        background: "rgba(250, 250, 250, 0.94)",
        backdropFilter: "saturate(180%) blur(14px)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[1180px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="relative grid size-8 place-items-center overflow-hidden rounded-lg border border-[var(--line-strong)] bg-white">
            <div className="absolute inset-0 dotgrid opacity-50" />
            <div className="relative size-3 rounded-full bg-[var(--accent)] shadow-[0_0_0_4px_rgba(91,108,255,0.18)]" />
          </div>
          <div className="hidden items-baseline gap-1.5 sm:flex">
            <span className="text-[15px] font-semibold">Startup Search</span>
            <span className="hidden text-[12px] text-[var(--muted)] md:inline">/ company profile</span>
          </div>
        </Link>
        <div className="flex-1">
          <HeaderSearch />
        </div>
        <nav className="hidden items-center gap-1 sm:flex">
          <Link href="/" className="btn">
            Dashboard
          </Link>
          <Link href="/lists" className="btn">
            Lists
          </Link>
        </nav>
      </div>
    </header>
  )
}
