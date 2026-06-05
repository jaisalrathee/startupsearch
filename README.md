# Startup Search

A real-time intelligence dashboard for newly registered UK companies, built on the Companies House public API. Filter five million companies by sector, region, postcode, and dozens of other dimensions — with formation-agent noise filtered out, sector momentum tracking, and a naming-zeitgeist watcher.

![Inter / -0.3px](https://img.shields.io/badge/typography-Inter%20%2F%20--0.3px-0b0c0e)
![Next.js 15](https://img.shields.io/badge/next.js-15-000)
![Cloudflare-ready](https://img.shields.io/badge/deploy-Cloudflare-f38020)

## What it does

- **Live search** across every UK company formation, server-side filtered through the Companies House `/advanced-search/companies` endpoint
- **Filter rail**: multi-SIC, multi-region, status, type, name include/exclude, postcode prefix, custom date ranges — fully URL-state-synced and bookmarkable
- **Sector momentum** — rolling 7-day vs trailing 23-day rate per SIC, ranked by acceleration
- **Naming zeitgeist** — trending and fading buzzwords in new company names (AI, Web3, Green, Quantum…)
- **UK regional heatmap** — click a region to filter
- **Trust score** — heuristic per-company score that catches address clustering, generic-SIC patterns, and other formation-agent signals
- **"Similar companies"** — in-memory cosine similarity over SIC + region + name tokens + signals
- **Curated lists** at `/lists` — preset filter combinations like "AI startups this week" or "London software co's"
- **Sparkline + insights** — formation trend, top sectors / regions / cities / signals — all recomputed against the filtered set

## Tech

- **Next.js 15** App Router with Server Components + client-island dashboard
- **TypeScript** end to end
- **Tailwind CSS** + Inter font with `-0.3px` letter-spacing throughout
- **In-memory TTL cache** for slow-moving aggregates (momentum, zeitgeist, trend) — keeps us inside Companies House's 600-req/5-minute throttle
- **Custom SVG charts** — no external charting library
- **Cloudflare Workers**-ready via the OpenNext adapter (Phase B+)

No external UI library — every component is hand-rolled.

## Getting started

```bash
git clone https://github.com/jaisalrathee/startupsearch.git
cd startupsearch
npm install

# 1. Sign up for a Companies House REST API key:
#    https://developer.company-information.service.gov.uk/
# 2. Enable the "Company Search" API product.
# 3. Drop the key into .env.local
echo "COMPANIES_HOUSE_API_KEY=your_key_here" > .env.local

npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without a key, the app falls back to bundled demo data so the UI still renders end-to-end.

## API endpoints

All hits to Companies House happen **server-side** — your key never reaches the browser.

| Route | Purpose |
|---|---|
| `GET /api/companies` | Filtered + paginated company list with sample-based insights and trust scoring |
| `GET /api/momentum` | Sector acceleration (last 7d vs prior 23d). Cached 30 min. |
| `GET /api/zeitgeist` | Trending/fading company-name buzzwords. Cached 30 min. |

Filter params on `/api/companies`:

```
range            today | yesterday | last7 | last30 | custom
from, to         YYYY-MM-DD (when range=custom)
sic              comma-separated SIC codes
regions          comma-separated region labels
cities           comma-separated locality terms
status           any | active | dissolved | liquidation | open
kind             any | ltd | llp | plc | private-limited-guarant-nsc | ...
nameIncludes     string
nameExcludes     string
postcode         postcode prefix (e.g. EC1, SW3)
page             1-based
pageSize         5–100 (default 25)
clean            1 to exclude low-trust companies
```

## Project layout

```
app/
  api/
    companies/route.ts   # main filtered companies endpoint
    momentum/route.ts    # sector momentum
    zeitgeist/route.ts   # naming zeitgeist
  lists/
    page.tsx             # curated list landing
    [slug]/page.tsx      # redirect to dashboard with preset filters
  layout.tsx             # Inter font + global tracking
  page.tsx               # Suspense-wrapped dashboard
components/
  dashboard.tsx          # the whole dashboard client component
  filter-rail.tsx        # sidebar filter UI with URL sync
  uk-heatmap.tsx         # geo-tile heatmap
lib/
  companies-house.ts     # REST client, trust scoring, insight builders
  momentum.ts            # rolling 7d vs 23d rate calc
  zeitgeist.ts           # buzzword frequency tracker
  similarity.ts          # cosine sim feature embedding
  curated.ts             # curated list presets
  cache.ts               # TTL cache for slow aggregates
  sic.ts                 # SIC code → description lookup
  types.ts               # shared types
```

## Design notes

- **Inter** with `-0.3px` letter-spacing globally; `tabular-nums` and `font-mono` opt out so numeric columns stay aligned
- Neutral warm-grey background `#fafafa`, white surfaces with 1px hairlines and 14px radius
- Single indigo accent `#5b6cff` used sparingly — signal chips, trend gradient, filter highlights, pulsing live-dot
- Animations are CSS-keyframe-driven and respect `prefers-reduced-motion`
- Sparkline draws itself with a `pathLength="1"` + `stroke-dashoffset` trick; endpoint marker uses a DOM overlay so it stays a perfect circle regardless of how the SVG stretches

## Roadmap

- **Phase B** — Cloudflare D1 + OAuth (Google / GitHub) → watchlists, tags, notes, saved searches
- **Phase C** — Slack webhook integration for saved-search alerts
- **Phase D** — Director graph (Officers + PSC endpoints), serial-founder detector

## License

MIT — do whatever you want with this.
