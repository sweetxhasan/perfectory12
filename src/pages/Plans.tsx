import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import { SiteShell } from '@/components/site-shell';
import { SEOHead } from '@/components/seo-head';
import { PAGE_SEO } from '@/lib/seo-config';
import { Panel, SectionBadge, GradientButton, OutlineButton } from '@/components/primitives';
import { Icon } from '@/components/icon';
import { CutButton, CutPanel } from '@/components/cut-ui';
import { useAuth } from '@/lib/auth-context';
import { deactivatePlan, PLAN_DAILY_CREDITS, type PlanId } from '@/lib/user-store';
import { subscribeUserPayments } from '@/lib/payments';
import type { Timestamp } from 'firebase/firestore';

/* ── Plan data ──────────────────────────────────────────────── */
interface PlanFeature { text: string; highlight?: boolean }
interface Plan {
  id: PlanId;
  name: string;
  badge?: string;
  price: string;
  period: string;
  tagline: string;
  dailyGen: number;
  words: number;
  maleVoices: number;
  femaleVoices: number;
  voiceTier: string;
  features: PlanFeature[];
  highlight?: boolean;
  premium?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    badge: 'Free',
    price: '৳0',
    period: 'forever',
    tagline: 'Try before you commit',
    dailyGen: PLAN_DAILY_CREDITS.free,
    words: 500,
    maleVoices: 2,
    femaleVoices: 2,
    voiceTier: 'Standard Voices',
    features: [
      { text: '2 generations per day (resets daily)' },
      { text: '500 words per generation' },
      { text: '2 male + 2 female voices' },
      { text: 'Bangla, English & Hindi' },
    ],
  },
  {
    id: 'monthly',
    name: 'Monthly',
    badge: 'Most Popular',
    price: '৳200',
    period: 'per month',
    tagline: 'Perfect for regular creators',
    dailyGen: PLAN_DAILY_CREDITS.monthly,
    words: 3000,
    maleVoices: 5,
    femaleVoices: 5,
    voiceTier: 'Premium Voices',
    highlight: true,
    features: [
      { text: '5 generations per day', highlight: true },
      { text: '3,000 words per generation', highlight: true },
      { text: '5 male + 5 female voices' },
      { text: 'Premium voices' },
      { text: 'Live chat support', highlight: true },
      { text: 'Auto-expires after 30 days' },
    ],
  },
  {
    id: 'yearly',
    name: 'Yearly',
    badge: 'Best Value',
    price: '৳2,000',
    period: 'per year',
    tagline: 'Maximum power, minimum cost',
    dailyGen: PLAN_DAILY_CREDITS.yearly,
    words: 100000,
    maleVoices: 10,
    femaleVoices: 10,
    voiceTier: 'Ultra Premium Voices',
    premium: true,
    features: [
      { text: '10 generations per day', highlight: true },
      { text: '100,000 words per generation', highlight: true },
      { text: '10 male + 10 female voices', highlight: true },
      { text: 'Ultra Premium voices' },
      { text: 'Priority live chat support', highlight: true },
      { text: 'Auto-expires after 365 days' },
    ],
  },
];

