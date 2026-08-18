import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { SiteShell } from '@/components/site-shell';
import { AdminGuard } from '@/components/admin-guard';
import { fetchApiRequests, type ApiRequestLog } from '@/lib/user-store';
import type { Timestamp } from 'firebase/firestore';

/* ── Time formatter ─────────────────────────────────── */
function timeAgo(ts: Timestamp | null): string {
  if (!ts) return '';
  const ms = ts.toMillis?.() ?? 0;
  if (!ms) return '';
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(ms).toLocaleDateString('en-BD', { day: '2-digit', month: 'short' });
}

/* ── Skeleton ──────────────────────────────────────── */

/* Exactly mirrors StatCard: same padding, flex-col, center */
function StatCardSkeleton() {
  return (
    <div className="flex-1 min-w-0 rounded-2xl border border-border bg-card px-3 py-4 flex flex-col items-center">
      {/* number block — same height as text-xl/2xl font-bold */}
      <div className="h-8 w-[52px] rounded-md bg-muted/70 mb-2 animate-pulse" />
      {/* label block — same height as text-[11px] */}
      <div className="h-2.5 w-[56px] rounded bg-muted/40 animate-pulse" />
    </div>
  );
}

/* Exactly mirrors a request row: icon · avatar · [name + badge] / subtext · time */
function RequestRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* status icon circle */}
      <div className="h-4 w-4 rounded-full bg-muted/60 shrink-0 animate-pulse" />
      {/* avatar */}
      <div className="h-7 w-7 rounded-full bg-muted/70 shrink-0 animate-pulse" />
      {/* text block */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-1.5">
          {/* name */}
          <div className="h-3 w-24 rounded-full bg-muted/70 animate-pulse" />
          {/* language badge */}
          <div className="h-4 w-8 rounded-full border border-border bg-muted/40 animate-pulse" />
        </div>
        {/* subtext */}
        <div className="h-2.5 w-44 rounded-full bg-muted/40 animate-pulse" />
      </div>
      {/* time */}
      <div className="h-2.5 w-10 rounded-full bg-muted/40 shrink-0 animate-pulse" />
    </div>
  );
}

/* ── Stat Card ──────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: string | number;
  gradient: string;
}

function StatCard({ label, value, gradient }: StatCardProps) {
  return (
    <div className="flex-1 min-w-0 rounded-2xl border border-border bg-card px-3 py-4 flex flex-col items-center text-center">
      <p
        className="text-xl sm:text-2xl font-bold leading-none tracking-tight mb-1.5 bg-clip-text text-transparent"
        style={{ backgroundImage: gradient }}
      >
        {value}
      </p>
      <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground leading-none truncate w-full text-center">
        {label}
      </p>
    </div>
  );
}

/* ── Status Icons ───────────────────────────────────── */
function SuccessIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#22c55e" opacity="0.15" />
      <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="1.8" />
      <path d="M7.5 12.5l3 3 6-6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FailedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#f43f5e" opacity="0.15" />
      <circle cx="12" cy="12" r="10" stroke="#f43f5e" strokeWidth="1.8" />
      <path d="M8 8l8 8M16 8l-8 8" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Avatar fallback ─────────────────────────────────── */
function Avatar({ url, name }: { url: string; name: string }) {
  const [err, setErr] = useState(false);
  const initials = name ? name.charAt(0).toUpperCase() : '?';
  const COLORS = ['#6366f1', '#f43f5e', '#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#14b8a6'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  const bg = COLORS[h % COLORS.length];

  if (!err && url) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setErr(true)}
        className="h-7 w-7 rounded-full object-cover shrink-0 ring-1 ring-border"
      />
    );
  }
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-1 ring-border"
      style={{ background: bg }}
    >
      {initials}
    </span>
  );
}

