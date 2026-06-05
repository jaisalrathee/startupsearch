import Link from "next/link"
import type { Appointment, OfficerProfile } from "@/lib/officer"

export function OfficerView({ officer }: { officer: OfficerProfile }) {
  const tier = scoreTier(officer.serialFounderScore)
  return (
    <div className="flex flex-col gap-6">
      <section className="surface anim-rise p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">{officer.occupation || "Director"}</span>
            {officer.nationality ? <span className="chip">{officer.nationality}</span> : null}
            {officer.countryOfResidence ? <span className="chip">{officer.countryOfResidence}</span> : null}
            {officer.dob?.year ? <span className="chip">b. {officer.dob.year}</span> : null}
          </div>
          <h1
            className="font-semibold leading-[1.05] tracking-[-0.6px]"
            style={{ fontSize: "clamp(26px, 5.5vw, 38px)" }}
          >
            {officer.name}
          </h1>
          <p className="text-[13px] text-[var(--muted)] sm:text-[14px]">
            {officer.totalAppointments} UK directorships on record
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--line)] pt-5 sm:grid-cols-4">
          <Fact label="Active" value={String(officer.inOffice)} />
          <Fact label="Resigned" value={String(officer.resigned)} />
          <Fact label="Dissolved" value={String(officer.dissolved)} />
          <ScoreFact score={officer.serialFounderScore} tier={tier} />
        </div>

        {officer.signals.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-1.5 border-t border-[var(--line)] pt-5">
            {officer.signals.map((s) => (
              <span key={s} className="chip">{s}</span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="surface anim-rise p-5" style={{ animationDelay: "120ms" }}>
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <div className="text-[14px] font-semibold">Appointments</div>
            <div className="text-[11px] text-[var(--muted)]">
              {officer.appointments.length} on record (most recent first)
            </div>
          </div>
        </div>
        {officer.appointments.length === 0 ? (
          <p className="text-[13px] text-[var(--muted)]">No appointments to display.</p>
        ) : (
          <ul className="flex flex-col gap-0">
            {officer.appointments.map((a, i) => (
              <AppointmentRow key={`${a.companyNumber}-${i}`} a={a} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function AppointmentRow({ a }: { a: Appointment }) {
  const status = a.companyStatus.toLowerCase()
  const ok = status === "active"
  const isResigned = !!a.resignedOn
  return (
    <li className="border-b border-[var(--line)] py-3 last:border-none">
      <Link
        href={`/c/${a.companyNumber}`}
        className="flex items-baseline justify-between gap-3 rounded-md px-1 py-1 hover:text-[var(--accent)]"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium">{a.companyName}</div>
          <div className="text-[11px] text-[var(--muted)]">
            <span className="font-mono">{a.companyNumber}</span> · {prettyRole(a.role)}
            {a.appointedOn ? ` · since ${a.appointedOn}` : ""}
            {a.resignedOn ? ` · resigned ${a.resignedOn}` : ""}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isResigned ? (
            <span className="chip" style={{ background: "#f4f4f5", color: "#71717a" }}>
              past
            </span>
          ) : null}
          <span
            className="chip"
            style={{
              background: ok ? "#ecfdf3" : "#fef3f2",
              color: ok ? "#067647" : "#b42318",
              borderColor: ok ? "rgba(6,118,71,0.18)" : "rgba(180,35,24,0.18)",
            }}
          >
            {a.companyStatus}
          </span>
        </div>
      </Link>
    </li>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-[20px] font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function ScoreFact({ score, tier }: { score: number; tier: "high" | "mid" | "low" }) {
  const colors = {
    high: { bg: "#ecfdf3", fg: "#067647" },
    mid: { bg: "#fffaeb", fg: "#b54708" },
    low: { bg: "#f4f4f5", fg: "#52525b" },
  }[tier]
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--muted)]">
        Serial-founder score
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className="rounded-md px-2 py-0.5 text-[18px] font-semibold tabular-nums"
          style={{ background: colors.bg, color: colors.fg }}
        >
          {score}
        </span>
        <span className="text-[11px] text-[var(--muted)]">/ 100</span>
      </div>
    </div>
  )
}

function scoreTier(score: number): "high" | "mid" | "low" {
  if (score >= 65) return "high"
  if (score >= 35) return "mid"
  return "low"
}

function prettyRole(role: string): string {
  return role.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}
