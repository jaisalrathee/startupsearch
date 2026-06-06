// Standard no-cache headers for all API responses so neither the browser
// nor any intermediary serves a stale copy of our data-driven endpoints.
export const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
} as const
