import { Suspense } from "react"
import { Dashboard } from "@/components/dashboard"

export const dynamic = "force-dynamic"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Dashboard />
    </Suspense>
  )
}
