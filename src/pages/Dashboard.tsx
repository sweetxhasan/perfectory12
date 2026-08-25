import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'wouter';
import { SiteShell } from '@/components/site-shell';
import { AuthGuard } from '@/components/auth-guard';
import { SEOHead } from '@/components/seo-head';
import { PAGE_SEO } from '@/lib/seo-config';
import { CutButton, CutFrame, CutIconBox, CutPanel } from '@/components/cut-ui';
import { Icon } from '@/components/icon';
import { useAuth } from '@/lib/auth-context';
import { subscribeGenerations, type Generation } from '@/lib/user-store';
import { VoiceHistoryList } from '@/components/voice-history-list';
import { OnboardingOverlay } from '@/components/onboarding-overlay';

/* ── Shimmer helper ─────────────────────────────────────── */
function Sk({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <span className={`relative isolate inline-flex overflow-hidden ${className}`}>
      <CutFrame />
      <span className="relative z-10 block h-full w-full animate-shimmer" style={style} />
    </span>
  );
}

/* ── Dashboard skeleton matching the real layout ─────── */
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {/* Hero panel */}
      <CutPanel tone="card" contentClassName="p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="space-y-3">
            <Sk className="h-5 w-24 rounded-full" />
            <Sk className="h-8 w-64 rounded-xl" />
            <Sk className="h-3.5 w-48 rounded-full" />
          </div>
          <Sk className="h-11 w-36 rounded-2xl" />
        </div>
      </CutPanel>

      {/* 3 stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <CutPanel key={i} tone="card" contentClassName="flex items-center gap-4 p-5">
            <Sk className="h-12 w-12 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Sk className="h-3 w-20 rounded-full" />
              <Sk className="h-7 w-10 rounded-lg" />
            </div>
            <Sk className="h-9 w-24 shrink-0 rounded-2xl" />
          </CutPanel>
        ))}
      </div>

      {/* Section heading */}
      <div className="flex items-center justify-between pt-3">
        <Sk className="h-6 w-44 rounded-full" />
        <Sk className="h-3.5 w-24 rounded-full" />
      </div>

      {/* Recent generations list */}
      <CutPanel tone="card" className="overflow-hidden" contentClassName="bg-card">
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
      </CutPanel>
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
      <CutPanel tone="card" className="relative overflow-hidden" contentClassName="p-6 sm:p-8">
        <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>

            <h1 className="mt-3 text-balance text-3xl">
              Welcome back, <span className="text-gradient">{profile.name}</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Ready to create something great today?</p>
          </div>
          <Link href="/generator">
            <CutButton variant="primary">
              <Icon name="plus" size={18} />
              <span>Create Voice</span>
            </CutButton>
          </Link>
        </div>
      </CutPanel>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {/* Credits card */}
  <CutPanel tone="card" contentClassName="flex items-center gap-4 p-5">
  <CutPanel tone="soft" className="size-12 shrink-0" contentClassName="flex items-center justify-center text-brand">
  <Icon name="bolt" size={24} />
  </CutPanel>
  <div className="flex min-w-0 items-center gap-3">
  <p className="whitespace-nowrap text-base text-muted-foreground">Credits left</p>
  <p className="bg-[linear-gradient(-45deg,#ec5252,#6e1a52)] bg-clip-text text-3xl font-bold leading-none text-transparent">{profile.credits}</p>
  </div>
  </CutPanel>

        {/* Plan card */}
        <CutPanel tone="card" contentClassName="flex items-center gap-4 p-5">
          <CutPanel tone="soft" className="size-12 shrink-0" contentClassName="flex items-center justify-center text-brand">
            <Icon name="crown" size={24} />
          </CutPanel>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="text-2xl">{planLabels[profile.plan] || 'Free'}</p>
          </div>
          {isYearly ? (
            <CutButton variant="outline" disabled className="shrink-0 px-3 py-2 text-xs text-brand-2/50 opacity-60">
              <Icon name="crown" size={13} /> Plan Max
            </CutButton>
          ) : (
            <Link href="/plans">
              <CutButton variant="primary" className="shrink-0 px-3 py-2 text-xs">
                <Icon name="crown" size={13} /> Update Plan
              </CutButton>
            </Link>
          )}
        </CutPanel>

        {/* Generations card */}
        <CutPanel tone="card" contentClassName="flex items-center gap-4 p-5">
          <CutPanel tone="soft" className="size-12 shrink-0" contentClassName="flex items-center justify-center text-brand">
            <Icon name="soundwave" size={24} />
          </CutPanel>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Generations</p>
            <p className="text-2xl">{history.length}</p>
          </div>
          <Link href="/generator">
            <CutButton variant="outline" className="shrink-0 px-3 py-2 text-xs text-foreground">
              <Icon name="plus" size={13} /> Generate
            </CutButton>
          </Link>
        </CutPanel>
      </div>

      {profile.credits <= 3 && (
        <CutPanel tone="soft" className="mt-5" contentClassName="flex flex-col items-center justify-between gap-4 p-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <Icon name="crown" size={26} className="text-brand-2" />
            <div>
              <p className="text-sm">Running low on credits</p>
              <p className="text-xs text-muted-foreground">Upgrade your plan to keep generating.</p>
            </div>
          </div>
          <Link href="/plans">
            <CutButton variant="primary" className="px-4 py-2 text-xs">
              <Icon name="crown" size={14} /> Upgrade plan
            </CutButton>
          </Link>
        </CutPanel>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-xl">Recent generations</h2>
        <Link href="/generator" className="text-sm text-brand-2 transition hover:underline">Create new →</Link>
      </div>

      <CutPanel tone="card" className="mt-4 overflow-hidden" contentClassName="bg-card">
        <VoiceHistoryList generations={history} isOwner />
      </CutPanel>
    </div>
  );
}
