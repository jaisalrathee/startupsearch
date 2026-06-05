"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FilterRail } from "@/components/filter-rail"
import { UKHeatmap } from "@/components/uk-heatmap"
import { rankSimilar } from "@/lib/similarity"
import type { MomentumPoint } from "@/lib/momentum"
import type { ZeitgeistPoint } from "@/lib/zeitgeist"
import {
  DEFAULT_FILTERS,
  type Bucket,
  type Company,
  type Filters,
  type RadarResponse,
} from "@/lib/types"

type SortKey = "name" | "incorporatedOn" | "city" | "trustScore"
type SortDir = "asc" | "desc"

export function Dashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const filters = useMemo(() => parseFiltersFromURL(searchParams), [searchParams])

  const [data, setData] = useState<RadarResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>("incorporatedOn")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [momentum, setMomentum] = useState<MomentumPoint[] | null>(null)
  const [zeitgeist, setZeitgeist] = useState<ZeitgeistPoint[] | null>(null)
  const [similarFor, setSimilarFor] = useState<Company | null>(null)

  const queryString = useMemo(() => filtersToQuery(filters), [filters])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/companies?${queryString}`)
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "Failed to load.")
      setData(payload)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.")
    } finally {
      setLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    void load()
  }, [load])

  // Pulse data: momentum + zeitgeist load once on mount (independent of filters).
  useEffect(() => {
    let cancelled = false
    fetch("/api/momentum")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && Array.isArray(j.items)) setMomentum(j.items)
      })
      .catch(() => {})
    fetch("/api/zeitgeist")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && Array.isArray(j.items)) setZeitgeist(j.items)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const updateFilters = useCallback(
    (next: Partial<Filters>) => {
      const merged: Filters = { ...filters, ...next, page: next.page ?? 1 }
      router.replace(`/?${filtersToQuery(merged)}`, { scroll: false })
    },
    [filters, router]
  )

  const resetFilters = useCallback(() => {
    router.replace("/", { scroll: false })
  }, [router])

  const setPage = useCallback(
    (page: number) => {
      router.replace(`/?${filtersToQuery({ ...filters, page })}`, { scroll: false })
    },
    [filters, router]
  )

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto w-full max-w-[1320px] px-5 pb-24 pt-8 sm:px-8">
        <Hero source={data?.source} totalMatched={data?.pagination.totalMatched ?? 0} loading={loading} />

        <div className="mt-7 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <FilterRail
            filters={filters}
            onChange={updateFilters}
            onReset={resetFilters}
            totalMatched={data?.pagination.totalMatched ?? 0}
            loading={loading}
          />

          <div className="flex flex-col gap-4">
            {error ? <ErrorPanel message={error} onRetry={load} /> : null}

            {loading || !data ? (
              <LoadingState />
            ) : (
              <>
                <Stats data={data} />
                <TrendCard trend={data.insights.trend} />
                <section className="grid gap-3 md:grid-cols-2">
                  <RankCard
                    title="Top sectors"
                    subtitle="By SIC frequency (filtered)"
                    rows={data.insights.bySic.slice(0, 6)}
                    delay={120}
                  />
                  <RankCard
                    title="Top regions"
                    subtitle="Where new companies are forming"
                    rows={data.insights.byRegion.slice(0, 6)}
                    delay={180}
                  />
                  <RankCard
                    title="Top cities"
                    subtitle="From registered office locality"
                    rows={data.insights.byCity.slice(0, 6)}
                    delay={240}
                  />
                  <RankCard
                    title="Signals"
                    subtitle="Keywords spotted in company names"
                    rows={data.insights.bySignal.slice(0, 6)}
                    delay={300}
                  />
                </section>

                <section className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                  <MomentumCard items={momentum} />
                  <ZeitgeistCard items={zeitgeist} />
                </section>

                <UKHeatmap
                  rows={data.insights.byRegion}
                  selected={filters.regions}
                  onToggle={(region) => {
                    const next = filters.regions.includes(region)
                      ? filters.regions.filter((r) => r !== region)
                      : [...filters.regions, region]
                    updateFilters({ regions: next })
                  }}
                />

                <CompaniesTable
                  data={data}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={(k) => {
                    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc")
                    else {
                      setSortKey(k)
                      setSortDir("desc")
                    }
                  }}
                  setPage={setPage}
                  onSimilar={(c) => setSimilarFor(c)}
                />

                {similarFor ? (
                  <SimilarPanel
                    target={similarFor}
                    pool={data.companies}
                    onClose={() => setSimilarFor(null)}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>

        <Footer />
      </div>
    </main>
  )
}

// ─── URL state sync ──────────────────────────────────────────────────────────
function parseFiltersFromURL(sp: URLSearchParams): Filters {
  const get = (k: string) => sp.get(k) ?? undefined
  const list = (k: string) => (get(k) ? (get(k) as string).split(",").filter(Boolean) : [])
  const num = (k: string, fallback: number) => {
    const v = get(k)
    if (!v) return fallback
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : fallback
  }
  return {
    ...DEFAULT_FILTERS,
    range: (get("range") as Filters["range"]) ?? "last7",
    customStart: get("from"),
    customEnd: get("to"),
    sic: list("sic"),
    regions: list("regions"),
    cities: list("cities"),
    status: (get("status") as Filters["status"]) ?? "any",
    kind: (get("kind") as Filters["kind"]) ?? "any",
    nameIncludes: get("nameIncludes"),
    nameExcludes: get("nameExcludes"),
    postcode: get("postcode"),
    page: num("page", 1),
    pageSize: num("pageSize", 25),
    excludeFormationAgents: get("clean") === "1",
  }
}

function filtersToQuery(f: Filters): string {
  const params = new URLSearchParams()
  if (f.range !== "last7") params.set("range", f.range)
  if (f.customStart) params.set("from", f.customStart)
  if (f.customEnd) params.set("to", f.customEnd)
  if (f.sic.length) params.set("sic", f.sic.join(","))
  if (f.regions.length) params.set("regions", f.regions.join(","))
  if (f.cities.length) params.set("cities", f.cities.join(","))
  if (f.status !== "any") params.set("status", f.status)
  if (f.kind !== "any") params.set("kind", f.kind)
  if (f.nameIncludes) params.set("nameIncludes", f.nameIncludes)
  if (f.nameExcludes) params.set("nameExcludes", f.nameExcludes)
  if (f.postcode) params.set("postcode", f.postcode)
  if (f.page !== 1) params.set("page", String(f.page))
  if (f.pageSize !== 25) params.set("pageSize", String(f.pageSize))
  if (f.excludeFormationAgents) params.set("clean", "1")
  return params.toString()
}

// ─── UI pieces ───────────────────────────────────────────────────────────────
function Header() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-[var(--line)]"
      style={{
        background: "rgba(250, 250, 250, 0.94)",
        backdropFilter: "saturate(180%) blur(14px)",
        WebkitBackdropFilter: "saturate(180%) blur(14px)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-5 py-3 sm:px-8">
        <div className="flex items-center gap-2.5">
          <Logo />
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-semibold">Radar</span>
            <span className="text-[12px] text-[var(--muted)]">/ UK company formations</span>
          </div>
        </div>
        <nav className="hidden items-center gap-1 sm:flex">
          <a className="btn" href="/lists">
            Lists
          </a>
          <a className="btn" href="#companies">
            Companies
          </a>
          <a
            className="btn btn-primary"
            href="https://developer.company-information.service.gov.uk/"
            target="_blank"
            rel="noreferrer"
          >
            API
          </a>
        </nav>
      </div>
    </header>
  )
}

function Logo() {
  return (
    <div className="relative grid size-8 place-items-center overflow-hidden rounded-lg border border-[var(--line-strong)] bg-white">
      <div className="absolute inset-0 dotgrid opacity-50" />
      <div className="relative size-3 rounded-full bg-[var(--accent)] shadow-[0_0_0_4px_rgba(91,108,255,0.18)]" />
    </div>
  )
}

function Hero({
  source,
  totalMatched,
  loading,
}: {
  source?: "live" | "demo"
  totalMatched: number
  loading: boolean
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center gap-2 anim-rise" style={{ animationDelay: "0ms" }}>
        <span className="chip">
          <span className="chip-dot live-pulse" />
          {source === "demo"
            ? "Demo data · set COMPANIES_HOUSE_API_KEY for live"
            : "Live · Companies House"}
        </span>
        <span className="chip" style={{ background: "white" }}>
          {loading ? "…" : `${new Intl.NumberFormat("en-GB").format(totalMatched)} matches`}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <h1
          className="text-[36px] font-semibold leading-[1.05] tracking-[-0.6px] sm:text-[44px] anim-rise"
          style={{ animationDelay: "80ms" }}
        >
          See every UK company,
          <br />
          the moment it's born.
        </h1>
        <p
          className="max-w-[640px] text-[14px] leading-[1.55] text-[var(--muted)] anim-rise"
          style={{ animationDelay: "160ms" }}
        >
          Filter 5 million UK companies by sector, region, postcode, and dozens of other dimensions —
          straight from Companies House, with formation-agent noise filtered out.
        </p>
      </div>
    </section>
  )
}

function Stats({ data }: { data: RadarResponse }) {
  const topCity = data.insights.byCity[0]?.label ?? "—"
  const topCityCount = data.insights.byCity[0]?.count ?? 0
  const topSector = data.insights.bySic[0]?.label?.split(" · ")[1] ?? "—"
  const topSectorCount = data.insights.bySic[0]?.count ?? 0
  const peakDay = peakOf(data.insights.trend)

  const items = [
    {
      label: "Matches in window",
      value: formatNumber(data.pagination.totalMatched),
      sub: `${data.range.start} → ${data.range.end}`,
    },
    { label: "Top city", value: topCity, sub: `${formatNumber(topCityCount)} in sample` },
    { label: "Top sector", value: topSector, sub: `${formatNumber(topSectorCount)} in sample` },
    { label: "Peak day", value: peakDay.date, sub: `${formatNumber(peakDay.count)} that day` },
  ]

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((s, i) => (
        <div
          key={i}
          className="surface p-4 anim-rise"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.4px] text-[var(--muted)]">
            {s.label}
          </div>
          <div className="mt-1.5 text-[20px] font-semibold leading-tight">
            <span className="line-clamp-1">{s.value}</span>
          </div>
          <div className="mt-1 text-[12px] text-[var(--muted)] line-clamp-1">{s.sub}</div>
        </div>
      ))}
    </section>
  )
}

function peakOf(trend: { date: string; count: number }[]) {
  if (trend.length === 0) return { date: "—", count: 0 }
  return trend.reduce((acc, p) => (p.count > acc.count ? p : acc), trend[0])
}

function TrendCard({ trend }: { trend: { date: string; count: number }[] }) {
  const totalInWindow = trend.reduce((acc, p) => acc + p.count, 0)
  const peak = peakOf(trend)
  const first = trend[0]?.count ?? 0
  const last = trend[trend.length - 1]?.count ?? 0
  const delta = first ? Math.round(((last - first) / first) * 100) : 0
  const trendingUp = last >= first

  const VBW = 800
  const VBH = 200
  const PAD_X = 4
  const PAD_TOP = 18
  const PAD_BOTTOM = 14
  const plotW = VBW - PAD_X * 2
  const plotH = VBH - PAD_TOP - PAD_BOTTOM
  const maxCount = trend.reduce((m, p) => (p.count > m ? p.count : m), 0)
  const denom = Math.max(maxCount, 1)

  const pts = trend.map((p, i) => {
    const x = PAD_X + (trend.length > 1 ? (i * plotW) / (trend.length - 1) : plotW / 2)
    const y = PAD_TOP + plotH - (p.count / denom) * plotH
    return { x, y, value: p.count, date: p.date }
  })

  const smoothPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return ""
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] ?? points[i]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2] ?? p2
      const t = 0.18
      const cp1x = p1.x + (p2.x - p0.x) * t
      const cp1y = p1.y + (p2.y - p0.y) * t
      const cp2x = p2.x - (p3.x - p1.x) * t
      const cp2y = p2.y - (p3.y - p1.y) * t
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }
    return d
  }

  const linePath = smoothPath(pts)
  const areaPath =
    pts.length > 0
      ? `${linePath} L ${pts[pts.length - 1].x} ${VBH - PAD_BOTTOM} L ${pts[0].x} ${VBH - PAD_BOTTOM} Z`
      : ""

  const gridYs = [0.25, 0.5, 0.75, 1].map((f) => PAD_TOP + plotH * f)

  const endpoint = pts[pts.length - 1]
  const endXPct = endpoint ? (endpoint.x / VBW) * 100 : 50
  const endYPct = endpoint ? (endpoint.y / VBH) * 100 : 50
  const peakPt = pts.find((p) => p.value === peak.count) ?? endpoint
  const peakXPct = peakPt ? (peakPt.x / VBW) * 100 : 50
  const peakYPct = peakPt ? (peakPt.y / VBH) * 100 : 50

  return (
    <div className="surface p-5 anim-rise" style={{ animationDelay: "60ms" }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.4px] text-[var(--muted)]">
            Formation trend
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-semibold tabular-nums leading-none">
              {formatNumber(totalInWindow)}
            </span>
            <span className="text-[12px] text-[var(--muted)]">across the window</span>
            {trend.length > 1 ? (
              <span
                className="tabular-nums"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: trendingUp ? "#ecfdf3" : "#fef3f2",
                  color: trendingUp ? "#067647" : "#b42318",
                  border: `1px solid ${
                    trendingUp ? "rgba(6,118,71,0.18)" : "rgba(180,35,24,0.18)"
                  }`,
                }}
              >
                {trendingUp ? "▲" : "▼"} {Math.abs(delta)}%
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-[var(--accent)]" />
            Daily formations
          </span>
          <span className="tabular-nums">
            {trend[0]?.date} → {trend[trend.length - 1]?.date}
          </span>
        </div>
      </div>

      <div className="relative mt-5 h-[200px] w-full">
        <svg
          viewBox={`0 0 ${VBW} ${VBH}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#5b6cff" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#5b6cff" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#5b6cff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="trendStroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#0b0c0e" />
              <stop offset="100%" stopColor="#5b6cff" />
            </linearGradient>
          </defs>

          <g className="anim-fade" style={{ animationDelay: "300ms" }}>
            {gridYs.map((y, i) => (
              <line
                key={i}
                x1={PAD_X}
                x2={VBW - PAD_X}
                y1={y}
                y2={y}
                stroke="rgba(15,17,21,0.06)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                strokeDasharray={i === gridYs.length - 1 ? "0" : "3 4"}
              />
            ))}
          </g>

          {areaPath ? (
            <path
              d={areaPath}
              fill="url(#trendFill)"
              className="anim-fade"
              style={{ animationDelay: "1300ms" }}
            />
          ) : null}

          {linePath ? (
            <path
              d={linePath}
              fill="none"
              stroke="url(#trendStroke)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pathLength={1}
              className="anim-draw"
              style={{ animationDelay: "300ms" }}
            />
          ) : null}
        </svg>

        {peakPt && trend.length > 1 ? (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full anim-pop"
            style={{
              left: `${peakXPct}%`,
              top: `calc(${peakYPct}% - 6px)`,
              animationDelay: "1500ms",
            }}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="rounded-md border border-[var(--line)] bg-white px-2 py-0.5 text-[10px] font-semibold tabular-nums shadow-soft">
                Peak · {formatNumber(peak.count)}
              </span>
              <span className="block h-2 w-px bg-[var(--line-strong)]" />
            </div>
          </div>
        ) : null}

        {endpoint ? (
          <div
            className="pointer-events-none absolute anim-pop"
            style={{
              left: `${endXPct}%`,
              top: `${endYPct}%`,
              transform: "translate(-50%, -50%)",
              animationDelay: "1650ms",
            }}
          >
            <span className="relative grid place-items-center">
              <span className="absolute size-3 rounded-full bg-[var(--accent)] halo" />
              <span className="relative size-2.5 rounded-full bg-white shadow-[0_0_0_2px_var(--accent),0_2px_6px_rgba(91,108,255,0.35)]" />
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function RankCard({
  title,
  subtitle,
  rows,
  delay = 0,
}: {
  title: string
  subtitle: string
  rows: Bucket[]
  delay?: number
}) {
  const max = rows.reduce((m, r) => (r.count > m ? r.count : m), 0)
  return (
    <div className="surface p-5 anim-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-[14px] font-semibold">{title}</div>
          <div className="text-[11px] text-[var(--muted)]">{subtitle}</div>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">No signal yet.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((row, i) => {
            const pct = max ? (row.count / max) * 100 : 0
            return (
              <li key={row.label} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium">{row.label}</div>
                  <div className="bar-track mt-1.5">
                    <div
                      className="bar-fill anim-bar"
                      style={
                        {
                          ["--bar-w" as string]: `${pct}%`,
                          animationDelay: `${delay + 250 + i * 70}ms`,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                </div>
                <div className="tabular-nums text-[11px] font-medium text-[var(--muted)]">
                  {formatNumber(row.count)}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function MomentumCard({ items }: { items: MomentumPoint[] | null }) {
  if (!items) {
    return (
      <div className="surface p-5">
        <div className="text-[14px] font-semibold">Sector momentum</div>
        <div className="text-[11px] text-[var(--muted)]">Last 7d vs prior 23d</div>
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-5 w-full" />
          ))}
        </div>
      </div>
    )
  }
  const max = Math.max(0.5, ...items.map((i) => Math.abs(i.delta)))
  return (
    <div className="surface p-5 anim-rise" style={{ animationDelay: "320ms" }}>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-[14px] font-semibold">Sector momentum</div>
          <div className="text-[11px] text-[var(--muted)]">
            7-day rate vs the prior 23 — what's accelerating, what's cooling
          </div>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {items.slice(0, 8).map((p) => {
          const pct = Math.round(p.delta * 100)
          const w = Math.min(100, (Math.abs(p.delta) / max) * 100)
          const accel = p.signal === "accelerating"
          const cool = p.signal === "cooling"
          return (
            <li key={p.code} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12px] font-medium">
                    <span className="font-mono text-[10px] text-[var(--muted)]">{p.code}</span>{" "}
                    · {p.label}
                  </span>
                  <span
                    className="shrink-0 tabular-nums text-[11px] font-semibold"
                    style={{ color: accel ? "#067647" : cool ? "#b42318" : "var(--muted)" }}
                  >
                    {pct > 0 ? "+" : ""}
                    {pct}%
                  </span>
                </div>
                <div className="bar-track mt-1 relative h-1.5 overflow-visible">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--line-strong)]" />
                  <div
                    className="absolute inset-y-0 rounded-full"
                    style={{
                      background: accel ? "#12b76a" : cool ? "#f04438" : "#a1a1aa",
                      left: p.delta >= 0 ? "50%" : `${50 - w / 2}%`,
                      width: `${w / 2}%`,
                    }}
                  />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ZeitgeistCard({ items }: { items: ZeitgeistPoint[] | null }) {
  if (!items) {
    return (
      <div className="surface p-5">
        <div className="text-[14px] font-semibold">Naming zeitgeist</div>
        <div className="text-[11px] text-[var(--muted)]">Buzzword tracker</div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-14 w-full" />
          ))}
        </div>
      </div>
    )
  }
  const trending = items.filter((i) => i.signal === "trending").slice(0, 6)
  const fading = items.filter((i) => i.signal === "fading").slice(0, 4)
  return (
    <div className="surface p-5 anim-rise" style={{ animationDelay: "380ms" }}>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-[14px] font-semibold">Naming zeitgeist</div>
          <div className="text-[11px] text-[var(--muted)]">
            What people are calling their companies this week
          </div>
        </div>
      </div>
      <div className="mb-3">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.3px] text-[var(--muted)]">
          Trending
        </div>
        <div className="grid grid-cols-3 gap-2">
          {trending.map((t) => (
            <div
              key={t.term}
              className="rounded-lg border border-[rgba(6,118,71,0.18)] bg-[#ecfdf3] p-2.5"
            >
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[13px] font-semibold text-[#067647]">{t.term}</span>
                <span className="text-[10px] font-semibold tabular-nums text-[#067647]">
                  +{Math.round(t.delta * 100)}%
                </span>
              </div>
              <div className="mt-0.5 text-[10px] tabular-nums text-[#067647]/70">
                {t.recent} new this week
              </div>
            </div>
          ))}
        </div>
      </div>
      {fading.length > 0 ? (
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.3px] text-[var(--muted)]">
            Fading
          </div>
          <div className="flex flex-wrap gap-1.5">
            {fading.map((t) => (
              <span
                key={t.term}
                className="chip tabular-nums"
                style={{
                  background: "#fef3f2",
                  color: "#b42318",
                  borderColor: "rgba(180,35,24,0.18)",
                }}
              >
                {t.term} {Math.round(t.delta * 100)}%
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SimilarPanel({
  target,
  pool,
  onClose,
}: {
  target: Company
  pool: Company[]
  onClose: () => void
}) {
  const similar = useMemo(() => rankSimilar(target, pool, 5), [target, pool])
  return (
    <div
      className="surface anim-rise overflow-hidden border-l-2"
      style={{ animationDelay: "0ms", borderLeftColor: "var(--accent)" }}
    >
      <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
        <div>
          <div className="text-[14px] font-semibold">Similar to {target.name}</div>
          <div className="text-[11px] text-[var(--muted)]">
            By SIC overlap, region, name tokens, signals — top 5 in the current view
          </div>
        </div>
        <button onClick={onClose} className="btn">
          Close ×
        </button>
      </div>
      <table className="radar">
        <thead>
          <tr>
            <th>Company</th>
            <th>City</th>
            <th>SIC</th>
            <th>Trust</th>
          </tr>
        </thead>
        <tbody>
          {similar.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-[12px] text-[var(--muted)]">
                No good matches in the current view. Try widening the filters.
              </td>
            </tr>
          ) : (
            similar.map((c) => (
              <tr key={c.number}>
                <td>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-[11px] text-[var(--muted)]">{c.region}</div>
                </td>
                <td className="text-[12px]">{c.city}</td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    {c.sicCodes.slice(0, 2).map((code) => (
                      <span key={code} className="chip">{code}</span>
                    ))}
                  </div>
                </td>
                <td>
                  <TrustPill score={c.trustScore} reasons={c.trustReasons} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function CompaniesTable({
  data,
  sortKey,
  sortDir,
  onSort,
  setPage,
  onSimilar,
}: {
  data: RadarResponse
  sortKey: SortKey
  sortDir: SortDir
  onSort: (k: SortKey) => void
  setPage: (p: number) => void
  onSimilar: (c: Company) => void
}) {
  const rows = useMemo(() => {
    return [...data.companies].sort((a, b) => {
      const left = (a as unknown as Record<string, unknown>)[sortKey]
      const right = (b as unknown as Record<string, unknown>)[sortKey]
      if (typeof left === "number" && typeof right === "number") {
        return sortDir === "asc" ? left - right : right - left
      }
      const cmp = String(left ?? "").localeCompare(String(right ?? ""))
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [data.companies, sortKey, sortDir])

  return (
    <section
      id="companies"
      className="surface overflow-hidden anim-rise"
      style={{ animationDelay: "360ms" }}
    >
      <div className="flex flex-col gap-3 border-b border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <div className="text-[14px] font-semibold">Companies</div>
          <div className="text-[11px] text-[var(--muted)]">
            Showing {formatNumber(rows.length)} of {formatNumber(data.pagination.totalMatched)} ·
            page {data.pagination.page} of {data.pagination.pageCount}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyRow />
      ) : (
        <div className="overflow-x-auto">
          <table className="radar">
            <thead>
              <tr>
                <SortableTh active={sortKey === "name"} dir={sortDir} onClick={() => onSort("name")}>
                  Company
                </SortableTh>
                <th>Number</th>
                <SortableTh
                  active={sortKey === "incorporatedOn"}
                  dir={sortDir}
                  onClick={() => onSort("incorporatedOn")}
                >
                  Incorporated
                </SortableTh>
                <th>Status</th>
                <SortableTh active={sortKey === "city"} dir={sortDir} onClick={() => onSort("city")}>
                  City
                </SortableTh>
                <th>SIC</th>
                <SortableTh
                  active={sortKey === "trustScore"}
                  dir={sortDir}
                  onClick={() => onSort("trustScore")}
                >
                  Trust
                </SortableTh>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <Row key={c.number} c={c} onSimilar={onSimilar} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-3">
        <div className="text-[12px] text-[var(--muted)]">
          Page {data.pagination.page} of {data.pagination.pageCount}
        </div>
        <div className="flex gap-2">
          <button
            className="btn disabled:opacity-40"
            disabled={data.pagination.page === 1}
            onClick={() => setPage(Math.max(1, data.pagination.page - 1))}
          >
            ← Prev
          </button>
          <button
            className="btn disabled:opacity-40"
            disabled={data.pagination.page >= data.pagination.pageCount}
            onClick={() => setPage(Math.min(data.pagination.pageCount, data.pagination.page + 1))}
          >
            Next →
          </button>
        </div>
      </div>
    </section>
  )
}

function Row({ c, onSimilar }: { c: Company; onSimilar: (c: Company) => void }) {
  return (
    <tr>
      <td>
        <div className="font-medium">{c.name}</div>
        <div className="text-[11px] text-[var(--muted)]">{c.region}{c.postcode ? ` · ${c.postcode}` : ""}</div>
      </td>
      <td className="font-mono text-[11px] text-[var(--muted)]">{c.number}</td>
      <td className="tabular-nums text-[11px] text-[var(--muted)]">{c.incorporatedOn || "—"}</td>
      <td>
        <StatusPill status={c.status} />
      </td>
      <td className="text-[12px]">{c.city}</td>
      <td>
        <div className="flex flex-wrap gap-1.5">
          {c.sicCodes.length === 0 ? (
            <span className="text-[11px] text-[var(--muted)]">—</span>
          ) : (
            c.sicCodes.slice(0, 2).map((code) => (
              <span key={code} className="chip">
                {code}
              </span>
            ))
          )}
        </div>
      </td>
      <td>
        <TrustPill score={c.trustScore} reasons={c.trustReasons} />
      </td>
      <td>
        <button
          onClick={() => onSimilar(c)}
          className="text-[11px] font-medium text-[var(--accent)] hover:underline"
        >
          Similar →
        </button>
      </td>
    </tr>
  )
}

function TrustPill({ score, reasons }: { score: number; reasons: string[] }) {
  const tier =
    score >= 80 ? "high" : score >= 50 ? "mid" : "low"
  const colors = {
    high: { bg: "#ecfdf3", fg: "#067647", border: "rgba(6,118,71,0.18)" },
    mid: { bg: "#fffaeb", fg: "#b54708", border: "rgba(181,71,8,0.18)" },
    low: { bg: "#fef3f2", fg: "#b42318", border: "rgba(180,35,24,0.18)" },
  }[tier]
  return (
    <span
      className="chip tabular-nums"
      title={reasons.join(" · ") || "Strong signal"}
      style={{
        background: colors.bg,
        color: colors.fg,
        borderColor: colors.border,
      }}
    >
      {score}
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  const ok = status.toLowerCase() === "active"
  return (
    <span
      className="chip"
      style={{
        background: ok ? "#ecfdf3" : "#fef3f2",
        color: ok ? "#067647" : "#b42318",
        borderColor: ok ? "rgba(6, 118, 71, 0.18)" : "rgba(180, 35, 24, 0.18)",
      }}
    >
      <span className="chip-dot" style={{ background: ok ? "#12b76a" : "#f04438" }} />
      {status}
    </span>
  )
}

function SortableTh({
  active,
  dir,
  onClick,
  children,
}: {
  active: boolean
  dir: SortDir
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <th>
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 text-inherit hover:text-[var(--text)]"
      >
        {children}
        <span aria-hidden className="text-[10px]">
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface p-4">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton mt-3 h-6 w-32" />
            <div className="skeleton mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="surface p-5">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton mt-4 h-[160px] w-full" />
      </div>
    </div>
  )
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="surface flex items-center justify-between gap-4 p-5">
      <div>
        <div className="text-[14px] font-semibold">Couldn't load companies</div>
        <div className="mt-1 text-[13px] text-[var(--muted)]">{message}</div>
      </div>
      <button className="btn btn-primary" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}

function EmptyRow() {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-16 text-center">
      <div className="text-[14px] font-semibold">No companies matched</div>
      <div className="max-w-[320px] text-[13px] text-[var(--muted)]">
        Loosen a filter, widen the date range, or clear all to start over.
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="mt-12 flex items-center justify-between border-t border-[var(--line)] pt-5 text-[12px] text-[var(--muted)]">
      <p>Radar · built from Companies House public data.</p>
      <p>Inter / -0.3px</p>
    </footer>
  )
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-GB").format(n)
}
