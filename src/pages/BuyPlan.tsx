import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { SiteShell } from '@/components/site-shell';
import { AuthGuard } from '@/components/auth-guard';
import { Icon } from '@/components/icon';
import { useAuth } from '@/lib/auth-context';
import { PLAN_DAILY_CREDITS, type PlanId } from '@/lib/user-store';
import {
  subscribeConfiguredMethods,
  PLAN_AMOUNTS,
} from '@/lib/payments';

/* ── Plan detail definitions ────────────────────────── */
const PLAN_INFO = {
  monthly: {
    name: 'Monthly Pro',
    badge: 'Most Popular',
    price: '৳200',
    period: 'per month',
    tagline: 'Perfect for regular creators',
    duration: '30 days',
    color: 'from-brand to-brand-2',
    features: [
      { icon: 'bolt',      label: '5 generations per day (resets daily)' },
      { icon: 'file',      label: '3,000 words per generation' },
      { icon: 'user',      label: '5 male + 5 female voices' },
      { icon: 'soundwave', label: 'Premium Voices' },
      { icon: 'chat',      label: 'Live chat support' },
      { icon: 'clock',     label: 'Expires after 30 days' },
    ],
  },
  yearly: {
    name: 'Yearly Premium',
    badge: 'Best Value',
    price: '৳2,000',
    period: 'per year',
    tagline: 'Maximum power, minimum cost',
    duration: '365 days',
    color: 'from-brand-3 to-brand-2',
    features: [
      { icon: 'bolt',      label: '10 generations per day (resets daily)' },
      { icon: 'file',      label: '100,000 words per generation' },
      { icon: 'user',      label: '10 male + 10 female voices' },
      { icon: 'soundwave', label: 'Ultra Premium Voices' },
      { icon: 'chat',      label: 'Priority live chat support' },
      { icon: 'clock',     label: 'Expires after 365 days' },
    ],
  },
} as const;

/* ── Shimmer skeleton ───────────────────────────────── */
function MethodSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[100px] rounded-2xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}

/* ── Method card — logo + name, no number ───────────── */
function MethodCard({
  id, name, logoUrl, selected, onClick,
}: {
  id: string; name: string; logoUrl?: string; selected: boolean; onClick: () => void;
}) {
  /* Fallback gradient colors for well-known IDs */
  const FALLBACK_COLORS: Record<string, string> = {
    bkash:  '#E2136E',
    nagad:  '#F7961C',
    rocket: '#7B2D8B',
  };
  const color = FALLBACK_COLORS[id] ?? '#6366f1';

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-2 sm:gap-3 rounded-2xl border-2 p-3 sm:p-5 text-center transition-all duration-200 active:scale-[0.96] select-none w-full ${
        selected
          ? 'border-transparent shadow-xl scale-[1.03]'
          : 'border-border bg-card hover:border-brand/40 hover:shadow-md hover:scale-[1.01]'
      }`}
      style={selected ? {
        borderColor: color,
        background: `linear-gradient(135deg, ${color}12 0%, ${color}06 100%)`,
        boxShadow: `0 8px 32px ${color}28, 0 2px 8px ${color}18`,
      } : {}}
    >
      {/* Selected checkmark */}
      {selected && (
        <span
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full shadow-lg ring-2 ring-white/60"
          style={{ background: color }}
        >
          <Icon name="check" size={11} className="text-white" />
        </span>
      )}

      {/* Logo */}
      <div className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-xl sm:rounded-2xl shadow-sm border border-border/50 shrink-0">
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-base font-black text-white"
            style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` }}
          >
            {name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name */}
      <span className={`text-[11px] sm:text-sm font-bold leading-tight transition-colors ${
        selected ? 'text-foreground' : 'text-foreground/80'
      }`}>{name}</span>

      {/* Selected glow bar */}
      {selected && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full opacity-70"
          style={{ background: color }} />
      )}
    </button>
  );
}

/* ── Main page ──────────────────────────────────────── */
export default function BuyPlan() {
  return (
    <AuthGuard>
      <SiteShell>
        <BuyPlanContent />
      </SiteShell>
    </AuthGuard>
  );
}

