import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { fetchOfficer } from "@/lib/officer"
import { OfficerView } from "@/components/officer-view"
import { HeaderSearch } from "@/components/header-search"

interface PageProps {
  params: Promise<{ id: string }>
}

export const dynamic = "force-dynamic"
export const revalidate = 1800

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const officer = await fetchOfficer(id)
  if (!officer) {
    return { title: `Officer not found · Startup Search` }
  }
  const desc = `${officer.name} — ${officer.totalAppointments} UK directorships (${officer.active} active, ${officer.resigned} resigned). Serial-founder score, appointments, and history.`
  return {
    title: `${officer.name} · Director · Startup Search`,
    description: desc,
    openGraph: {
      title: officer.name,
      description: desc,
      url: `https://startupsearch.co.uk/o/${id}`,
      siteName: "Startup Search",
    },
  }
}

export default async function OfficerPage({ params }: PageProps) {
  const { id } = await params
  const officer = await fetchOfficer(id)
  if (!officer) notFound()

  return (
    <main className="min-h-screen">
      <OfficerHeader />
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <OfficerView officer={officer} />
      </div>
    </main>
  )
}

function OfficerHeader() {
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
            <span className="hidden text-[12px] text-[var(--muted)] md:inline">/ director</span>
          </div>
        </Link>
        <div className="flex-1">
          <HeaderSearch />
        </div>
        <nav className="hidden items-center gap-1 sm:flex">
          <Link href="/" className="btn">
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  )
}
