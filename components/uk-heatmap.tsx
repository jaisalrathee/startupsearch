"use client"

import { type Bucket } from "@/lib/types"

// A tile-grid representation of the UK regions, laid out approximately
// geographically: Scotland top, Northern Ireland top-left, Wales centre-left,
// London bottom-right. Each region is a single cell — easy to read, easy to
// colour by intensity, and lets us avoid shipping a 200KB SVG of UK borders.
const GRID: Array<{ region: string; col: number; row: number }> = [
  { region: "Scotland", col: 2, row: 0 },
  { region: "Northern Ireland", col: 0, row: 1 },
  { region: "North East", col: 3, row: 1 },
  { region: "North West", col: 2, row: 2 },
  { region: "Yorkshire & Humber", col: 3, row: 2 },
  { region: "Wales", col: 1, row: 3 },
  { region: "West Midlands", col: 2, row: 3 },
  { region: "East Midlands", col: 3, row: 3 },
  { region: "East of England", col: 4, row: 3 },
  { region: "South West", col: 1, row: 4 },
  { region: "South East", col: 3, row: 4 },
  { region: "London", col: 4, row: 4 },
]

const ROWS = 5
const COLS = 5

export function UKHeatmap({
  rows,
  selected,
  onToggle,
}: {
  rows: Bucket[]
  selected: string[]
  onToggle: (region: string) => void
}) {
  const counts = new Map(rows.map((r) => [r.label, r.count]))
  const max = rows.reduce((m, r) => (r.count > m ? r.count : m), 0)

  const cells: Array<Array<{ region: string; count: number } | null>> = Array.from(
    { length: ROWS },
    () => Array.from({ length: COLS }, () => null)
  )
  for (const g of GRID) {
    cells[g.row][g.col] = {
      region: g.region,
      count: counts.get(g.region) ?? 0,
    }
  }

  return (
    <div className="surface p-5 anim-rise" style={{ animationDelay: "240ms" }}>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-[14px] font-semibold">Where it's happening</div>
          <div className="text-[11px] text-[var(--muted)]">
            Click a region to filter — darker = denser formation activity
          </div>
        </div>
      </div>

      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
        {cells.flat().map((cell, i) => {
          if (!cell) return <div key={i} className="aspect-square" />
          const intensity = max ? cell.count / max : 0
          const isSelected = selected.includes(cell.region)
          return (
            <button
              key={i}
              onClick={() => onToggle(cell.region)}
              title={`${cell.region} · ${formatNumber(cell.count)}`}
              className="group relative aspect-square overflow-hidden rounded-lg border text-left transition"
              style={{
                background: heatColor(intensity),
                borderColor: isSelected ? "var(--accent)" : "var(--line)",
                boxShadow: isSelected ? "0 0 0 2px var(--accent)" : "none",
              }}
            >
              <div className="absolute inset-0 grid place-items-center p-1.5 text-center">
                <div>
                  <div
                    className="text-[9px] font-semibold uppercase leading-tight tracking-[0.3px]"
                    style={{ color: intensity > 0.55 ? "white" : "var(--text)" }}
                  >
                    {shortRegion(cell.region)}
                  </div>
                  <div
                    className="mt-0.5 text-[11px] font-semibold tabular-nums"
                    style={{ color: intensity > 0.55 ? "rgba(255,255,255,0.85)" : "var(--muted)" }}
                  >
                    {formatNumber(cell.count)}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.3px] text-[var(--muted)]">
        <span>Low</span>
        <div
          className="h-1.5 flex-1 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, #f4f4f5, #c7c8e6, #6e7fff, #1c1f4a)",
          }}
        />
        <span>High</span>
      </div>
    </div>
  )
}

function heatColor(t: number): string {
  // Soft → deep indigo ramp.
  if (t <= 0) return "#f6f6f7"
  const stops = [
    { stop: 0, c: [246, 246, 247] },
    { stop: 0.25, c: [221, 224, 250] },
    { stop: 0.55, c: [126, 138, 255] },
    { stop: 1, c: [27, 31, 78] },
  ]
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i].stop) {
      const a = stops[i - 1]
      const b = stops[i]
      const span = b.stop - a.stop
      const local = (t - a.stop) / span
      const r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * local)
      const g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * local)
      const bl = Math.round(a.c[2] + (b.c[2] - a.c[2]) * local)
      return `rgb(${r}, ${g}, ${bl})`
    }
  }
  return `rgb(${stops[stops.length - 1].c.join(",")})`
}

function shortRegion(r: string): string {
  const map: Record<string, string> = {
    "Yorkshire & Humber": "Yorks",
    "East of England": "East",
    "Northern Ireland": "N. Ireland",
    "West Midlands": "W. Mids",
    "East Midlands": "E. Mids",
    "South West": "S. West",
    "South East": "S. East",
    "North West": "N. West",
    "North East": "N. East",
  }
  return map[r] ?? r
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-GB").format(n)
}
