/**
 * Full-page shimmer skeleton that mirrors the SiteShell layout exactly.
 * Used by AuthGuard and AdminGuard while Firebase resolves.
 *
 * IMPORTANT: Every skeleton dimension here must stay in sync with the
 * inline loading states inside site-shell.tsx so the loading UI looks
 * identical regardless of which code path triggers it.
 */

import { BrandLogo } from './brand-logo';

function Sk({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`animate-shimmer rounded-2xl ${className}`} style={style} />
  );
}

/* ── Header ──────────────────────────────────────────────────────
   Matches site-shell.tsx <header> exactly:
   - Real BrandLogo (SiteShell always shows the real logo even while loading)
   - Same 4 nav pill widths
   - Same 3-item right side: wide pill (desktop) + small pill (mobile) + avatar circle
   ────────────────────────────────────────────────────────────── */
function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">

        {/* Logo — real logo, matches SiteShell which never skeletonises this */}
        <div className="flex items-center gap-2">
          <Sk className="h-10 w-10 rounded-full lg:hidden" />
          <BrandLogo />
        </div>

        {/* Nav pills (desktop) — 4 pills, same widths as SiteShell */}
        <div className="hidden items-center gap-1 lg:flex">
          {[92, 128, 72, 88].map((w, i) => (
            <Sk key={i} className="h-9 rounded-xl" style={{ width: w }} />
          ))}
        </div>

        {/* Right side — matches SiteShell loading state exactly:
            desktop credits pill (hidden on mobile) + mobile credits pill (hidden on desktop) + avatar */}
        <div className="flex items-center gap-2.5">
          <Sk className="hidden h-8 w-28 rounded-full sm:block" />
          <Sk className="h-7 w-16 rounded-full sm:hidden" />
          <Sk className="h-10 w-10 rounded-full" />
        </div>

      </div>
    </header>
  );
}

/* ── Desktop sidebar ─────────────────────────────────────────────
   Matches site-shell.tsx aside exactly:
   - overflow-y-auto (not overflow-hidden)
   - inner div has p-3
   - nav rows: p-1 wrapper, 4 rows, same widths, no rounded on row
   - user card: no m-2 margin, text-center, gap-2.5, h-14 avatar, h-8 credits
   ────────────────────────────────────────────────────────────── */
function SidebarSkeleton() {
  return (
    <aside className="sticky top-20 hidden h-[calc(100dvh-6rem)] w-60 shrink-0 overflow-y-auto lg:block">
      <div className="flex h-full flex-col rounded-3xl border border-border bg-card/60 p-3">

        {/* Nav rows — matches SiteShell: p-1 wrapper, 4 rows, same widths */}
        <div className="flex flex-col gap-1.5 p-1">
          {[90, 128, 72, 104].map((w, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Sk className="h-5 w-5 shrink-0 rounded-lg" />
              <Sk className="h-3.5 rounded-full" style={{ width: w }} />
            </div>
          ))}
        </div>

        {/* Quick links skeleton — matches SidebarQuickLinks "More" section */}
        <div className="mt-2">
          <div className="mb-1.5 flex items-center gap-2 px-1">
            <div className="h-px flex-1 bg-border/60" />
            <Sk className="h-2 w-6 rounded-full" />
            <div className="h-px flex-1 bg-border/60" />
          </div>
          <div className="flex flex-col gap-0.5">
            {[48, 56, 44].map((w, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                <Sk className="h-5 w-5 shrink-0 rounded-lg" />
                <Sk className="h-3 rounded-full" style={{ width: w }} />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom user card — matches SiteShell: no extra margin, text-center,
            gap-2.5, h-14 avatar, h-8 credits number */}
        <div className="mt-auto rounded-2xl bg-gradient-soft p-4 text-center">
          <div className="flex flex-col items-center gap-2.5">
            <Sk className="h-14 w-14 rounded-full" />
            <Sk className="h-3.5 w-24 rounded-full" />
            <Sk className="h-3 w-16 rounded-full" />
            <Sk className="h-8 w-12 rounded-xl" />
            <Sk className="h-3 w-20 rounded-full" />
          </div>
        </div>

      </div>
    </aside>
  );
}

/* ── Content area ─────────────────────────────────────────────── */
function ContentSkeleton() {
  return (
    <div className="min-w-0 flex-1 space-y-5">
      {/* Hero panel */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="space-y-3">
            <Sk className="h-5 w-24 rounded-full" />
            <Sk className="h-8 w-64 rounded-xl" />
            <Sk className="h-3.5 w-48 rounded-full" />
          </div>
          <Sk className="h-11 w-36 rounded-2xl" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5">
            <Sk className="h-12 w-12 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Sk className="h-3 w-20 rounded-full" />
              <Sk className="h-7 w-10 rounded-lg" />
            </div>
            <Sk className="h-9 w-24 shrink-0 rounded-2xl" />
          </div>
        ))}
      </div>

      {/* Section heading */}
      <div className="flex items-center justify-between pt-3">
        <Sk className="h-6 w-44 rounded-full" />
        <Sk className="h-3.5 w-24 rounded-full" />
      </div>

      {/* History list */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-border' : ''}`}
          >
            <Sk className="h-8 w-8 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Sk className="h-3 rounded-full" style={{ width: `${120 + i * 30}px` }} />
              <Sk className="h-3 w-20 rounded-full" />
            </div>
            <Sk className="h-3 w-10 shrink-0 rounded-full" />
            <Sk className="h-7 w-7 shrink-0 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Exported full-page skeleton ──────────────────────────────── */
export function PageSkeleton() {
  return (
    <div className="relative min-h-dvh">
      <HeaderSkeleton />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <SidebarSkeleton />
        <ContentSkeleton />
      </div>
    </div>
  );
}
