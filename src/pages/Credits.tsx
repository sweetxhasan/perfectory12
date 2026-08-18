/**
 * Credits Page — 3 containers:
 *  1. Credit balance
 *  2. Daily refill
 *  3. Usage history (persistent — never deletes even after audio expires)
 */
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { SiteShell } from '@/components/site-shell';
import { AuthGuard } from '@/components/auth-guard';
import { SEOHead } from '@/components/seo-head';
import { Icon } from '@/components/icon';
import { useAuth } from '@/lib/auth-context';
import {
  subscribeUsageHistory,
  PLAN_DAILY_CREDITS,
  type Generation,
  type PlanId,
} from '@/lib/user-store';
import type { Timestamp } from 'firebase/firestore';

/* ─── helpers ────────────────────────────────────────────── */

const PLAN_LABEL: Record<PlanId, string> = {
  free: 'Free',
  monthly: 'Monthly Pro',
  yearly: 'Yearly Pro',
};

const LANG_FLAG: Record<string, string> = {
  English: '🇬🇧',
  Bangla: '🇧🇩',
  Hindi: '🇮🇳',
};

function tsMs(ts: unknown): number {
  try { return (ts as Timestamp).toMillis(); } catch { return 0; }
}

function formatRelative(ts: unknown): string {
  const ms = tsMs(ts);
  if (!ms) return '—';
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function formatFull(ts: unknown): string {
  const ms = tsMs(ts);
  if (!ms) return '';
  return new Date(ms).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/* ─── shimmer skeleton ───────────────────────────────────── */
function Bone({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-secondary/70 ${className}`} />;
}

/* ─── circular ring ──────────────────────────────────────── */
function CreditRing({
  credits,
  daily,
  plan,
}: {
  credits: number;
  daily: number;
  plan: PlanId;
}) {
  const max = Math.max(daily, credits, 1);
  const pct = Math.min(credits / max, 1);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const filled = circ * pct;

  const [animated, setAnimated] = useState(false);
  useEffect(() => { setTimeout(() => setAnimated(true), 80); }, []);

  const stroke =
    credits === 0 ? '#ec5252'
    : credits <= 2 ? '#c93a3a'
    : '#ec5252';

  return (
    <div className="relative flex h-[148px] w-[148px] items-center justify-center">
      {/* glow */}
      <div
        className="absolute inset-0 rounded-full blur-2xl transition-all duration-700"
        style={{ background: `radial-gradient(circle, ${stroke}33 0%, transparent 70%)` }}
      />
      <svg
        className="absolute inset-0 -rotate-90"
        viewBox="0 0 124 124"
        width={148}
        height={148}
      >
        {/* track */}
        <circle cx="62" cy="62" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="9" />
        {/* fill */}
        <circle
          cx="62" cy="62" r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${animated ? filled : 0} ${circ}`}
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1), stroke .4s ease' }}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center leading-none">
        <span className="text-5xl font-black tabular-nums" style={{ color: stroke }}>
          {credits}
        </span>
        <span className="mt-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          credits
        </span>
      </div>
    </div>
  );
}

/* ─── usage row ──────────────────────────────────────────── */
function UsageRow({ g, index }: { g: Generation; index: number }) {
  const flag = LANG_FLAG[g.language] ?? '🌐';
  const cost = g.cost ?? 1;

  return (
    <li className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/40 sm:px-6 sm:gap-4">
      {/* number */}
      <span className="hidden w-6 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground/50 sm:block">
        {index + 1}
      </span>

      {/* icon bubble */}
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary/60 text-muted-foreground transition group-hover:border-brand/30 group-hover:text-brand">
        <Icon name="soundwave" size={16} />
      </span>

      {/* text + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{g.text}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          <span>{flag} {g.language}</span>
          <span className="opacity-30">·</span>
          <span className="truncate max-w-[100px]">{g.voice}</span>
          <span className="opacity-30">·</span>
          <span title={formatFull(g.createdAt)}>{formatRelative(g.createdAt)}</span>
        </div>
      </div>

      {/* cost pill */}
      <span
        className="flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums"
        style={{
          borderColor: 'rgba(129,140,248,.25)',
          background: 'rgba(129,140,248,.08)',
          color: '#818cf8',
        }}
      >
        <Icon name="bolt" size={11} />
        {cost}
      </span>
    </li>
  );
}

