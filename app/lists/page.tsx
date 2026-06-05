import Link from "next/link"
import { CURATED } from "@/lib/curated"

export const metadata = {
  title: "Curated lists · Radar",
  description: "Pre-made filters across UK company formations — AI startups, London software, Scotland fintech, and more.",
}

export default function ListsPage() {
  return (
    <main className="min-h-screen">
      <header
        className="sticky top-0 z-30 border-b border-[var(--line)]"
        style={{
          background: "rgba(250, 250, 250, 0.94)",
          backdropFilter: "saturate(180%) blur(14px)",
        }}
      >
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative grid size-8 place-items-center overflow-hidden rounded-lg border border-[var(--line-strong)] bg-white">
              <div className="absolute inset-0 dotgrid opacity-50" />
              <div className="relative size-3 rounded-full bg-[var(--accent)] shadow-[0_0_0_4px_rgba(91,108,255,0.18)]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-semibold">Radar</span>
              <span className="text-[12px] text-[var(--muted)]">/ curated lists</span>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Link href="/" className="btn">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-5 pb-24 pt-12 sm:px-8">
        <section className="mb-10 flex flex-col gap-3 anim-rise">
          <span className="chip w-fit">
            <span className="chip-dot live-pulse" />
            Pre-made filter sets
          </span>
          <h1 className="text-[36px] font-semibold leading-[1.05] tracking-[-0.6px] sm:text-[44px]">
            Lists worth watching.
          </h1>
          <p className="max-w-[600px] text-[14px] leading-[1.55] text-[var(--muted)]">
            Each list is a saved filter combination — click through to see today's matches in the
            full dashboard, with all the same filters, insights, and trust scores.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CURATED.map((c, i) => (
            <Link
              key={c.slug}
              href={`/lists/${c.slug}`}
              className="surface group relative flex flex-col gap-3 p-5 anim-rise transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  aria-hidden
                  className="grid size-9 place-items-center rounded-lg border border-[var(--line-strong)] bg-[var(--accent-soft)] text-[16px] font-semibold text-[#2c3aa8]"
                >
                  {c.emoji}
                </span>
                <span className="text-[10px] uppercase tracking-[0.3px] text-[var(--muted)]">
                  {c.filters.range ?? "last7"}
                </span>
              </div>
              <div>
                <div className="text-[15px] font-semibold">{c.title}</div>
                <p className="mt-1 text-[12px] leading-[1.55] text-[var(--muted)]">{c.blurb}</p>
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5">
                {c.filters.sic?.slice(0, 3).map((code) => (
                  <span key={code} className="chip">{code}</span>
                ))}
                {c.filters.regions?.slice(0, 2).map((r) => (
                  <span key={r} className="chip">{r}</span>
                ))}
                {c.filters.nameIncludes ? (
                  <span className="chip">name · {c.filters.nameIncludes}</span>
                ) : null}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-[var(--accent)] opacity-0 transition group-hover:opacity-100">
                Open list →
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
