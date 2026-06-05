// Generalized Companies House REST client.
// All endpoints share the same auth (HTTP Basic with apiKey as username,
// blank password), the same rate-limit posture (~600 req / 5 min), and
// the same retry / timeout behaviour.

const API_BASE = "https://api.company-information.service.gov.uk"

export interface CHFetchOptions {
  // Optional query params to append.
  params?: Record<string, string | number | undefined>
  // Override the per-request timeout.
  timeoutMs?: number
  // 404 normally returns null; set true to throw instead.
  throwOn404?: boolean
}

export class CHError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = "CHError"
  }
}

export async function chFetch<T = unknown>(
  apiKey: string,
  path: string,
  opts: CHFetchOptions = {}
): Promise<T | null> {
  const params = new URLSearchParams()
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v === undefined || v === null) continue
      params.set(k, String(v))
    }
  }
  const qs = params.toString()
  const url = `${API_BASE}${path.startsWith("/") ? path : "/" + path}${qs ? "?" + qs : ""}`
  const auth = Buffer.from(`${apiKey}:`).toString("base64")
  const timeoutMs = opts.timeoutMs ?? 9000

  let lastStatus = 0
  let lastError: unknown = null
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      const res = await fetch(url, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
        signal: controller.signal,
      })
      clearTimeout(timer)
      lastStatus = res.status

      if (res.ok) return (await res.json()) as T

      if (res.status === 401 || res.status === 403) {
        throw new CHError(res.status, "Companies House rejected the API key.")
      }
      if (res.status === 404) {
        if (opts.throwOn404) throw new CHError(404, "Not found.")
        return null
      }
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw new CHError(res.status, `Companies House error ${res.status}.`)
      }
      // 5xx and 429 fall through to retry
      lastError = new CHError(res.status, `status ${res.status}`)
    } catch (err) {
      if (err instanceof CHError && err.status >= 400 && err.status < 500 && err.status !== 429) {
        throw err
      }
      lastError = err
    }
    const baseDelay = lastStatus === 429 ? 1500 : 300
    await new Promise((r) => setTimeout(r, baseDelay + attempt * 600))
  }
  console.warn("Companies House: skipping after retries", path, lastError)
  return null
}