function BuyPlanContent() {
  const { plan } = useParams<{ plan: string }>();
  const [, setLocation] = useLocation();
  const { profile } = useAuth();

  const planId = plan === 'monthly' || plan === 'yearly' ? plan : null;
  const info = planId ? PLAN_INFO[planId] : null;

  const [methods, setMethods] = useState<Array<{
    id: string; name: string; number: string; logoUrl?: string;
  }> | null>(null);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  /* Load only admin-configured payment methods */
  useEffect(() => {
    setLoadingMethods(true);
    const unsubscribe = subscribeConfiguredMethods((configured) => {
      setMethods(configured ?? []);
      setLoadingMethods(false);
    });
    return unsubscribe;
  }, []);

  if (!planId || !info) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Invalid plan selected.</p>
        <button onClick={() => setLocation('/plans')}
          className="text-sm text-brand underline underline-offset-2">
          View Plans
        </button>
      </div>
    );
  }

  const amount = PLAN_AMOUNTS[planId];
  const alreadyOnPlan = profile?.plan === planId;

  function handleContinue() {
    if (!selected) return;
    setLocation(`/buyplan/${planId}/${selected}`);
  }

  /* Grid columns based on count — always 3 cols for 3 methods (compact on mobile) */
  const gridClass =
    !methods || methods.length <= 1 ? 'grid-cols-1' :
    methods.length === 2            ? 'grid-cols-2' :
                                      'grid-cols-3';

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">

      {/* Back */}
      <button onClick={() => setLocation('/plans')}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <Icon name="arrow-left" size={16} />
        Back to Plans
      </button>

      {/* Plan hero card */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${info.color} p-6 text-white shadow-xl`}>
        <span className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <span className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex items-start justify-between">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm">
              <Icon name="crown" size={10} />
              {info.badge}
            </span>
            <h1 className="mt-3 text-2xl font-black tracking-tight">{info.name}</h1>
            <p className="mt-0.5 text-sm text-white/70">{info.tagline}</p>
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className="text-3xl font-black">{info.price}</p>
            <p className="text-xs text-white/60">{info.period}</p>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {info.features.map((f) => (
            <div key={f.label} className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Icon name={f.icon as never} size={11} className="text-white" />
              </span>
              <span className="text-sm text-white/90">{f.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
          <span className="text-sm text-white/70">Total amount</span>
          <span className="text-lg font-black">৳{amount.toLocaleString()}</span>
        </div>
      </div>

      {/* Already on plan */}
      {alreadyOnPlan && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Icon name="info" size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            You're already on this plan. Buying again will extend your subscription.
          </p>
        </div>
      )}

      {/* Payment method selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-foreground">Choose Payment Method</h2>
          {loadingMethods && (
            <span className="h-4 w-4 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
          )}
        </div>

        {loadingMethods ? (
          <MethodSkeleton />
        ) : methods && methods.length > 0 ? (
          <div className={`grid gap-3 ${gridClass}`}>
            {methods.map((m) => (
              <MethodCard
                key={m.id}
                id={m.id}
                name={m.name}
                logoUrl={m.logoUrl}
                selected={selected === m.id}
                onClick={() => setSelected(m.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Icon name="credit-card" size={24} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">No payment methods available</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                The admin hasn't configured any payment methods yet. Please contact support.
              </p>
            </div>
          </div>
        )}

        {/* Tap hint */}
        {!selected && !loadingMethods && methods && methods.length > 0 && (
          <p className="text-center text-xs text-muted-foreground animate-pulse">
            Tap a payment method to continue
          </p>
        )}

        {/* Selected method label */}
        {selected && methods && (
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-brand">
            <Icon name="check" size={13} />
            {methods.find((m) => m.id === selected)?.name} selected
          </div>
        )}
      </div>

      {/* Continue button */}
      <button
        onClick={handleContinue}
        disabled={!selected || loadingMethods}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-brand-2 px-5 py-4 text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 hover:shadow-brand/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        style={selected ? { boxShadow: '0 8px 24px rgba(99,102,241,0.3)' } : {}}
      >
        Continue to Payment
        <Icon name="arrow-right" size={16} />
      </button>

      {/* Security note */}
      <p className="text-center text-xs text-muted-foreground pb-4">
        <Icon name="shield" size={12} className="inline mr-1 text-brand" />
        Your payment is manually reviewed and approved by our team.
      </p>
    </div>
  );
}