/* ── Helpers ──────────────────────────────────────────────── */
function daysLeft(ts: Timestamp | null | undefined): number | null {
  if (!ts) return null;
  return Math.max(0, Math.ceil((ts.toDate().getTime() - Date.now()) / 86_400_000));
}
function formatExpiry(ts: Timestamp | null | undefined): string | null {
  if (!ts) return null;
  return ts.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtWords(n: number) {
  return n >= 1000 ? `${(n / 1000).toLocaleString()}k` : String(n);
}

/* ── Shimmer skeleton ─────────────────────────────────────── */
const Sk = ({ className = '', style }: { className?: string; style?: CSSProperties }) => (
  <div className={`animate-shimmer rounded-2xl ${className}`} style={style} />
);
function PlansSkeleton() {
  return (
    <SiteShell>
      <SEOHead {...PAGE_SEO.plans} />
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Sk className="h-6 w-24 rounded-full" />
          <Sk className="h-10 w-72 rounded-xl" />
          <Sk className="h-4 w-80 rounded-full" />
        </div>
        <div className="grid items-stretch gap-5 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <Sk className="h-5 w-28 rounded-full" />
              <Sk className="h-10 w-32 rounded-xl" />
              <Sk className="h-24 w-full rounded-xl" />
              <div className="space-y-2.5">
                {[0, 1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Sk className="h-5 w-5 shrink-0 rounded-full" />
                    <Sk className="h-3.5 rounded-full" style={{ width: `${120 + j * 24}px` }} />
                  </div>
                ))}
              </div>
              <Sk className="mt-auto h-11 w-full rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}

/* ══════════════════════════════════════════════════════════════
   Overlay shell — identical pattern to Generator's OverlayShell
   (bottom-sheet on mobile, centred modal on desktop, drag-to-dismiss)
══════════════════════════════════════════════════════════════ */
function OverlayShell({
  open, onClose, title, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const sheetRef    = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const dragStartY  = useRef(0);
  const dragging    = useRef(false);
  const lastDelta   = useRef(0);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      if (sheetRef.current)    { sheetRef.current.style.transform = ''; sheetRef.current.style.transition = ''; }
      if (backdropRef.current) { backdropRef.current.style.opacity = ''; backdropRef.current.style.transition = ''; }
    }
  }, [open]);

  const DISMISS_PX   = 140;
  const BACKDROP_BASE = 0.55;

  function onDragStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
    lastDelta.current  = 0;
    dragging.current   = true;
    if (sheetRef.current)    sheetRef.current.style.transition    = 'none';
    if (backdropRef.current) backdropRef.current.style.transition  = 'none';
  }
  function onDragMove(e: React.TouchEvent) {
    if (!dragging.current) return;
    const raw = e.touches[0].clientY - dragStartY.current;
    if (raw <= 0) return;
    lastDelta.current = raw;
    if (sheetRef.current)    sheetRef.current.style.transform  = `translateY(${raw}px)`;
    if (backdropRef.current) backdropRef.current.style.opacity = String(BACKDROP_BASE * (1 - Math.min(raw / DISMISS_PX, 1)));
  }
  function onDragEnd() {
    if (!dragging.current) return;
    dragging.current = false;
    if (lastDelta.current >= DISMISS_PX) {
      if (sheetRef.current)    { sheetRef.current.style.transition = 'transform 0.25s cubic-bezier(0.4,0,1,1)'; sheetRef.current.style.transform = 'translateY(115%)'; }
      if (backdropRef.current) { backdropRef.current.style.transition = 'opacity 0.25s ease'; backdropRef.current.style.opacity = '0'; }
      setTimeout(onClose, 240);
    } else {
      if (sheetRef.current)    { sheetRef.current.style.transition = 'transform 0.42s cubic-bezier(0.34,1.56,0.64,1)'; sheetRef.current.style.transform = 'translateY(0)'; }
      if (backdropRef.current) { backdropRef.current.style.transition = 'opacity 0.3s ease'; backdropRef.current.style.opacity = String(BACKDROP_BASE); }
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-overlay-backdrop"
        onClick={onClose}
      />

      {/* ── Mobile: bottom sheet ── */}
      <div
        ref={sheetRef}
        className="sm:hidden absolute bottom-0 left-0 right-0 flex flex-col bg-card rounded-t-[2rem] max-h-[92dvh] animate-overlay-sheet shadow-2xl"
      >
        {/* Drag handle */}
        <div
          className="flex justify-center items-center pt-3 pb-2 shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
          onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}
        >
          <div className="h-[5px] w-[52px] rounded-full bg-border/80" />
        </div>
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0 touch-none select-none"
          onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}
        >
          <span className="text-base font-bold">{title}</span>
          <button
            type="button" onClick={onClose} aria-label="Close"
            onTouchStart={(e) => e.stopPropagation()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition hover:bg-border hover:text-foreground"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
        <div className="shrink-0" style={{ height: 'env(safe-area-inset-bottom, 12px)' }} />
      </div>

      {/* ── Desktop: centred modal ── */}
      <div
        className="hidden sm:flex flex-col bg-card rounded-3xl shadow-2xl border border-border w-[480px] max-h-[85vh] absolute top-1/2 left-1/2 animate-overlay-modal overflow-hidden"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <span className="text-base font-bold">{title}</span>
          <button
            type="button" onClick={onClose} aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition hover:bg-border hover:text-foreground"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Static warning triangle icon ───────────────────────── */
function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true"
      stroke="#ef4444" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth={2.5} />
    </svg>
  );
}

