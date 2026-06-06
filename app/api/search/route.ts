import { NextResponse } from "next/server"
import { quickSearch } from "@/lib/search"
import { NO_CACHE_HEADERS } from "@/lib/no-cache"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const q = url.searchParams.get("q") ?? ""
  try {
    const hits = await quickSearch(q)
    return NextResponse.json({ hits }, { headers: NO_CACHE_HEADERS })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 502, headers: NO_CACHE_HEADERS })
  }
}
