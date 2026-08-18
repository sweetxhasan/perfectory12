import { useState, useEffect, type ReactNode } from 'react';
import { useLocation, useParams } from 'wouter';
import { SiteShell } from '@/components/site-shell';
import { AuthGuard } from '@/components/auth-guard';
import { Icon } from '@/components/icon';
import { useAuth } from '@/lib/auth-context';
import {
  getConfiguredMethods,
  PLAN_AMOUNTS,
  submitPaymentRequest,
  type PaymentMethodId,
} from '@/lib/payments';
import type { PlanId } from '@/lib/user-store';

/* ── Inline brand logos ─────────────────────────────── */
function BkashLogo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <rect width="56" height="56" rx="16" fill="#E2136E" />
      <circle cx="28" cy="24" r="9" fill="white" fillOpacity="0.2" />
      {/* stylised b */}
      <path d="M22 16 L22 32 M22 16 Q30 16 30 21 Q30 26 22 26" stroke="white" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <text x="50%" y="76%" textAnchor="middle" dominantBaseline="middle"
        fontFamily="Arial Black,Arial" fontWeight="900" fontSize="9.5" fill="white" letterSpacing="0.5">
        bKash
      </text>
    </svg>
  );
}

function NagadLogo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <rect width="56" height="56" rx="16" fill="#F7961C" />
      {/* N shape */}
      <path d="M17 38 L17 18 L28 35 L28 18" stroke="white" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M28 38 L28 18" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      <text x="50%" y="84%" textAnchor="middle" dominantBaseline="middle"
        fontFamily="Arial Black,Arial" fontWeight="900" fontSize="9" fill="white" letterSpacing="0.5">
        Nagad
      </text>
    </svg>
  );
}

function RocketLogo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <rect width="56" height="56" rx="16" fill="#7B2D8B" />
      {/* rocket body */}
      <path d="M28 10 C28 10 38 16 38 26 C38 32 34 36 28 39 C22 36 18 32 18 26 C18 16 28 10 28 10Z"
        fill="white" fillOpacity="0.85" />
      <circle cx="28" cy="26" r="4" fill="#7B2D8B" />
      {/* flames */}
      <path d="M24 39 Q28 44 32 39" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      <text x="50%" y="88%" textAnchor="middle" dominantBaseline="middle"
        fontFamily="Arial Black,Arial" fontWeight="900" fontSize="8.5" fill="white" letterSpacing="0.5">
        Rocket
      </text>
    </svg>
  );
}

const LOGOS: Record<string, (s: number) => ReactNode> = {
  bkash:  (s) => <BkashLogo size={s} />,
  nagad:  (s) => <NagadLogo size={s} />,
  rocket: (s) => <RocketLogo size={s} />,
};

const BRAND_COLORS: Record<string, string> = {
  bkash:  '#E2136E',
  nagad:  '#F7961C',
  rocket: '#7B2D8B',
};

const PLAN_LABELS: Record<string, string> = {
  monthly: 'Monthly Pro (৳200 / 30 days)',
  yearly:  'Yearly Premium (৳2,000 / 365 days)',
};