/* ── Animated SVG: crown breaking apart ─────────────────── */
function AnimatedCrownBreak() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-20 w-20" aria-hidden="true">
      <style>{`
        @keyframes pv-crown-bob   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes pv-crack-draw  { 0%{stroke-dashoffset:30;opacity:0} 100%{stroke-dashoffset:0;opacity:1} }
        @keyframes pv-shard-left  { 0%,80%{transform:translate(0,0) rotate(0deg);opacity:1} 100%{transform:translate(-8px,6px) rotate(-20deg);opacity:0} }
        @keyframes pv-shard-right { 0%,80%{transform:translate(0,0) rotate(0deg);opacity:1} 100%{transform:translate(8px,6px) rotate(20deg);opacity:0} }
        @keyframes pv-crown-glow  { 0%,100%{opacity:.15} 50%{opacity:.35} }
        .pv-crown-bob   { animation: pv-crown-bob 2.6s ease-in-out infinite; transform-origin:40px 50px; }
        .pv-crack       { stroke-dasharray:30; animation: pv-crack-draw 0.5s 0.2s ease-out forwards; opacity:0; }
        .pv-shard-l     { animation: pv-shard-left  3.5s ease-in-out infinite 0.5s; transform-origin:28px 36px; }
        .pv-shard-r     { animation: pv-shard-right 3.5s ease-in-out infinite 0.5s; transform-origin:52px 36px; }
        .pv-cglow       { animation: pv-crown-glow 2.6s ease-in-out infinite; }
      `}</style>
      {/* Glow */}
      <circle className="pv-cglow" cx="40" cy="40" r="34" fill="#ef4444" />
      <g className="pv-crown-bob">
        {/* Crown body */}
        <path
          d="M14 56 L18 30 L28 44 L40 20 L52 44 L62 30 L66 56 Z"
          fill="rgba(239,68,68,0.12)"
          stroke="#ef4444"
          strokeWidth="2.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Crown base bar */}
        <rect x="14" y="54" width="52" height="7" rx="3.5" fill="rgba(239,68,68,0.18)" stroke="#ef4444" strokeWidth="2.5" />
        {/* Crack down middle */}
        <path className="pv-crack" d="M40 20 L37 32 L42 44 L38 56" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        {/* Left shard (gems on left peak) */}
        <circle className="pv-shard-l" cx="28" cy="36" r="3.5" fill="#ef4444" opacity="0.7" />
        {/* Right shard */}
        <circle className="pv-shard-r" cx="52" cy="36" r="3.5" fill="#ef4444" opacity="0.7" />
        {/* Centre gem */}
        <circle cx="40" cy="14" r="4" fill="rgba(239,68,68,0.4)" stroke="#ef4444" strokeWidth="2" />
      </g>
    </svg>
  );
}

/* ── Animated consequence X icon ────────────────────────── */
function AnimatedX({ delay = 0 }: { delay?: number }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 shrink-0" aria-hidden="true">
      <style>{`
        @keyframes pv-x-in { from{stroke-dashoffset:28;opacity:0} to{stroke-dashoffset:0;opacity:1} }
        .pv-x-line { stroke-dasharray:28; animation: pv-x-in 0.35s ease-out forwards; }
      `}</style>
      <circle cx="10" cy="10" r="9" fill="rgba(239,68,68,0.1)" stroke="#ef4444" strokeWidth="1.5" />
      <line className="pv-x-line" x1="7" y1="7" x2="13" y2="13" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"
        style={{ animationDelay: `${delay}ms` }} />
      <line className="pv-x-line" x1="13" y1="7" x2="7" y2="13" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"
        style={{ animationDelay: `${delay + 80}ms` }} />
    </svg>
  );
}

/* ── Animated checkmark (for summary in step 2) ─────────── */
function AnimatedCheck({ delay = 0 }: { delay?: number }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 shrink-0" aria-hidden="true">
      <style>{`
        @keyframes pv-chk-in { from{stroke-dashoffset:20;opacity:0} to{stroke-dashoffset:0;opacity:1} }
        .pv-chk { stroke-dasharray:20; animation: pv-chk-in 0.4s ease-out forwards; opacity:0; }
      `}</style>
      <circle cx="10" cy="10" r="9" fill="rgba(239,68,68,0.08)" stroke="#ef4444" strokeWidth="1.5" />
      <path className="pv-chk" d="M6 10.5L8.5 13L14 7.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ animationDelay: `${delay}ms` }} />
    </svg>
  );
}

