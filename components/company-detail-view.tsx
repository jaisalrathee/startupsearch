import Link from "next/link"
import type { CompanyDetail, OfficerLite, PSC, FilingItem, AddressNeighbor } from "@/lib/company-detail"

export function CompanyDetailView({ detail }: { detail: CompanyDetail }) {
  const p = detail.profile
  const activeOfficers = detail.officers.filter((o) => !o.resignedOn)
  const resignedOfficers = detail.officers.filter((o) => o.resignedOn)

  return (
    <div className="flex flex-col gap-6">
      <section className="surface anim-rise p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={p.status} />
            <span className="chip">{p.number}</span>
            <span className="chip">{prettyType(p.type)}</span>
            {p.hasInsolvencyHistory ? (
              <span className="chip" style={{ background: "#fef3f2", color: "#b42318", borderColor: "rgba(180,35,24,0.18)" }}>
                Insolvency history
              </span>
            ) : null}
            {p.hasCharges ? (
              <span className="chip" style={{ background: "#fffaeb", color: "#b54708", borderColor: "rgba(181,71,8,0.18)" }}>
                Has charges
              </span>
            ) : null}
          </div>
          <h1
            className="font-semibold leading-[1.05] tracking-[-0.6px]"
            style={{ fontSize: "clamp(26px, 5.5vw, 38px)" }}
          >
            {p.name}
          </h1>
          <p className="text-[13px] text-[var(--muted)] sm:text-[14px]">{p.addressLine}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--line)] pt-5 sm:grid-cols-4">
          <Fact label="Incorporated" value={p.incorporatedOn || "—"} />
          <Fact label="Jurisdiction" value={prettyJurisdiction(p.jurisdiction)} />
          <Fact
            label="Accounts due"
            value={p.accountsNextDue || "—"}
            warn={isOverdue(p.accountsNextDue)}
          />
          <Fact
            label="Confirmation due"
            value={p.confirmationStatementNextDue || "—"}
            warn={isOverdue(p.confirmationStatementNextDue)}
          />
        </div>

        {p.sicDescriptions.length > 0 ? (
          <div className="mt-5 flex flex-col gap-2 border-t border-[var(--line)] pt-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--muted)]">
              Business activity
            </div>
            <div className="flex flex-col gap-1.5">
              {p.sicDescriptions.map((desc, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span className="font-mono text-[11px] text-[var(--muted)]">{p.sicCodes[i]}</span>
                  <Link
                    href={`/sector/${p.sicCodes[i]}`}
                    className="text-[13px] hover:text-[var(--accent)] hover:underline"
                  >
                    {desc}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <OfficersCard active={activeOfficers} resigned={resignedOfficers} />
        <FilingsCard items={detail.filings} />
        <PSCCard items={detail.psc} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <NeighborsCard items={detail.neighbors} title="Address neighbors" subtitle="Other companies at this postcode area" />
        <NeighborsCard items={detail.similar} title="Similar companies" subtitle="Same SIC and city" />
      </div>
    </div>
  )
}

function Fact({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--muted)]">{label}</div>
      <div
        className="mt-1 text-[14px] font-medium tabular-nums"
        style={{ color: warn ? "#b42318" : undefined }}
      >
        {value}
      </div>
    </div>
  )
}

function OfficersCard({
  active,
  resigned,
}: {
  active: OfficerLite[]
  resigned: OfficerLite[]
}) {
  return (
    <div className="surface anim-rise p-5" style={{ animationDelay: "60ms" }}>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-[14px] font-semibold">Officers</div>
          <div className="text-[11px] text-[var(--muted)]">
            {active.length} active · {resigned.length} resigned
          </div>
        </div>
      </div>
      {active.length === 0 && resigned.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">No officers on file.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {active.slice(0, 8).map((o, i) => (
            <OfficerRow key={`a-${i}`} officer={o} />
          ))}
          {resigned.length > 0 ? (
            <div className="mt-2 border-t border-[var(--line)] pt-2 text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--muted)]">
              Past
            </div>
          ) : null}
          {resigned.slice(0, 4).map((o, i) => (
            <OfficerRow key={`r-${i}`} officer={o} muted />
          ))}
        </div>
      )}
    </div>
  )
}

function OfficerRow({ officer, muted }: { officer: OfficerLite; muted?: boolean }) {
  const body = (
    <div className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-[var(--accent-soft)]">
      <div className="min-w-0 flex-1">
        <div className={"truncate text-[13px] font-medium " + (muted ? "text-[var(--muted)]" : "")}>
          {officer.name}
        </div>
        <div className="text-[11px] text-[var(--muted)]">
          {prettyRole(officer.role)}
          {officer.appointedOn ? ` · since ${officer.appointedOn}` : ""}
          {officer.resignedOn ? ` · resigned ${officer.resignedOn}` : ""}
        </div>
      </div>
      {officer.id ? (
        <span className="text-[11px] font-medium text-[var(--accent)]">View →</span>
      ) : null}
    </div>
  )
  return officer.id ? <Link href={`/o/${officer.id}`}>{body}</Link> : body
}