/* ── Step indicator ─────────────────────────────────── */
function Steps({ active }: { active: 1 | 2 | 3 }) {
  const steps = ['Select Method', 'Make Payment', 'Done'];
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < active;
        const cur  = n === active;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                done ? 'bg-brand text-white' : cur ? 'bg-brand text-white ring-4 ring-brand/20' : 'bg-muted text-muted-foreground'
              }`}>
                {done ? <Icon name="check" size={12} /> : n}
              </div>
              <span className={`text-[10px] font-medium ${cur ? 'text-brand' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mb-4 mx-2 h-0.5 w-10 rounded-full transition-all ${
                done ? 'bg-brand' : 'bg-border'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Copy button ────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={copy}
      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all hover:bg-muted active:scale-95"
      style={{ color: copied ? '#22c55e' : undefined }}>
      <Icon name={copied ? 'check' : 'copy'} size={13} />
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

/* ── Instructions ───────────────────────────────────── */
function Instructions({ methodName, number, amount }: {
  methodName: string; number: string; amount: number;
}) {
  const steps = [
    `Open your ${methodName} app`,
    `Go to "Send Money"`,
    `Enter recipient number: ${number}`,
    `Enter exact amount: ৳${amount.toLocaleString()}`,
    `Complete payment & copy the Transaction ID`,
  ];
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
            {i + 1}
          </span>
          <span className="text-sm text-foreground/80 leading-snug">{s}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Success state ──────────────────────────────────── */
function SuccessView({ planId, onGoToDashboard }: {
  planId: string; onGoToDashboard: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <Icon name="check" size={36} className="text-green-600" />
      </div>
      <div>
        <h2 className="text-xl font-black text-foreground">Request Submitted!</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
          Your payment request has been received. Our team will verify and
          activate your{' '}
          <span className="font-semibold text-brand capitalize">{planId}</span>{' '}
          plan shortly.
        </p>
      </div>

      <div className="w-full rounded-2xl border border-border bg-muted/40 p-4 text-left space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What happens next?</p>
        {[
          'Admin reviews your transaction',
          'Your plan is activated within a few hours',
          'You receive your daily credits immediately',
        ].map((t, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <Icon name="check" size={14} className="text-brand shrink-0" />
            <span className="text-sm text-foreground/80">{t}</span>
          </div>
        ))}
      </div>

      <button onClick={onGoToDashboard}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-brand-2 px-5 py-4 text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all">
        Go to Dashboard
        <Icon name="arrow-right" size={16} />
      </button>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────── */
export default function BuyPlanCheckout() {
  return (
    <AuthGuard>
      <SiteShell>
        <CheckoutContent />
      </SiteShell>
    </AuthGuard>
  );
}

function CheckoutContent() {
  const { plan, method } = useParams<{ plan: string; method: string }>();
  const [, setLocation] = useLocation();
  const { user, profile } = useAuth();

  const planId = (plan === 'monthly' || plan === 'yearly') ? (plan as Exclude<PlanId, 'free'>) : null;
  const brandColor = BRAND_COLORS[method ?? ''] ?? '#6366f1';
  const logo = LOGOS[method ?? ''];
  const amount = planId ? PLAN_AMOUNTS[planId] : 0;

  /* Load configured method details from Firestore */
  const [methodDef, setMethodDef] = useState<{ id: string; name: string; number: string; logoUrl?: string } | null>(null);
  const [loadingMethod, setLoadingMethod] = useState(true);

  useEffect(() => {
    if (!method) { setLoadingMethod(false); return; }
    getConfiguredMethods().then((methods) => {
      const found = methods?.find((m) => m.id === method) ?? null;
      setMethodDef(found);
      setLoadingMethod(false);
    });
  }, [method]);

  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!planId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Invalid checkout link.</p>
        <button onClick={() => setLocation('/plans')} className="text-sm text-brand underline">
          Back to Plans
        </button>
      </div>
    );
  }

  if (loadingMethod) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-8 w-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
      </div>
    );
  }

  if (!methodDef) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Payment method not available.</p>
        <button onClick={() => setLocation(`/buyplan/${planId}`)} className="text-sm text-brand underline">
          Go back
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) return;
    const num = senderNumber.trim();
    const txn = transactionId.trim();
    if (!num || num.length < 11) { setError('Enter a valid mobile number (11 digits)'); return; }
    if (!txn || txn.length < 4)  { setError('Enter the transaction ID from your payment app'); return; }
    setError('');
    setSubmitting(true);
    try {
      await submitPaymentRequest({
        uid: user.uid,
        userName: profile.name || profile.username || 'Unknown',
        userEmail: profile.email,
        username: profile.username,
        plan: planId!,
        method: method as PaymentMethodId,
        amount,
        senderNumber: num,
        transactionId: txn,
      });
      setSuccess(true);
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <SuccessView planId={planId} onGoToDashboard={() => setLocation('/dashboard')} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">

      {/* Back */}
      <button onClick={() => setLocation(`/buyplan/${planId}`)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <Icon name="arrow-left" size={16} />
        Back
      </button>

      {/* Steps */}
      <Steps active={2} />

      {/* Payment info card */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-4 p-5"
          style={{ background: `linear-gradient(135deg, ${brandColor}15 0%, ${brandColor}05 100%)` }}>
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl shadow-md">
            {methodDef.logoUrl
              ? <img src={methodDef.logoUrl} alt={methodDef.name} className="h-full w-full object-cover" />
              : logo?.(56)
            }
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Pay via
            </p>
            <h2 className="text-xl font-black text-foreground">{methodDef.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {PLAN_LABELS[planId]}
            </p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Number to pay */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Send ৳{amount.toLocaleString()} to this number
            </p>
            <div className="flex items-center justify-between rounded-2xl border-2 px-4 py-3"
              style={{ borderColor: `${brandColor}40`, background: `${brandColor}08` }}>
              <span className="text-xl font-black tracking-wider" style={{ color: brandColor }}>
                {methodDef.number}
              </span>
              <CopyButton text={methodDef.number} />
            </div>
          </div>

          {/* Amount pill */}
          <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
            <span className="text-sm text-muted-foreground">Exact amount to send</span>
            <span className="text-lg font-black text-foreground">৳{amount.toLocaleString()}</span>
          </div>

          {/* Instructions */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              How to pay
            </p>
            <Instructions methodName={methodDef.name} number={methodDef.number} amount={amount} />
          </div>
        </div>
      </div>

      {/* Confirm payment form */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-foreground">Confirm Your Payment</h3>
        <p className="text-xs text-muted-foreground -mt-2">
          After sending money, fill in the details below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sender number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Your {methodDef.name} Number
            </label>
            <div className="group relative flex items-center rounded-2xl border border-input bg-background transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <span className="pl-3.5 text-muted-foreground group-focus-within:text-brand">
                <Icon name="phone" size={16} />
              </span>
              <input
                type="tel"
                placeholder="01XXXXXXXXX"
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                maxLength={11}
                className="w-full bg-transparent px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground/50"
                required
              />
            </div>
          </div>

          {/* Transaction ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Transaction ID
            </label>
            <div className="group relative flex items-center rounded-2xl border border-input bg-background transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <span className="pl-3.5 text-muted-foreground group-focus-within:text-brand">
                <Icon name="credit-card" size={16} />
              </span>
              <input
                type="text"
                placeholder="e.g. 8F3K7TXN9PQ..."
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full bg-transparent px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground/50"
                required
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Found in your {methodDef.name} app after the payment is complete.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5">
              <Icon name="info" size={14} className="text-destructive shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-brand-2 px-5 py-4 text-sm font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Submitting…
              </>
            ) : (
              <>
                <Icon name="send" size={16} />
                Submit Payment Request
              </>
            )}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-4">
        <Icon name="shield" size={12} className="inline mr-1 text-brand" />
        Payment requests are manually verified by our team within a few hours.
      </p>
    </div>
  );
}