/* ── Deactivate overlay content ──────────────────────────── */
function DeactivateContent({
  planId, onClose, onConfirm, busy,
}: {
  planId: Exclude<PlanId, 'free'>;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const isYearly = planId === 'yearly';
  const planName = isYearly ? 'Yearly' : 'Monthly';
  const dailyCredits = PLAN_DAILY_CREDITS[planId];
  const voiceCount = isYearly ? '10 male · 10 female' : '5 male · 5 female';
  const duration = isYearly ? '365 days' : '30 days';

  const consequences = [
    `Your ${planName} plan ends immediately`,
    'All current credits will be lost',
    'You will receive 2 Free plan credits',
    `${isYearly ? 'Premium' : 'Paid'} voices become locked`,
    `Daily generations drop from ${dailyCredits} to 2`,
    'This action cannot be undone',
  ];

  return (
    <div className="px-5 py-5">
      {step === 1 ? (
        /* ── Step 1: Warning ── */
        <div>
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 border border-destructive/20">
              <WarningIcon />
            </div>
          </div>

          {/* Title + subtitle */}
          <div className="text-center mb-5">
             <h2 className="text-xl font-bold text-foreground">Deactivate {planName} Plan?</h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              This will immediately downgrade your account.<br />
              Please read the following before continuing.
            </p>
          </div>

          {/* Consequence list */}
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-destructive/70 mb-3">
              What will happen
            </p>
            <ul className="space-y-3">
              {consequences.map((c, i) => (
                <li key={c} className="flex items-start gap-3">
                  <AnimatedX delay={i * 80} />
                  <span className="text-sm text-foreground/80 leading-snug">{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-semibold transition hover:bg-secondary/70 active:scale-[0.98]"
            >
              Keep My Plan
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive transition hover:bg-destructive/15 active:scale-[0.98]"
            >
              I Understand →
            </button>
          </div>
        </div>
      ) : (
        /* ── Step 2: Final confirm ── */
        <div>
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <AnimatedCrownBreak />
          </div>

          {/* Title */}
          <div className="text-center mb-5">
            <h2 className="text-xl font-bold text-foreground">Final Confirmation</h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Your plan and all credits will be cleared immediately.<br />
              Are you absolutely sure?
            </p>
          </div>

          {/* After-downgrade summary */}
          <div className="rounded-2xl border border-border bg-secondary/40 overflow-hidden mb-5">
            <div className="px-4 py-2.5 bg-destructive/8 border-b border-border">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-destructive/70">
                After deactivation
              </p>
            </div>
            {[
              { label: 'Plan changes to', value: 'Free', delay: 0 },
              { label: 'Credits reset to', value: '2 credits', delay: 100 },
               { label: 'Daily generations', value: '2 / day', delay: 200 },
               { label: 'Voice access', value: '2 male · 2 female', delay: 300 },
               { label: 'Paid period cleared', value: duration, delay: 400 },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0">
                <AnimatedCheck delay={row.delay} />
                <span className="text-sm text-muted-foreground flex-1">{row.label}</span>
                <span className="text-sm font-semibold text-foreground">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              disabled={busy}
              className="flex-1 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-semibold transition hover:bg-secondary/70 active:scale-[0.98] disabled:opacity-50"
            >
              ← Go Back
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-destructive px-4 py-3 text-sm font-semibold text-white shadow-[0_2px_14px_rgba(239,68,68,0.4)] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" stroke="white" strokeWidth="1.5" />
                  <line x1="5" y1="5" x2="11" y2="11" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="11" y1="5" x2="5" y2="11" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
              {busy ? 'Deactivating…' : 'Deactivate Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Pending review banner (inside plan card) ──────────────── */
function PendingReviewBanner({ inverted }: { inverted?: boolean }) {
  return (
    <div className={`mt-5 overflow-hidden rounded-2xl border ${
      inverted
        ? 'border-amber-400/25 bg-amber-400/10'
        : 'border-amber-300/60 bg-amber-50'
    }`}>
      {/* Header row */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${
        inverted ? 'border-amber-400/20' : 'border-amber-200/80'
      }`}>
        {/* Animated clock icon */}
        <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          inverted ? 'bg-amber-400/15' : 'bg-amber-100'
        }`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            className={`h-4.5 w-4.5 ${inverted ? 'text-amber-300' : 'text-amber-600'}`}>
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          {/* Pulsing ring */}
          <span className={`absolute inset-0 rounded-full border-2 animate-ping ${
            inverted ? 'border-amber-400/30' : 'border-amber-300/50'
          }`} style={{ animationDuration: '2s' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${inverted ? 'text-amber-200' : 'text-amber-800'}`}>
            Request Under Review
          </p>
          <p className={`text-xs ${inverted ? 'text-amber-300/70' : 'text-amber-600'}`}>
            Submitted and awaiting approval
          </p>
        </div>
        {/* Pending pill */}
        <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
          inverted ? 'bg-amber-400/15 text-amber-300' : 'bg-amber-100 text-amber-700'
        }`}>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          Pending
        </span>
      </div>

      {/* Progress steps */}
      <div className={`flex items-center gap-0 px-4 py-3 border-b ${
        inverted ? 'border-amber-400/20' : 'border-amber-200/80'
      }`}>
        {/* Step 1: Submitted */}
        <div className="flex items-center gap-1.5">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
            inverted ? 'bg-amber-400/30 text-amber-200' : 'bg-amber-500 text-white'
          }`}>✓</span>
          <span className={`text-[10px] font-semibold ${inverted ? 'text-amber-300' : 'text-amber-700'}`}>
            Submitted
          </span>
        </div>
        <div className={`flex-1 mx-2 h-px ${inverted ? 'bg-amber-400/30' : 'bg-amber-300/60'}`} />
        {/* Step 2: Review (active) */}
        <div className="flex items-center gap-1.5">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 animate-pulse ${
            inverted ? 'border-amber-400/60 text-amber-300' : 'border-amber-400 text-amber-600'
          }`}>
            <span className="h-2 w-2 rounded-full bg-current" />
          </span>
          <span className={`text-[10px] font-bold ${inverted ? 'text-amber-300' : 'text-amber-800'}`}>
            Reviewing
          </span>
        </div>
        <div className={`flex-1 mx-2 h-px ${inverted ? 'bg-white/10' : 'bg-border'}`} />
        {/* Step 3: Decision */}
        <div className="flex items-center gap-1.5">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${
            inverted ? 'border-white/20 text-white/30' : 'border-border text-muted-foreground'
          } text-[9px]`}>?</span>
          <span className={`text-[10px] ${inverted ? 'text-white/40' : 'text-muted-foreground'}`}>
            Decision
          </span>
        </div>
      </div>

      {/* Body text */}
      <div className="px-4 py-3 space-y-2">
        <p className={`text-xs leading-relaxed ${inverted ? 'text-amber-300/80' : 'text-amber-700'}`}>
          The <strong>Perfectory Voice team</strong> is reviewing your payment. You'll receive a notification once it's approved or rejected.
        </p>
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] ${
          inverted ? 'bg-amber-400/10 text-amber-300/70' : 'bg-amber-100/80 text-amber-600'
        }`}>
          <Icon name="info" size={12} className="shrink-0" />
          You cannot submit another request for this plan until this one is resolved.
        </div>
      </div>

      {/* Locked CTA */}
      <div className="px-4 pb-4">
        <div className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-xs font-semibold cursor-not-allowed select-none ${
          inverted
            ? 'border-amber-400/20 bg-amber-400/10 text-amber-300/60'
            : 'border-amber-200 bg-amber-100/60 text-amber-500/70'
        }`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          New requests locked until review complete
        </div>
      </div>
    </div>
  );
}

/* ── Single plan card ───────────────────────────────────── */
function PlanCard({
  plan, current, expiryDate, days, isGuest, onChoose, onDeactivate, busy, isOnlyCard, pending,
}: {
  plan: Plan;
  current: boolean;
  expiryDate: string | null;
  days: number | null;
  isGuest: boolean;
  onChoose: () => void;
  onDeactivate: () => void;
  busy: boolean;
  isOnlyCard: boolean;
  pending?: boolean;
}) {
  const { highlight, premium } = plan;
  const inverted = false;

  const cardBase = 'relative flex flex-col p-6';
  const cardStyle = `${cardBase} text-foreground`;

  return (
    <div className={`relative ${isOnlyCard ? 'max-w-lg mx-auto w-full' : ''}`}>
      <CutPanel
        tone="card"
        className="overflow-hidden shadow-[0_18px_42px_oklch(0.15_0.02_260/0.08)] transition duration-300 hover:-translate-y-2"
        contentClassName="bg-card"
      >
      {plan.badge && (
        <div className="absolute right-6 top-6 z-20 flex w-max">
          <CutPanel
            tone="card"
            className="inline-flex whitespace-nowrap"
            contentClassName="bg-[linear-gradient(-45deg,#ec5252,#6e1a52)] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white"
          >
            {plan.badge}
          </CutPanel>
        </div>
      )}
      <div className={cardStyle}>
        <CutPanel tone="soft" className="mb-4 size-14" contentClassName="flex items-center justify-center bg-secondary text-foreground">
          <svg className="size-6" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 19L12 3L22 19L18 21L12 17L6 21L2 19Z" />
            <path d="M2 19L12 3" />
            <path d="M22 19L12 3" />
            <path d="M2 19L6 21L12 17L18 21L22 19" />
            <circle cx="12" cy="3" r="1.5" strokeWidth="1.8" />
            <circle cx="6" cy="12" r="1.2" strokeWidth="1.8" />
            <circle cx="18" cy="12" r="1.2" strokeWidth="1.8" />
          </svg>
        </CutPanel>

        {/* Header row */}
        <div className="mb-1 flex items-start justify-between gap-2">
          {/* "Active" badge — only for logged-in users on their actual plan */}
          {current && !isGuest && (
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
              inverted ? 'bg-white/15 text-white' : 'bg-brand/10 text-brand'
            }`}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
          )}
        </div>

        <h3 className="text-2xl font-semibold text-foreground">{plan.name}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{plan.tagline}</p>

        {/* Price */}
        <div className="mt-4 flex items-end gap-1">
          <span className="text-5xl font-normal leading-none text-foreground">
            {plan.price}
          </span>
          <span className="mb-1 text-sm text-muted-foreground">
            / {plan.period}
          </span>
        </div>

        {/* Feature list */}
        <ul className="mt-5 flex flex-1 flex-col gap-2">
          {plan.features.map((f) => (
            <li key={f.text} className="flex items-start gap-2.5 border-b border-border/50 py-1.5 text-sm text-foreground last:border-0">
              <svg viewBox="0 0 24 24" className={`mt-0.5 size-3.5 shrink-0 ${inverted ? 'text-white' : 'text-brand'}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <path d="M12 3V21" />
                <path d="M3 12H21" />
                <path d="M6 6L18 18" />
                <path d="M18 6L6 18" />
              </svg>
              <span className={f.highlight && !inverted ? 'font-medium' : ''}>{f.text}</span>
            </li>
          ))}
        </ul>

        {/* Expiry notice — only for logged-in users on their plan */}
        {current && !isGuest && expiryDate && (
          <div className={`mt-4 rounded-xl px-3 py-2 text-xs ${
            inverted
              ? (days ?? 999) <= 30 ? 'bg-orange-500/20 text-orange-200' : 'bg-white/10 text-white/70'
              : (days ?? 999) <= 7  ? 'bg-orange-500/10 text-orange-600' : 'bg-secondary text-muted-foreground'
          }`}>
            <span className="font-medium">Expires {expiryDate}</span>
            {days !== null && ` · ${days} day${days !== 1 ? 's' : ''} left`}
            {(days ?? 999) <= 30 && <span className="ml-1.5 font-semibold">— Expiring soon</span>}
          </div>
        )}

        {/* Pending review banner — replaces CTA when a request is under review */}
        {pending ? (
          <PendingReviewBanner inverted={inverted} />
        ) : (
          /* CTA button */
          <div className="mt-5 flex justify-center">
            {/* Guest → always show "Get Started" pointing to signup */}
            {isGuest ? (
              highlight ? (
                <CutButton
                  variant="primary"
                  onClick={onChoose}
                  className="w-[250px] px-5 py-3 text-sm font-semibold text-white"
                >
                  Get Started
                </CutButton>
              ) : premium ? (
                <CutButton
                  variant="primary"
                  onClick={onChoose}
                  className="w-[250px] px-5 py-3 text-sm font-semibold text-white"
                >
                  Get Started
                </CutButton>
              ) : (
                <CutButton variant="primary" onClick={onChoose} className="w-[250px] px-5 py-3 text-sm font-semibold text-white">
                  Get Started
                </CutButton>
              )
            ) : current && plan.id !== 'free' ? (
              /* Any paid active plan → Deactivate */
              <CutButton
                variant="outline"
                onClick={onDeactivate}
                className={`w-[250px] px-5 py-3 text-sm font-medium ${
                  inverted
                    ? 'border-white/20 bg-white/10 text-white/80 hover:bg-white/15'
                    : 'border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10'
                }`}
              >
                Deactivate {plan.name} Plan
              </CutButton>
            ) : current ? (
              <CutButton variant="primary" disabled className="w-[250px] px-5 py-3 text-sm font-semibold text-white">Current Plan</CutButton>
            ) : plan.id === 'free' ? (
              <CutButton variant="primary" disabled className="w-[250px] px-5 py-3 text-sm font-semibold text-white">Included Free</CutButton>
            ) : highlight ? (
              <CutButton
                variant="primary"
                onClick={onChoose}
                disabled={busy}
                className="w-[250px] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                  : null}
                Get Monthly
              </CutButton>
            ) : premium ? (
              <CutButton
                variant="primary"
                onClick={onChoose}
                disabled={busy}
                className="w-full px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  : null}
                Get Yearly
              </CutButton>
            ) : (
              <CutButton variant="primary" onClick={onChoose} disabled={busy} className="w-[250px] px-5 py-3 text-sm font-semibold text-white">
                {busy ? 'Loading…' : 'Upgrade Now'}
              </CutButton>
            )}
          </div>
        )}
      </div>
      </CutPanel>
    </div>
  );
}

/* ── Page export ────────────────────────────────────────── */
export default function PlansPage() {
  const { loading } = useAuth();
  if (loading) return <PlansSkeleton />;
  return <PlansContent />;
}

/* ── Main content ───────────────────────────────────────── */
function PlansContent() {
  const { user, profile, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [pendingPlanIds, setPendingPlanIds] = useState<Set<string>>(new Set());

  // Subscribe to current user's payment requests to detect pending ones
  useEffect(() => {
    if (!user) { setPendingPlanIds(new Set()); return; }
    const unsub = subscribeUserPayments(user.uid, (payments) => {
      const ids = new Set(
        payments.filter((p) => p.status === 'pending').map((p) => p.plan),
      );
      setPendingPlanIds(ids);
    });
    return unsub;
  }, [user]);

  const isGuest     = !user;
  // Only consider "current plan" when actually logged in
  const currentPlan: PlanId = (user && profile?.plan) ? profile.plan : 'free';
  const expiry      = profile?.planExpiresAt as Timestamp | null | undefined;
  const days        = daysLeft(expiry);
  const expiryDate  = formatExpiry(expiry);

   /* Visible plans:
      - Guest              → [free, monthly, yearly]
      - Logged-in, free    → [monthly, yearly]
      - Logged-in, monthly → [monthly, yearly] (current + upgrade)
      - Logged-in, yearly  → [yearly] (current + deactivate)
   */
  const visiblePlans = (() => {
    if (isGuest) return PLANS;
    if (currentPlan === 'free')    return PLANS.filter(p => p.id !== 'free');
     if (currentPlan === 'monthly') return PLANS.filter(p => p.id === 'monthly' || p.id === 'yearly');
    return PLANS.filter(p => p.id === 'yearly');
  })();

  const isOnlyCard = visiblePlans.length === 1;

  async function choose(plan: Plan) {
    if (plan.id === 'free') return;
    if (isGuest) {
      // Redirect to login, then bounce to buyplan after auth
      setLocation(`/login?redirect=/buyplan/${plan.id}`);
      return;
    }
    // Logged-in → go to payment flow
    setLocation(`/buyplan/${plan.id}`);
  }

  async function handleDeactivate() {
    if (!user) return;
    setDeactivating(true);
    try {
      await deactivatePlan(user.uid);
      await refreshProfile();
      setShowDeactivate(false);
    } catch (e) {
      console.error('[pv] deactivate error', e);
    } finally {
      setDeactivating(false);
    }
  }

  const gridCols =
    visiblePlans.length >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' :
    visiblePlans.length === 2 ? 'sm:grid-cols-2' : 'grid-cols-1';

  const headline = (() => {
    if (isGuest)                   return <>Choose your <span className="text-gradient">perfect plan</span></>;
    if (currentPlan === 'free')    return <>Upgrade for <span className="text-gradient">more power</span></>;
     if (currentPlan === 'monthly') return <>Your <span className="text-gradient">Monthly Plan</span></>;
    return <>Your <span className="text-gradient">Yearly Plan</span></>;
  })();

  const subline = (() => {
    if (isGuest)                   return 'Start free, upgrade anytime. Each credit = one generation.';
    if (currentPlan === 'free')    return 'Pick a paid plan to unlock more voices and generations.';
     if (currentPlan === 'monthly') return 'Your current plan is live. Keep Monthly or switch to Yearly for best value.';
    return 'You\'re on the best plan. Manage or deactivate below.';
  })();

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">

          </div>
          <h1 className="mt-4 text-balance text-3xl sm:text-4xl">{headline}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{subline}</p>
        </div>

        {/* Trust chips */}
        {visiblePlans.length > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {[
              { icon: 'bolt',   text: 'Credits reset daily' },
              { icon: 'shield', text: 'No surprise charges' },
              { icon: 'ban',    text: 'Cancel anytime' },
            ].map(({ icon, text }) => (
              <span key={text} className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3.5 py-1.5 text-xs text-muted-foreground">
                <Icon name={icon as never} size={12} className="text-brand-2" />
                {text}
              </span>
            ))}
          </div>
        )}

        {/* Plan cards */}
        <div className={`mt-8 grid items-start gap-5 ${gridCols}`}>
          {visiblePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              current={!isGuest && currentPlan === plan.id}
              expiryDate={expiryDate}
              days={days}
              isGuest={isGuest}
              onChoose={() => choose(plan)}
              onDeactivate={() => setShowDeactivate(true)}
              busy={busy === plan.id}
              isOnlyCard={isOnlyCard}
              pending={!isGuest && pendingPlanIds.has(plan.id)}
            />
          ))}
        </div>

        {/* Comparison table — only for guests or free users */}
        {(isGuest || currentPlan === 'free') && (
          <div className="mt-10 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Feature</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Free</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-brand">Monthly</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-brand-2">Yearly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { label: 'Daily generations', free: '2 / day', monthly: '5 / day',   yearly: '10 / day' },
                  { label: 'Words per gen',     free: '500',     monthly: '3,000',      yearly: '100,000' },
                  { label: 'Male voices',       free: '2',       monthly: '5',          yearly: '10' },
                  { label: 'Female voices',     free: '2',       monthly: '5',          yearly: '10' },
                  { label: 'Voice quality',     free: 'Standard', monthly: 'Premium',   yearly: 'Ultra Premium' },
                  { label: 'Live chat support', free: '—',       monthly: '✓',          yearly: 'Priority' },
                ].map((row) => (
                  <tr key={row.label} className="hover:bg-secondary/30 transition">
                    <td className="px-4 py-3 font-medium text-foreground">{row.label}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{row.free}</td>
                    <td className="px-4 py-3 text-center font-medium text-brand">{row.monthly}</td>
                    <td className="px-4 py-3 text-center font-medium text-brand-2">{row.yearly}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-6 rounded-2xl border border-border bg-gradient-soft p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Paid plans auto-expire after their period — your account reverts to Free with no surprise charges.
            1 generation = 1 credit. Credits reset daily at midnight Bangladesh Standard Time.
          </p>
        </div>
      </div>

      {/* Deactivate overlay */}
      <OverlayShell
        open={showDeactivate}
        onClose={() => setShowDeactivate(false)}
        title="Deactivate Plan"
      >
        <DeactivateContent
          planId={currentPlan === 'free' ? 'monthly' : currentPlan}
          onClose={() => setShowDeactivate(false)}
          onConfirm={handleDeactivate}
          busy={deactivating}
        />
      </OverlayShell>
    </SiteShell>
  );
}