function FilingsCard({ items }: { items: FilingItem[] }) {
  return (
    <div className="surface anim-rise p-5" style={{ animationDelay: "120ms" }}>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-[14px] font-semibold">Filing history</div>
          <div className="text-[11px] text-[var(--muted)]">Most recent {items.length}</div>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">No filings yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((f, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2 last:border-none">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium">{f.description}</div>
                <div className="text-[10px] uppercase tracking-[0.3px] text-[var(--muted)]">
                  {f.category}
                </div>
              </div>
              <div className="tabular-nums text-[11px] text-[var(--muted)]">{f.date}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PSCCard({ items }: { items: PSC[] }) {
  const active = items.filter((p) => !p.ceasedOn)
  const ceased = items.filter((p) => p.ceasedOn)
  return (
    <div className="surface anim-rise p-5" style={{ animationDelay: "180ms" }}>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-[14px] font-semibold">Ownership (PSC)</div>
          <div className="text-[11px] text-[var(--muted)]">
            {active.length} active · {ceased.length} ceased
          </div>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">No persons with significant control declared.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {active.map((p, i) => (
            <PSCRow key={`a-${i}`} p={p} />
          ))}
          {ceased.slice(0, 2).map((p, i) => (
            <PSCRow key={`c-${i}`} p={p} muted />
          ))}
        </ul>
      )}
    </div>
  )
}

function PSCRow({ p, muted }: { p: PSC; muted?: boolean }) {
  return (
    <li className={"flex flex-col gap-1 " + (muted ? "opacity-70" : "")}>
      <div className="text-[13px] font-medium">{p.name}</div>
      <div className="flex flex-wrap gap-1.5">
        {p.natureOfControl.slice(0, 3).map((c) => (
          <span key={c} className="chip" style={{ fontSize: 10 }}>
            {prettyNature(c)}
          </span>
        ))}
      </div>
      {p.ceasedOn ? (
        <div className="text-[10px] text-[var(--muted)]">Ceased {p.ceasedOn}</div>
      ) : null}
    </li>
  )
}

function NeighborsCard({
  items,
  title,
  subtitle,
}: {
  items: AddressNeighbor[]
  title: string
  subtitle: string
}) {
  return (
    <div className="surface anim-rise p-5" style={{ animationDelay: "240ms" }}>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-[14px] font-semibold">{title}</div>
          <div className="text-[11px] text-[var(--muted)]">{subtitle}</div>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">Nothing nearby to show.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <li key={n.number} className="border-b border-[var(--line)] pb-2 last:border-none">
              <Link
                href={`/c/${n.number}`}
                className="flex items-baseline justify-between gap-3 rounded-md px-1 py-1 hover:text-[var(--accent)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{n.name}</div>
                  <div className="text-[11px] text-[var(--muted)]">
                    <span className="font-mono">{n.number}</span>
                    {n.incorporatedOn ? ` · ${n.incorporatedOn}` : ""}
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-[0.3px] text-[var(--muted)]">
                  {n.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const ok = status.toLowerCase() === "active"
  return (
    <span
      className="chip"
      style={{
        background: ok ? "#ecfdf3" : "#fef3f2",
        color: ok ? "#067647" : "#b42318",
        borderColor: ok ? "rgba(6, 118, 71, 0.18)" : "rgba(180, 35, 24, 0.18)",
      }}
    >
      <span className="chip-dot" style={{ background: ok ? "#12b76a" : "#f04438" }} />
      {status}
    </span>
  )
}

function prettyType(type: string): string {
  const m: Record<string, string> = {
    ltd: "Limited company",
    llp: "LLP",
    plc: "Public limited",
    "private-limited-guarant-nsc": "Guarantee",
    "private-unlimited": "Unlimited",
  }
  return m[type] ?? type.replace(/-/g, " ")
}

function prettyRole(role: string): string {
  return role.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}

function prettyNature(s: string): string {
  return s.replace(/-/g, " ")
}

function prettyJurisdiction(s: string): string {
  if (!s) return "—"
  const m: Record<string, string> = {
    "england-wales": "England & Wales",
    scotland: "Scotland",
    "northern-ireland": "Northern Ireland",
    "european-union": "European Union",
  }
  return m[s] ?? s.replace(/-/g, " ")
}

function isOverdue(due?: string): boolean {
  if (!due) return false
  const now = new Date()
  const dueDate = new Date(due)
  return dueDate < now
}