/* ── Main Component ──────────────────────────────────── */
export default function AdminApiSettings() {
  const [requests, setRequests] = useState<ApiRequestLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const load = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    fetchApiRequests(500)
      .then(setRequests)
      .catch(() => setError('Failed to load API requests.'))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => { load(); }, []);

  /* Stats */
  const total   = requests.length;
  const success = requests.filter((r) => r.success).length;
  const failed  = requests.filter((r) => !r.success).length;
  const rate    = total > 0 ? Math.round((success / total) * 100) : 0;

  return (
    <AdminGuard>
      <SiteShell>
        <div className="mx-auto max-w-3xl space-y-6 px-1">

          {/* ── Header ── */}
          <div className="text-center">
            <h1
              className="text-2xl font-bold bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(-45deg,#6e1a52,#ec5252)' }}
            >
              API Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Real-time API request monitoring and statistics.
            </p>
          </div>

          {/* ── Stats Row ── */}
          <div className="flex gap-2 sm:gap-3">
            {loading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  label="Total"
                  value={total.toLocaleString()}
                  gradient="linear-gradient(135deg, #6366f1, #8b5cf6)"
                />
                <StatCard
                  label="Success"
                  value={success.toLocaleString()}
                  gradient="linear-gradient(135deg, #22c55e, #16a34a)"
                />
                <StatCard
                  label="Failed"
                  value={failed.toLocaleString()}
                  gradient="linear-gradient(135deg, #f43f5e, #e11d48)"
                />
                <StatCard
                  label="Success Rate"
                  value={`${rate}%`}
                  gradient="linear-gradient(135deg, #f59e0b, #f97316)"
                />
              </>
            )}
          </div>

          {/* ── Request List ── */}
          <div className="rounded-3xl border border-border bg-card overflow-hidden">

            {/* Title bar */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2
                className="text-base font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(-45deg,#6e1a52,#ec5252)' }}
              >
                Request List
              </h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {loading ? '…' : total}
                </span>
                <button
                  onClick={() => load(true)}
                  disabled={refreshing || loading}
                  className="flex h-7 w-7 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                  title="Refresh"
                >
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                    className={refreshing ? 'animate-spin' : ''}
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div
              ref={listRef}
              className="overflow-y-auto"
              style={{ maxHeight: '520px' }}
            >
              {/* Loading skeleton */}
              {loading && (
                <div className="flex flex-col divide-y divide-border/40">
                  {[...Array(6)].map((_, i) => <RequestRowSkeleton key={i} />)}
                </div>
              )}

              {/* Error */}
              {!loading && error && (
                <div className="flex items-center gap-2 m-4 rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
                  <FailedIcon />
                  {error}
                </div>
              )}

              {/* Empty */}
              {!loading && !error && requests.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" opacity="0.35">
                    <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M8 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  <p className="text-sm font-medium">No API requests yet</p>
                  <p className="text-xs">Requests will appear here after the first voice generation.</p>
                </div>
              )}

              {/* Rows */}
              {!loading && !error && requests.length > 0 && (
                <div className="flex flex-col divide-y divide-border/40">
                  {requests.map((req) => {
                    /* profile URL: prefer username, fall back to uid */
                    const profilePath = req.username
                      ? `/profile/${req.username}`
                      : `/profile/${req.uid}`;

                    return (
                      <div
                        key={req.id}
                        className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/30"
                      >
                        {/* Status icon */}
                        <div className="shrink-0">
                          {req.success ? <SuccessIcon /> : <FailedIcon />}
                        </div>

                        {/* Avatar */}
                        <Avatar url={req.userPhotoURL || ''} name={req.userName || 'User'} />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={profilePath}
                              className="text-sm font-semibold truncate hover:text-brand-2 transition-colors max-w-[120px] sm:max-w-[200px]"
                            >
                              {req.userName || 'Unknown User'}
                            </Link>
                            <span className="shrink-0 rounded-full border border-border px-1.5 py-px text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                              {req.language}
                            </span>
                            {req.durationMs > 0 && (
                              <span className="hidden sm:inline shrink-0 text-[10px] text-muted-foreground">
                                {req.durationMs < 1000
                                  ? `${req.durationMs}ms`
                                  : `${(req.durationMs / 1000).toFixed(1)}s`}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-[180px] sm:max-w-xs">
                            {req.error
                              ? <span className="text-rose-500">{req.error}</span>
                              : (req.text || '—')}
                          </p>
                        </div>

                        {/* Time */}
                        <span className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap">
                          {timeAgo(req.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Scroll hint when list is long */}
            {!loading && requests.length > 8 && (
              <div className="border-t border-border/40 px-5 py-2 text-center text-[11px] text-muted-foreground">
                Showing {requests.length} requests · scroll to see more
              </div>
            )}
          </div>

        </div>
      </SiteShell>
    </AdminGuard>
  );
}
