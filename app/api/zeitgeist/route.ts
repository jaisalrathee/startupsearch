import { NextResponse } from "next/server"
import { fetchZeitgeist } from "@/lib/zeitgeist"
import { NO_CACHE_HEADERS } from "@/lib/no-cache"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const data = await fetchZeitgeist()
    return NextResponse.json({ items: data }, { headers: NO_CACHE_HEADERS })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 502, headers: NO_CACHE_HEADERS })
  }
}
