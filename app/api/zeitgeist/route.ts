import { NextResponse } from "next/server"
import { fetchZeitgeist } from "@/lib/zeitgeist"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const data = await fetchZeitgeist()
    return NextResponse.json({ items: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
