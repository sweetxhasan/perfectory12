import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'wouter';
import { SiteShell } from '@/components/site-shell';
import { AuthGuard } from '@/components/auth-guard';
import { SEOHead } from '@/components/seo-head';
import { PAGE_SEO } from '@/lib/seo-config';
import { Panel, SectionBadge, GradientButton } from '@/components/primitives';
import { Icon } from '@/components/icon';
import { useAuth } from '@/lib/auth-context';
import { subscribeGenerations, type Generation } from '@/lib/user-store';
import { VoiceHistoryList } from '@/components/voice-history-list';
import { OnboardingOverlay } from '@/components/onboarding-overlay';

/* ── Shimmer helper ─────────────────────────────────────── */
function Sk({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <div className={`animate-shimmer rounded-2xl ${className}`} style={style} />;
}

/* ── Dashboard skeleton matching the real layout ─────── */
function DashboardSkeleton() {
  return (
    <div className="space-y-5">
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

      {/* 3 stat cards */}
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

      {/* Recent generations list */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-border' : ''}`}
          >
            <Sk className="h-8 w-8 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Sk className="h-3 rounded-full" style={{ width: `${110 + i * 28}px` }} />
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

const planLabels: Record<string, string> = { free: 'Free', monthly: 'Monthly Pro', yearly: 'Yearly Pro' };

export default function DashboardPage() {
  return (
    <AuthGuard>
      <SiteShell><SEOHead {...PAGE_SEO.dashboard} /><DashboardWithOverlay /></SiteShell>
    </AuthGuard>
  );
}

function DashboardWithOverlay() {
  const { profile } = useAuth();
  const showOnboarding = profile && !profile.onboardingDone;
  return (
    <>
      <DashboardContent />
      {showOnboarding && <OnboardingOverlay />}
    </>
  );
}

function DashboardContent() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    // Real-time listener — no composite index required, updates instantly
    const unsub = subscribeGenerations(profile.uid, 20, (gens) => {
      setHistory(gens);
      setLoading(false);
    });
    return unsub;
  }, [profile?.uid]);

  if (!profile || loading) return <DashboardSkeleton />;

  const isYearly = profile.plan === 'yearly';

  return (
    <div>
      <Panel className="relative overflow-hidden p-6 sm:p-8">
        <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>

            <h1 className="mt-3 text-balance text-3xl">
              Welcome back, <span className="text-gradient">{profile.name}</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Ready to create something great today?</p>
          </div>
          <Link
            href="/generator"
            className="group inline-flex items-center gap-2 rounded-2xl border border-brand/50 bg-[linear-gradient(-45deg,#ec5252,#6e1a52)] px-5 py-3 text-sm font-medium text-primary-foreground transition hover:brightness-110 active:scale-[0.98]"
          >
            <Icon name="plus" size={18} className="transition group-hover:scale-110" />
            <span>Create Voice</span>
          </Link>
        </div>
      </Panel>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {/* Credits card */}
        <Panel className="flex items-center gap-4 p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-soft text-brand">
            <Icon name="bolt" size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Credits left</p>
            <p className="text-2xl">{profile.credits}</p>
          </div>
          <Link href="/credits"
            className="group flex shrink-0 items-center gap-1.5 rounded-2xl border border-brand/30 bg-gradient-soft px-3 py-2 text-xs font-medium text-brand transition hover:border-brand hover:bg-brand/10 hover:shadow-[0_0_12px_rgba(99,102,241,0.25)] active:scale-95">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-primary-foreground transition group-hover:scale-110">
              <Icon name="chart" size={12} />
            </span>
            See Usage
          </Link>
        </Panel>

        {/* Plan card */}
        <Panel className="flex items-center gap-4 p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-soft text-brand">
            <Icon name="crown" size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="text-2xl">{planLabels[profile.plan] || 'Free'}</p>
          </div>
          {isYearly ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-brand-2/20 bg-gradient-soft px-3 py-2 text-xs font-medium text-brand-2/50 opacity-60 cursor-default select-none">
              <Icon name="crown" size={13} />
              Plan Max
            </span>
          ) : (
            <Link href="/plans"
              className="group flex shrink-0 items-center gap-1.5 rounded-2xl bg-gradient-brand px-3 py-2 text-xs font-medium text-primary-foreground shadow-[0_2px_10px_rgba(99,102,241,0.35)] transition hover:opacity-90 hover:shadow-[0_4px_16px_rgba(99,102,241,0.45)] active:scale-95">
              <Icon name="crown" size={13} />
              Update Plan
            </Link>
          )}
        </Panel>

        {/* Generations card */}
        <Panel className="flex items-center gap-4 p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-soft text-brand">
            <Icon name="soundwave" size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Generations</p>
            <p className="text-2xl">{history.length}</p>
          </div>
          <Link href="/generator"
            className="group flex shrink-0 items-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-brand-2 hover:text-brand-2 hover:shadow-[0_0_12px_rgba(56,189,248,0.2)] active:scale-95">
            <Icon name="plus" size={13} className="transition group-hover:text-brand-2" />
            Generate
          </Link>
        </Panel>
      </div>

      {profile.credits <= 3 && (
        <Panel gradientBorder className="mt-5 flex flex-col items-center justify-between gap-4 p-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <Icon name="crown" size={26} className="text-brand-2" />
            <div>
              <p className="text-sm">Running low on credits</p>
              <p className="text-xs text-muted-foreground">Upgrade your plan to keep generating.</p>
            </div>
          </div>
          <Link href="/plans"><GradientButton icon="crown">Upgrade plan</GradientButton></Link>
        </Panel>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-xl">Recent generations</h2>
        <Link href="/generator" className="text-sm text-brand-2 hover:underline">Create new →</Link>
      </div>

      <Panel className="mt-4 overflow-hidden">
        <VoiceHistoryList generations={history} isOwner />
      </Panel>
    </div>
  );
}
