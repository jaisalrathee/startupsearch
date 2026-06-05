"use client"

import { useMemo, useState } from "react"
import { SIC } from "@/lib/sic"
import {
  type Filters,
  KIND_OPTIONS,
  REGION_LIST,
  STATUS_OPTIONS,
} from "@/lib/types"

const SIC_QUICK_PICKS: Array<{ label: string; codes: string[] }> = [
  { label: "Software / IT", codes: ["62012", "62020", "62090", "63110", "63120"] },
  { label: "Real estate", codes: ["68100", "68209", "68310", "68320"] },
  { label: "Consultancy", codes: ["70210", "70229", "74909"] },
  { label: "Health", codes: ["86220", "86900", "87900"] },
  { label: "Hospitality", codes: ["55100", "56101", "56103"] },
  { label: "Retail", codes: ["47190", "47410", "47910"] },
  { label: "Creative", codes: ["59112", "59200", "73110", "74100"] },
]

export function FilterRail({
  filters,
  onChange,
  onReset,
  totalMatched,
  loading,
}: {
  filters: Filters
  onChange: (next: Partial<Filters>) => void
  onReset: () => void
  totalMatched: number
  loading: boolean
}) {
  const [sicQuery, setSicQuery] = useState("")

  const activeCount =
    filters.sic.length +
    filters.regions.length +
    filters.cities.length +
    (filters.nameIncludes ? 1 : 0) +
    (filters.nameExcludes ? 1 : 0) +
    (filters.postcode ? 1 : 0) +
    (filters.status !== "any" ? 1 : 0) +
    (filters.kind !== "any" ? 1 : 0) +
    (filters.range === "custom" ? 1 : 0) +
    (filters.excludeFormationAgents ? 1 : 0)

  const sicMatches = useMemo(() => {
    const q = sicQuery.trim().toLowerCase()
    if (!q) return [] as Array<[string, string]>
    return Object.entries(SIC)
      .filter(([code, label]) => code.includes(q) || label.toLowerCase().includes(q))
      .slice(0, 8)
  }, [sicQuery])

  const toggleSic = (code: string) => {
    onChange({
      sic: filters.sic.includes(code)
        ? filters.sic.filter((c) => c !== code)
        : [...filters.sic, code],
    })
  }

  const toggleRegion = (region: string) => {
    onChange({
      regions: filters.regions.includes(region)
        ? filters.regions.filter((r) => r !== region)
        : [...filters.regions, region],
    })
  }

  const togglePreset = (codes: string[]) => {
    const all = codes.every((c) => filters.sic.includes(c))
    onChange({
      sic: all
        ? filters.sic.filter((c) => !codes.includes(c))
        : Array.from(new Set([...filters.sic, ...codes])),
    })
  }

  return (
    <aside className="surface sticky top-[68px] h-fit p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold">Filters</span>
          {activeCount > 0 ? (
            <span className="rounded-full bg-[var(--accent-soft)] px-1.5 py-px text-[10px] font-semibold text-[#2c3aa8]">
              {activeCount} active
            </span>
          ) : null}
        </div>
        <button
          onClick={onReset}
          className="text-[11px] font-medium text-[var(--muted)] hover:text-[var(--text)]"
        >
          Reset
        </button>
      </div>

      <div className="mb-3 rounded-lg border border-[var(--line)] bg-[#fbfbfc] px-3 py-2 text-[11px] tabular-nums text-[var(--muted)]">
        {loading ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
            Searching Companies House…
          </span>
        ) : (
          <>
            <span className="text-[var(--text)] font-semibold">{formatNumber(totalMatched)}</span>{" "}
            companies matched
          </>
        )}
      </div>

      <Group label="Date range">
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              ["last30", "30 days"],
              ["last7", "7 days"],
              ["yesterday", "Yesterday"],
              ["today", "Today"],
            ] as const
          ).map(([value, label]) => (
            <PillToggle
              key={value}
              active={filters.range === value}
              onClick={() => onChange({ range: value, customStart: undefined, customEnd: undefined })}
            >
              {label}
            </PillToggle>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <input
            type="date"
            value={filters.customStart ?? ""}
            onChange={(e) =>
              onChange({ range: "custom", customStart: e.target.value, customEnd: filters.customEnd })
            }
            className="filter-input"
            aria-label="From date"
          />
          <input
            type="date"
            value={filters.customEnd ?? ""}
            onChange={(e) =>
              onChange({ range: "custom", customStart: filters.customStart, customEnd: e.target.value })
            }
            className="filter-input"
            aria-label="To date"
          />
        </div>
      </Group>

      <Group label="SIC / sector">
        <div className="flex flex-wrap gap-1.5">
          {SIC_QUICK_PICKS.map((p) => {
            const active = p.codes.every((c) => filters.sic.includes(c))
            return (
              <PillToggle key={p.label} active={active} onClick={() => togglePreset(p.codes)}>
                {p.label}
              </PillToggle>
            )
          })}
        </div>
        <div className="relative mt-2">
          <input
            value={sicQuery}
            onChange={(e) => setSicQuery(e.target.value)}
            placeholder="Search code or description…"
            className="filter-input"
          />
          {sicMatches.length > 0 ? (
            <div className="mt-1.5 flex flex-col gap-1 rounded-lg border border-[var(--line)] bg-white p-1">
              {sicMatches.map(([code, label]) => (
                <button
                  key={code}
                  onClick={() => {
                    toggleSic(code)
                    setSicQuery("")
                  }}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-[var(--accent-soft)]"
                >
                  <span className="truncate"><span className="font-mono text-[11px] text-[var(--muted)]">{code}</span> · {label}</span>
                  <span className="text-[10px] text-[var(--accent)]">add</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {filters.sic.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {filters.sic.map((code) => (
              <button
                key={code}
                onClick={() => toggleSic(code)}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[#2c3aa8]"
              >
                {code}
                <span className="opacity-60">×</span>
              </button>
            ))}
          </div>
        ) : null}
      </Group>

      <Group label="Region">
        <div className="flex flex-wrap gap-1.5">
          {REGION_LIST.map((r) => (
            <PillToggle
              key={r}
              active={filters.regions.includes(r)}
              onClick={() => toggleRegion(r)}
            >
              {r}
            </PillToggle>
          ))}
        </div>
      </Group>

      <Group label="Postcode prefix">
        <input
          value={filters.postcode ?? ""}
          onChange={(e) => onChange({ postcode: e.target.value.toUpperCase() || undefined })}
          placeholder="e.g. EC1, SW3, M2"
          className="filter-input"
        />
      </Group>

      <Group label="Name contains">
        <div className="grid gap-1.5">
          <input
            value={filters.nameIncludes ?? ""}
            onChange={(e) => onChange({ nameIncludes: e.target.value || undefined })}
            placeholder="includes…"
            className="filter-input"
          />
          <input
            value={filters.nameExcludes ?? ""}
            onChange={(e) => onChange({ nameExcludes: e.target.value || undefined })}
            placeholder="excludes…"
            className="filter-input"
          />
        </div>
      </Group>

      <Group label="Status & type">
        <select
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value as Filters["status"] })}
          className="filter-input mb-1.5"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={filters.kind}
          onChange={(e) => onChange({ kind: e.target.value as Filters["kind"] })}
          className="filter-input"
        >
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Group>

      <Group label="Data quality" last>
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--line)] bg-[#fbfbfc] p-2.5 text-[12px]">
          <input
            type="checkbox"
            checked={filters.excludeFormationAgents}
            onChange={(e) => onChange({ excludeFormationAgents: e.target.checked })}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">Exclude formation agents</span>
            <span className="block text-[var(--muted)]">Hide companies with low trust scores (mass-registered addresses, generic SICs).</span>
          </span>
        </label>
      </Group>
    </aside>
  )
}

function Group({
  label,
  children,
  last,
}: {
  label: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div
      className={
        "flex flex-col gap-2 py-3" +
        (last ? "" : " border-b border-[var(--line)]")
      }
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--muted)]">
        {label}
      </div>
      {children}
    </div>
  )
}

function PillToggle({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition " +
        (active
          ? "border-[var(--text)] bg-[var(--text)] text-white"
          : "border-[var(--line-strong)] bg-white text-[var(--muted)] hover:text-[var(--text)]")
      }
    >
      {children}
    </button>
  )
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-GB").format(n)
}
