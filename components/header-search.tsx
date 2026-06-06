"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Hit {
  kind: "company" | "officer"
  id: string
  title: string
  subtitle?: string
  href: string
}

export function HeaderSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<Hit[]>([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close on outside click / Esc
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  // Cmd/Ctrl-K to focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 30)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setHits([])
      setLoading(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller
        setLoading(true)
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        const json = await res.json()
        setHits(Array.isArray(json.hits) ? json.hits : [])
        setFocused(-1)
      } catch (e) {
        if ((e as Error).name !== "AbortError") setHits([])
      } finally {
        setLoading(false)
      }
    }, 220)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setFocused((f) => Math.min(hits.length - 1, f + 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setFocused((f) => Math.max(-1, f - 1))
      } else if (e.key === "Enter") {
        e.preventDefault()
        const hit = hits[focused] ?? hits[0]
        if (hit) {
          router.push(hit.href)
          setOpen(false)
          setQuery("")
        }
      }
    },
    [focused, hits, router]
  )

  return (
    <div ref={containerRef} className={"relative " + (compact ? "" : "flex-1 sm:max-w-[320px]")}>
      {!open ? (
        <button
          onClick={() => {
            setOpen(true)
            setTimeout(() => inputRef.current?.focus(), 30)
          }}
          className={
            "btn inline-flex items-center gap-2 " +
            (compact ? "" : "w-full justify-between")
          }
          aria-label="Search"
        >
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <SearchIcon />
            {!compact ? (
              <span className="truncate text-[var(--muted)]">
                <span className="hidden sm:inline">Search companies or directors</span>
                <span className="sm:hidden">Search…</span>
              </span>
            ) : null}
          </span>
          {!compact ? <KbdHint /> : null}
        </button>
      ) : (
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Name or company number…"
            className="filter-input pl-9 sm:text-[13px]"
            style={{ height: 36 }}
            aria-label="Search"
            aria-expanded={open}
            aria-controls="search-results"
          />
          {open ? (
            <div
              id="search-results"
              role="listbox"
              className="absolute left-0 right-0 top-[40px] z-50 max-h-[60vh] overflow-y-auto rounded-xl border border-[var(--line)] bg-white shadow-[0_12px_40px_rgba(11,12,14,0.14)]"
            >
              {!query.trim() ? (
                <EmptyHint />
              ) : loading && hits.length === 0 ? (
                <div className="px-4 py-3 text-[12px] text-[var(--muted)]">Searching…</div>
              ) : hits.length === 0 ? (
                <div className="px-4 py-3 text-[12px] text-[var(--muted)]">No matches.</div>
              ) : (
                <ul className="py-1">
                  {hits.map((h, i) => (
                    <li key={`${h.kind}-${h.id}-${i}`}>
                      <Link
                        href={h.href}
                        role="option"
                        aria-selected={focused === i}
                        onClick={() => {
                          setOpen(false)
                          setQuery("")
                        }}
                        onMouseEnter={() => setFocused(i)}
                        className={
                          "flex items-center justify-between gap-3 px-3 py-2 text-left " +
                          (focused === i ? "bg-[var(--accent-soft)]" : "hover:bg-[#fafafb]")
                        }
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <KindBadge kind={h.kind} />
                            <span className="truncate text-[13px] font-medium">{h.title}</span>
                          </div>
                          {h.subtitle ? (
                            <div className="truncate pl-7 text-[11px] text-[var(--muted)]">
                              {h.subtitle}
                            </div>
                          ) : null}
                        </div>
                        <span className="text-[10px] text-[var(--muted)]">↵</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-[var(--line)] px-3 py-2 text-[10px] text-[var(--muted)]">
                <kbd className="kbd">↑↓</kbd> navigate · <kbd className="kbd">↵</kbd> open ·
                <kbd className="kbd">esc</kbd> close
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function KindBadge({ kind }: { kind: "company" | "officer" }) {
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[var(--line)] text-[10px] font-semibold"
      style={{
        background: kind === "officer" ? "var(--accent-soft)" : "#f4f4f5",
        color: kind === "officer" ? "#2c3aa8" : "#3f3f46",
      }}
      aria-label={kind}
    >
      {kind === "officer" ? "D" : "C"}
    </span>
  )
}

function EmptyHint() {
  return (
    <div className="px-4 py-3 text-[12px] text-[var(--muted)]">
      Try a company name, a number like <span className="font-mono">12345678</span>, or a director name.
    </div>
  )
}

function KbdHint() {
  return (
    <span className="hidden items-center gap-0.5 text-[10px] text-[var(--muted)] sm:inline-flex">
      <kbd className="kbd">⌘</kbd>
      <kbd className="kbd">K</kbd>
    </span>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