/* ─── main page ──────────────────────────────────────────── */
export default function CreditsPage() {
  return (
    <AuthGuard>
      <SiteShell>
        <SEOHead
          title="Credits — Perfectory Voice"
          description="View your credit balance, daily refill and full usage history."
          noIndex
        />
        <CreditsContent />
      </SiteShell>
    </AuthGuard>
  );
}

function CreditsContent() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<Generation[]>([]);
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeUsageHistory(profile.uid, 100, (gens) => {
      setHistory(gens);
      setHistLoading(false);
    });
    return unsub;
  }, [profile?.uid]);

  if (!profile) {
    return (
      <div className="space-y-4">
        <Bone className="h-56 w-full" />
        <Bone className="h-32 w-full" />
        <Bone className="h-80 w-full" />
      </div>
    );
  }

  const plan = profile.plan as PlanId;
  const daily = PLAN_DAILY_CREDITS[plan] ?? 2;
  const totalCreditsUsed = history.reduce((s, g) => s + (g.cost ?? 1), 0);
  const isYearly = plan === 'yearly';

  /* next midnight in local time */
  const nextMidnight = new Date();
  nextMidnight.setHours(24, 0, 0, 0);
  const hoursLeft = Math.round((nextMidnight.getTime() - Date.now()) / 3_600_000);

  return (
    <div className="space-y-4 pb-12">

      {/* ══ 1. CREDIT BALANCE ══════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-card" style={{ background: 'linear-gradient(hsl(var(--card)), hsl(var(--card))) padding-box, linear-gradient(-45deg, #ec5252, #6e1a52) border-box', border: '1px solid transparent' }}>
        {/* subtle mesh gradient bg */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, #ec5252 0%, transparent 55%), radial-gradient(circle at 80% 20%, #6e1a52 0%, transparent 50%)',
          }}
        />

        <div className="relative flex flex-col items-center gap-6 px-6 py-8 sm:flex-row sm:gap-10 sm:px-10 sm:py-10">
          {/* ring */}
          <div className="shrink-0">
            <CreditRing credits={profile.credits} daily={daily} plan={plan} />
          </div>

          {/* right side */}
          <div className="flex-1 text-center sm:text-left">
            {/* heading */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-bold sm:text-3xl" style={{ background: 'linear-gradient(-45deg, #ec5252, #6e1a52)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Credit Balance</h1>
              <span className="rounded-full px-3 py-0.5 text-xs font-semibold text-white" style={{ background: 'linear-gradient(-45deg, #ec5252, #6e1a52)' }}>
                {PLAN_LABEL[plan]}
              </span>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-sm mx-auto sm:mx-0">
              {profile.credits === 0
                ? 'No credits left. Upgrade your plan to get more daily credits.'
                : profile.credits <= 2
                ? `Only ${profile.credits} credit${profile.credits > 1 ? 's' : ''} remaining. Refills in ~${hoursLeft}h.`
                : `You have ${profile.credits} credit${profile.credits > 1 ? 's' : ''} available. Refills in ~${hoursLeft}h.`}
            </p>

            {/* progress bar: credits vs daily max */}
            <div className="mt-4 max-w-sm mx-auto sm:mx-0">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{profile.credits} remaining</span>
                <span>{daily} daily max</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min((profile.credits / daily) * 100, 100)}%`,
                    background: profile.credits === 0
                      ? '#ef4444'
                      : profile.credits <= 2
                      ? 'linear-gradient(90deg, #f97316, #ef4444)'
                      : isYearly
                      ? 'linear-gradient(90deg, #38bdf8, #818cf8)'
                      : 'linear-gradient(90deg, #818cf8, #6366f1)',
                  }}
                />
              </div>
            </div>

            {/* upgrade nudge */}
            {!isYearly && (
              <Link href="/plans" className="mt-5 inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-medium text-white transition hover:opacity-90 active:scale-95" style={{ background: 'linear-gradient(-45deg, #ec5252, #6e1a52)' }}>
                <Icon name="crown" size={13} />
                Upgrade for {plan === 'free' ? `${PLAN_DAILY_CREDITS.monthly}×` : `${PLAN_DAILY_CREDITS.yearly}×`} more credits daily
                <Icon name="arrow-right" size={12} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ══ 2. DAILY REFILL ════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-card" style={{ background: 'linear-gradient(hsl(var(--card)), hsl(var(--card))) padding-box, linear-gradient(-45deg, #ec5252, #6e1a52) border-box', border: '1px solid transparent' }}>
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 90% 50%, #ec5252 0%, transparent 60%)' }}
        />

        <div className="relative flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center sm:gap-8 sm:px-10">
          {/* icon + label */}
          <div className="flex items-center gap-4 sm:shrink-0">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/60" style={{ background: 'linear-gradient(hsl(var(--secondary) / 0.6), hsl(var(--secondary) / 0.6)) padding-box, linear-gradient(-45deg, #ec5252, #6e1a52) border-box', border: '1px solid transparent' }}>
              <Icon name="refresh" size={24} style={{ color: '#ec5252' }} />
            </span>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Daily Refill</p>
              <p className="mt-0.5 text-3xl font-black tabular-nums" style={{ background: 'linear-gradient(-45deg, #ec5252, #6e1a52)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{daily}</p>
              <p className="text-xs text-muted-foreground">credits per day</p>
            </div>
          </div>

          {/* divider */}
          <div className="hidden h-14 w-px sm:block" style={{ background: 'linear-gradient(-45deg, #ec5252, #6e1a52)' }} />

          {/* meta grid */}
          <div className="flex flex-1 flex-wrap gap-3">
            <div className="rounded-2xl bg-secondary/50 px-4 py-3 text-center w-fit">
              <p className="text-xs text-muted-foreground">Resets at</p>
              <p className="mt-0.5 text-sm font-semibold">Midnight</p>
              <p className="text-xs text-muted-foreground">BST daily</p>
            </div>
            <div className="rounded-2xl bg-secondary/50 px-4 py-3 text-center w-fit">
              <p className="text-xs text-muted-foreground">Refills in</p>
              <p className="mt-0.5 text-sm font-semibold">~{hoursLeft}h</p>
              <p className="text-xs text-muted-foreground">until midnight</p>
            </div>
            <div className="rounded-2xl bg-secondary/50 px-4 py-3 text-center w-fit">
              <p className="text-xs text-muted-foreground">Unused credits</p>
              <p className="mt-0.5 text-sm font-semibold">Don't carry over</p>
              <p className="text-xs text-muted-foreground">each day resets to {daily}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ 3. USAGE HISTORY ═══════════════════════════════ */}
      <div className="overflow-hidden rounded-3xl bg-card" style={{ background: 'linear-gradient(hsl(var(--card)), hsl(var(--card))) padding-box, linear-gradient(-45deg, #ec5252, #6e1a52) border-box', border: '1px solid transparent' }}>

        {/* header bar */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold">Usage History</h2>
            <p className="text-xs text-muted-foreground">
              All generations · credit records are permanent
            </p>
          </div>
          {history.length > 0 && (
            <div className="flex items-center gap-3">
              {/* total credits used badge */}
              <span className="hidden items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground sm:flex">
                <Icon name="bolt" size={12} className="text-brand-2" />
                <span className="font-semibold tabular-nums text-foreground">{totalCreditsUsed}</span>
                total used
              </span>
              {/* count badge */}
              <span className="rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground">
                {history.length} generation{history.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* loading state */}
        {histLoading && (
          <div className="space-y-0 divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3">
                <Bone className="h-9 w-9 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Bone className="h-3 rounded-full" style={{ width: `${120 + i * 30}px` }} />
                  <Bone className="h-2.5 w-24 rounded-full" />
                </div>
                <Bone className="h-6 w-12 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* empty */}
        {!histLoading && history.length === 0 && (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl border border-border bg-secondary/50 text-muted-foreground">
              <Icon name="soundwave" size={28} />
            </span>
            <div>
              <p className="font-medium">No generations yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your voice generations will appear here with their credit cost.
              </p>
            </div>
            <Link href="/generator">
              <button
                type="button"
                className="mt-1 flex items-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95"
              >
                <Icon name="microphone" size={16} />
                Generate a voice
              </button>
            </Link>
          </div>
        )}

        {/* list */}
        {!histLoading && history.length > 0 && (
          <>
            <ul className="divide-y divide-border">
              {history.map((g, i) => <UsageRow key={g.id} g={g} index={i} />)}
            </ul>

            {/* footer */}
            <div className="flex items-center justify-between border-t border-border bg-secondary/20 px-6 py-3">
              <span className="text-xs text-muted-foreground">
                {history.length} record{history.length !== 1 ? 's' : ''} · history never expires
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground sm:hidden">
                <Icon name="bolt" size={11} className="text-brand-2" />
                <span className="font-semibold text-foreground">{totalCreditsUsed}</span> used
              </span>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
