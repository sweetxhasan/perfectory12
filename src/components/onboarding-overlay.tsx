/**
 * OnboardingOverlay — shown once per account after first login / email verify.
 * Steps:
 *  0. Welcome           (animated gradient greeting, typewriter subtitle)
 *  1. Username setup    (live Firebase availability check)
 *  2. Discovery         (how did you hear about us?)
 *  3. Use-case / Role   (what best describes you?)
 *  4. Plan selection    (prices + details pulled from Firebase)
 *
 * Dismissed state stored in Firestore (onboardingDone: true).
 */
import { useState, useEffect, useRef, useCallback, type ReactNode, type CSSProperties, type HTMLAttributes } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import {
  checkUsernameAvailable,
  completeOnboarding,
  getPlanConfig,
  type PlanConfig,
  type UsernameStatus,
} from '@/lib/user-store';
import { CUT_FRAME_PATH, CUT_FRAME_CLIP_PATH, CUT_LABEL_CLIP_PATH } from '@/components/cut-frame';
import { CutSubmitButton } from '@/components/cut-submit-button';
import { FloatingField } from '@/components/floating-field';

/* ─── debounce hook ──────────────────────────────────── */
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/* ─── typewriter hook ────────────────────────────────── */
function useTypewriter(text: string, speed = 38, startDelay = 900) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const delay = setTimeout(() => {
      const t = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(t); setDone(true); }
      }, speed);
      return () => clearInterval(t);
    }, startDelay);
    return () => clearTimeout(delay);
  }, [text, speed, startDelay]);
  return { displayed, done };
}

/* ─── step progress bar ──────────────────────────────── */
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 px-5 pt-5 sm:px-7">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-none transition-all duration-500 ${
            i < current ? 'bg-brand' : i === current ? 'bg-brand/40' : 'bg-border'
          }`}
        />
      ))}
    </div>
  );
}

/* ─── SVG icon primitives ─────────────────────────────── */
const SvgSearch = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="7.5" r="5" /><line x1="11.5" y1="11.5" x2="16" y2="16" />
  </svg>
);
const SvgPlay = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="14" height="12" rx="2.5" /><polygon points="7,6 13,9 7,12" fill="currentColor" stroke="none" />
  </svg>
);
const SvgGlobe = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="9" r="7" /><path d="M2 9h14M9 2c-2 2-3 4.5-3 7s1 5 3 7M9 2c2 2 3 4.5 3 7s-1 5-3 7" />
  </svg>
);
const SvgMusic = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 14V5l8-2v9" /><circle cx="4.5" cy="14" r="1.5" /><circle cx="12.5" cy="12" r="1.5" />
  </svg>
);
const SvgUsers = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6.5" cy="6" r="2.5" /><path d="M1.5 15.5c0-2.8 2.2-5 5-5" />
    <circle cx="12.5" cy="6" r="2.5" /><path d="M11.5 10.5c2.8 0 5 2.2 5 5" />
  </svg>
);
const SvgMessage = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5l-3 2V4a1 1 0 0 1 1-1z" />
  </svg>
);
const SvgGradCap = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="9,2 17,6.5 9,11 1,6.5" />
    <path d="M4.5 9v4.5c0 1.4 2 2.5 4.5 2.5s4.5-1.1 4.5-2.5V9" />
    <line x1="17" y1="6.5" x2="17" y2="11" />
  </svg>
);
const SvgMic = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="1" width="6" height="9" rx="3" />
    <path d="M2 9a7 7 0 0 0 14 0" />
    <line x1="9" y1="16" x2="9" y2="18" />
    <line x1="6" y1="18" x2="12" y2="18" />
  </svg>
);
const SvgStar = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="9,1 11.5,6.5 17.5,7 13,11.5 14.5,17.5 9,14.5 3.5,17.5 5,11.5 0.5,7 6.5,6.5" />
  </svg>
);
const SvgVideo = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="11" height="10" rx="2" /><polygon points="12,7 17,5 17,13 12,11" />
  </svg>
);
const SvgBook = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 2h5c1.7 0 3 1.3 3 3v11c0-1.7-1.3-3-3-3H2V2z" />
    <path d="M16 2h-5c-1.7 0-3 1.3-3 3v11c0-1.7 1.3-3 3-3h5V2z" />
  </svg>
);
const SvgPen = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2l3 3L6 15H3v-3L13 2z" />
  </svg>
);
const SvgCode = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="5,4 1,9 5,14" /><polyline points="13,4 17,9 13,14" /><line x1="10" y1="2" x2="8" y2="16" />
  </svg>
);
const SvgBriefcase = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="14" height="10" rx="2" />
    <path d="M12 6V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2" />
    <line x1="2" y1="11" x2="16" y2="11" />
  </svg>
);
const SvgShare = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="14" cy="3" r="2" /><circle cx="4" cy="9" r="2" /><circle cx="14" cy="15" r="2" />
    <line x1="6" y1="8" x2="12" y2="4.5" /><line x1="6" y1="10" x2="12" y2="13.5" />
  </svg>
);
const SvgLightning = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="10,1 3,10 9,10 8,17 15,8 9,8" />
  </svg>
);
const SvgShield = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 1L2 4v5c0 4 3.1 7.5 7 8.5C13 16.5 16 13 16 9V4L9 1z" />
    <path d="M6 9l2 2 4-4" />
  </svg>
);
const SvgCheck = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" className={`shrink-0 ${className}`} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8l3.5 3.5L13 4" />
  </svg>
);
const SvgCheckCircle = () => (
  <svg viewBox="0 0 16 16" fill="none" className="h-5 w-5 shrink-0" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="7" className="fill-emerald-500" />
    <path d="M5 8l2.5 2.5L11 5" stroke="white" strokeWidth="1.8" />
  </svg>
);
const SvgXCircle = () => (
  <svg viewBox="0 0 16 16" fill="none" className="h-5 w-5 shrink-0" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="7" className="fill-destructive" />
    <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="white" strokeWidth="1.8" />
  </svg>
);
const SvgVerified = () => (
  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="7" className="fill-emerald-500" />
    <path d="M5 8l2.5 2.5L11 5" stroke="white" strokeWidth="1.8" />
  </svg>
);
const SvgCrown = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 13h14l1-8-4 3-4-6-4 6-4-3 1 8z" />
  </svg>
);
const SvgChat = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5l-3 2V4a1 1 0 0 1 1-1z" />
    <line x1="5" y1="7" x2="13" y2="7" /><line x1="5" y1="10" x2="10" y2="10" />
  </svg>
);
const SvgWave = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 9c1-3 2-3 3 0s2 3 3 0 2-3 3 0 2 3 3 0" />
  </svg>
);

/* ─── chip data ───────────────────────────────────────── */
type ChipItem = { label: string; icon: ReactNode };

const DISCOVERY_SOURCES: ChipItem[] = [
  { label: 'Google Search',        icon: <SvgSearch /> },
  { label: 'YouTube',              icon: <SvgPlay /> },
  { label: 'Facebook / Instagram', icon: <SvgGlobe /> },
  { label: 'TikTok',               icon: <SvgMusic /> },
  { label: 'Friend / Colleague',   icon: <SvgUsers /> },
  { label: 'Reddit',               icon: <SvgMessage /> },
  { label: 'School / Teacher',     icon: <SvgGradCap /> },
  { label: 'Podcast',              icon: <SvgMic /> },
  { label: 'Other',                icon: <SvgStar /> },
];

const ROLES: ChipItem[] = [
  { label: 'Content Creator',       icon: <SvgVideo /> },
  { label: 'Student',               icon: <SvgBook /> },
  { label: 'Teacher / Educator',    icon: <SvgGradCap /> },
  { label: 'Storyteller',           icon: <SvgPen /> },
  { label: 'Developer',             icon: <SvgCode /> },
  { label: 'Business Owner',        icon: <SvgBriefcase /> },
  { label: 'Social Media Manager',  icon: <SvgShare /> },
  { label: 'Podcaster',             icon: <SvgMic /> },
  { label: 'Other',                 icon: <SvgStar /> },
];

/* ─── plan feature details ────────────────────────────── */
interface PlanFeature { text: string; icon: ReactNode; highlight?: boolean }
interface PlanDetail {
  id: 'free' | 'monthly' | 'yearly';
  name: string;
  badge?: string;
  badgeClass?: string;
  tagline: string;
  features: PlanFeature[];
  stats: { label: string; value: string }[];
}

const PLAN_DETAILS: PlanDetail[] = [
  {
    id: 'free',
    name: 'Free Plan',
    tagline: 'Try before you commit',
    stats: [
      { label: 'Daily Generations', value: '2/day' },
      { label: 'Words per Generation', value: '500' },
      { label: 'Voices', value: '4 voices' },
    ],
    features: [
      { text: '2 generations per day', icon: <SvgLightning /> },
      { text: '500 words per generation', icon: <SvgPen /> },
      { text: '2 male + 2 female voices', icon: <SvgWave /> },
      { text: 'Bangla, English & Hindi', icon: <SvgGlobe /> },
    ],
  },
  {
    id: 'monthly',
    name: 'Monthly Pro',
    badge: 'Most Popular',
    badgeClass: 'bg-gradient-brand text-white',
    tagline: 'Perfect for regular creators',
    stats: [
      { label: 'Daily Generations', value: '5/day' },
      { label: 'Words per Generation', value: '3,000' },
      { label: 'Voices', value: '10 voices' },
    ],
    features: [
      { text: '5 generations per day', icon: <SvgLightning />, highlight: true },
      { text: '3,000 words per generation', icon: <SvgPen />, highlight: true },
      { text: '5 male + 5 female voices', icon: <SvgWave /> },
      { text: 'Bangla, English & Hindi', icon: <SvgGlobe /> },
      { text: 'Premium voice quality', icon: <SvgStar /> },
      { text: 'Live chat support', icon: <SvgChat />, highlight: true },
    ],
  },
  {
    id: 'yearly',
    name: 'Yearly Pro',
    badge: 'Best Value',
    badgeClass: 'bg-brand/10 text-brand ring-1 ring-brand/25',
    tagline: 'Maximum power, minimum cost',
    stats: [
      { label: 'Daily Generations', value: '10/day' },
      { label: 'Words per Generation', value: '100k' },
      { label: 'Voices', value: '20 voices' },
    ],
    features: [
      { text: '10 generations per day', icon: <SvgLightning />, highlight: true },
      { text: '100,000 words per generation', icon: <SvgPen />, highlight: true },
      { text: '10 male + 10 female voices', icon: <SvgWave />, highlight: true },
      { text: 'Bangla, English & Hindi', icon: <SvgGlobe /> },
      { text: 'Ultra Premium voices', icon: <SvgStar /> },
      { text: 'Priority live chat support', icon: <SvgChat />, highlight: true },
    ],
  },
];

/* ─── cut-frame building blocks ──────────────────────────────────
   Shared "premium cut-corner" geometry (CUT_FRAME_PATH /
   CUT_FRAME_CLIP_PATH) reused from the Login/Signup pages so every
   container, chip and button in this overlay speaks the same visual
   language. `CutFrameLayers` renders just the two absolute paint
   layers (clipped fill + crisp SVG stroke) so it can be dropped
   inside any relatively-positioned button/div. ─────────────────── */
const BRAND_FILL = 'linear-gradient(-45deg, #ec5252, #6e1a52)';
const SOFT_STROKE = 'color-mix(in oklch, var(--foreground) 13%, transparent)';

function CutFrameLayers({
  fill = 'var(--card)',
  stroke = SOFT_STROKE,
  strokeWidth = 1.3,
  boxShadow,
}: {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  boxShadow?: string;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-0 transition-[background] duration-200"
        style={{ clipPath: CUT_FRAME_CLIP_PATH, background: fill, boxShadow }}
      />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={CUT_FRAME_PATH} fill="none" stroke={stroke} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
      </svg>
    </>
  );
}

/** Generic cut-corner container — for tiles, cards, tab bars, etc.
    `className` is applied to the inner content wrapper so that layout
    utilities (flex, items-center, justify-center, gap, padding,
    text-center, etc.) actually govern the real children instead of
    being inert on the outer positioning shell. Use `outerClassName`
    for classes that must live on the outer box itself, like margin
    spacing relative to siblings or `overflow-hidden`. */
function CutPanel({
  children,
  className = '',
  outerClassName = '',
  fill = 'var(--card)',
  stroke = SOFT_STROKE,
  style,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  outerClassName?: string;
  fill?: string;
  stroke?: string;
  style?: CSSProperties;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`relative ${outerClassName}`} style={style} {...rest}>
      <CutFrameLayers fill={fill} stroke={stroke} />
      <div className={`relative z-10 ${className}`}>{children}</div>
    </div>
  );
}

/** Small square icon badge that shares the same cut-corner frame as the
    rest of the overlay — used for feature-tile icons and plan feature
    bullets so every icon container speaks the same visual language. */
function CutIconBox({
  icon,
  className = 'h-9 w-9',
  fill,
  stroke = 'transparent',
  iconClassName = 'text-white',
}: {
  icon: ReactNode;
  className?: string;
  fill: string;
  stroke?: string;
  iconClassName?: string;
}) {
  return (
    <div className={`relative flex shrink-0 items-center justify-center ${className}`}>
      <CutFrameLayers fill={fill} stroke={stroke} strokeWidth={1.1} />
      <span className={`relative z-10 flex items-center justify-center ${iconClassName}`}>{icon}</span>
    </div>
  );
}

/** Selection chip — replaces the old rounded `Chip`. */
function CutChip({ icon, label, selected, onClick }: { icon: ReactNode; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-95"
    >
      <CutFrameLayers
        fill={selected ? BRAND_FILL : 'var(--card)'}
        stroke={selected ? 'transparent' : SOFT_STROKE}
        boxShadow={selected ? '0 4px 18px -6px color-mix(in oklch, var(--brand) 45%, transparent)' : undefined}
      />
      <span className={`relative z-10 flex items-center gap-2 transition-colors duration-200 ${selected ? 'text-white' : 'text-foreground group-hover:text-brand'}`}>
        {icon}
        {label}
      </span>
    </button>
  );
}

/** Light/outline cut-corner action button — shares CutSubmitButton's
    geometry and height but with a card fill + brand text instead of
    the solid gradient (used for "Continue with Free Plan"). */
function CutOutlineButton({
  label,
  loading = false,
  disabled = false,
  onClick,
  className = '',
}: {
  label: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`group relative flex h-14 w-full shrink-0 items-center justify-center gap-2.5 text-sm font-semibold text-brand transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <CutFrameLayers fill="var(--card)" stroke="color-mix(in oklch, var(--brand) 45%, transparent)" />
      {loading && (
        <span className="relative z-10 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
      )}
      <span className="relative z-10 whitespace-nowrap">{label}</span>
    </button>
  );
}

/** Small cut-tag badge — same shape as the floating field labels
    (CUT_LABEL_CLIP_PATH), used for the plan "Most Popular"/"Best
    Value" badges instead of a rounded pill. */
function CutTag({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold ${className}`}
      style={{ clipPath: CUT_LABEL_CLIP_PATH }}
    >
      {children}
    </span>
  );
}

/* ─── arrow right ────────────────────────────────────── */
function ArrowRight() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h12M12 5l5 5-5 5" />
    </svg>
  );
}

/* ─── step title map ─────────────────────────────────── */
const STEP_TITLES: Record<number, ReactNode> = {
  1: <><span className="text-gradient">Set up</span> your account</>,
  2: <>How did you <span className="text-gradient">find us?</span></>,
  3: <>What <span className="text-gradient">describes you?</span></>,
  4: <>Choose your <span className="text-gradient">plan</span></>,
};

/* ─── main component ─────────────────────────────────── */
export function OnboardingOverlay() {
  const { user, profile, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  /* Step 1 */
  const [username, setUsername]             = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const debouncedUsername                   = useDebounce(username, 420);

  /* Step 2 */
  const [discovery, setDiscovery] = useState('');

  /* Step 3 */
  const [role, setRole]           = useState('');
  const [customRole, setCustomRole] = useState('');

  /* Step 4 */
  const [planConfig, setPlanConfig]   = useState<PlanConfig | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [activePlan, setActivePlan]   = useState<'monthly' | 'yearly' | 'free'>('free');

  const inputRef = useRef<HTMLInputElement>(null);
  const { displayed: typedSub, done: typedDone } = useTypewriter('Let\'s get started…', 42, 900);

  /* Lock body scroll while overlay is mounted */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => { if (profile?.username) setUsername(profile.username); }, [profile?.username]);
  useEffect(() => { if (step === 1) setTimeout(() => inputRef.current?.focus(), 200); }, [step]);
  useEffect(() => {
    if (!debouncedUsername || !user) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    checkUsernameAvailable(debouncedUsername, user.uid).then(setUsernameStatus);
  }, [debouncedUsername, user]);
  useEffect(() => {
    if (step !== 4) return;
    getPlanConfig().then((cfg) => { setPlanConfig(cfg); setPlanLoading(false); });
  }, [step]);

  const handleUsernameInput = (v: string) =>
    setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20));

  const usernameValid = usernameStatus === 'available';

  const usernameHint = () => {
    switch (usernameStatus) {
      case 'checking':  return { text: 'Checking availability…',                           color: 'text-muted-foreground' };
      case 'available': return { text: 'Username is available',                             color: 'text-emerald-600' };
      case 'taken':     return { text: 'Username already taken',                            color: 'text-destructive' };
      case 'invalid':   return { text: 'Letters (a-z), numbers, underscores. 3-20 chars.', color: 'text-destructive' };
      case 'too-short': return { text: 'At least 3 characters required',                   color: 'text-amber-600' };
      default:          return { text: '3-20 characters · letters, numbers, underscores',  color: 'text-muted-foreground' };
    }
  };
  const hint = usernameHint();
  const finalRole = role === 'Other' && customRole.trim() ? customRole.trim() : role;

  const handleFreePlan = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try { await completeOnboarding(user.uid, username, finalRole || undefined); await refreshProfile(); }
    finally { setSaving(false); }
  }, [user, username, finalRole, refreshProfile]);

  const handlePaidPlan = useCallback(async (planSlug: 'monthly' | 'yearly') => {
    if (!user) return;
    setSaving(true);
    try {
      await completeOnboarding(user.uid, username, finalRole || undefined);
      await refreshProfile();
      setLocation(`/buyplan/${planSlug}`);
    } finally { setSaving(false); }
  }, [user, username, finalRole, refreshProfile, setLocation]);

  /* plan price helpers */
  const prices: Record<string, { price: string; period: string }> = {
    monthly: { price: planConfig?.monthly_price ?? '৳200', period: planConfig?.monthly_period ?? 'per month' },
    yearly:  { price: planConfig?.yearly_price  ?? '৳2,000', period: planConfig?.yearly_period  ?? 'per year' },
    free:    { price: planConfig?.free_price    ?? '৳0', period: 'forever' },
  };

  const activePlanDetail = PLAN_DETAILS.find(p => p.id === activePlan)!;

  /* ── render ────────────────────────────────────────── */
  return (
    /* Full screen on mobile, centered modal on desktop */
    <div className="animate-overlay-backdrop fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm">
      <div className="pv-onboarding-shell animate-overlay-sheet relative flex w-full flex-col bg-card overflow-hidden
        sm:m-auto sm:max-h-[90vh] sm:w-full sm:max-w-lg sm:animate-overlay-modal sm:rounded-none sm:shadow-2xl">

        {/* Desktop-only cut-frame outline on the whole modal sheet */}
        <svg
          className="pointer-events-none absolute inset-0 z-30 hidden h-full w-full sm:block"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={CUT_FRAME_PATH} fill="none" stroke="oklch(0.15 0 0 / 0.85)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* ════════════════════ STEP 0 — WELCOME ════════════════════ */}
        {step === 0 && (
          <div className="relative flex flex-1 flex-col overflow-y-auto">
            {/* Gradient hero background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklch,var(--brand)_22%,transparent)_0%,_transparent_65%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_color-mix(in_oklch,var(--brand-2)_12%,transparent)_0%,_transparent_60%)] pointer-events-none" />
            <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-gradient-to-br from-brand/20 to-brand-2/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 h-48 w-48 rounded-full bg-gradient-to-tr from-brand-2/15 to-brand/10 blur-2xl pointer-events-none" />

            <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-10 pt-12 sm:px-10 sm:pb-14 sm:pt-16">

              {/* Logo — primary cut-corner UI, matching the brand buttons/panels */}
              <div className="relative mb-7 h-28 w-28">
                <div className="absolute inset-0 scale-150 rounded-full bg-gradient-to-br from-brand/25 to-brand-2/15 blur-xl" />
                <CutPanel
                  fill={BRAND_FILL}
                  stroke="transparent"
                  outerClassName="h-28 w-28"
                  className="flex h-full w-full items-center justify-center p-[9px]"
                  style={{ boxShadow: '0 10px 34px -8px color-mix(in oklch, var(--brand) 55%, transparent)' }}
                >
                  <div
                    className="flex h-full w-full items-center justify-center bg-white"
                    style={{ clipPath: CUT_FRAME_CLIP_PATH }}
                  >
                    <img
                      src="/favicon.png"
                      alt="Perfectory Voice"
                      className="h-[4.4rem] w-[4.4rem] object-contain"
                    />
                  </div>
                </CutPanel>
                <svg
                  className="absolute inset-0 h-full w-full animate-ping"
                  style={{ animationDuration: '2.4s' }}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d={CUT_FRAME_PATH} fill="none" stroke="var(--brand)" strokeOpacity="0.4" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>

              {/* Title */}
              <h1
                className="text-center text-[1.85rem] font-black leading-tight tracking-tight sm:text-4xl"
                style={{ animation: 'fadeSlideUp 0.6s ease both' }}
              >
                <span className="text-gradient">Welcome to</span>
                <br />
                <span className="text-gradient">Perfectory Voice!</span>
              </h1>

              {/* Typewriter subtitle */}
              <p className="mt-4 min-h-[1.5rem] text-center text-base text-muted-foreground sm:text-lg">
                {typedSub}
                {!typedDone && (
                  <span className="ml-0.5 inline-block h-[1.1em] w-0.5 translate-y-[2px] animate-pulse rounded-full bg-brand" />
                )}
              </p>

              {/* Feature tiles */}
              <div
                className="mt-7 grid w-full grid-cols-3 gap-3"
                style={{ animation: 'fadeSlideUp 0.7s ease 0.35s both' }}
              >
                {([
                  { icon: <SvgMic />,      label: 'Voices',   sub: 'Bangla · English · Hindi' },
                  { icon: <SvgLightning />, label: 'Instant TTS', sub: 'Generate in seconds' },
                  { icon: <SvgShield />,    label: 'Your Account', sub: 'Saved & synced' },
                ] as { icon: ReactNode; label: string; sub: string }[]).map(({ icon, label, sub }) => (
                  <CutPanel
                    key={label}
                    fill="color-mix(in oklch, var(--card) 85%, transparent)"
                    className="flex flex-col items-center gap-2 px-2 py-4 text-center backdrop-blur-sm"
                  >
                    <CutIconBox icon={icon} className="h-9 w-9" fill={BRAND_FILL} iconClassName="text-white" />
                    <p className="text-[11px] font-bold text-foreground">{label}</p>
                    <p className="text-[10px] leading-tight text-muted-foreground">{sub}</p>
                  </CutPanel>
                ))}
              </div>

              {/* Continue button */}
              <div className="mt-8 w-full" style={{ animation: 'fadeSlideUp 0.7s ease 0.5s both' }}>
                <CutSubmitButton
                  type="button"
                  onClick={() => setStep(1)}
                  label={<span className="inline-flex items-center gap-2.5">Get Started <ArrowRight /></span>}
                />
              </div>

              <p className="mt-3 text-center text-xs text-muted-foreground/60">
                Just a few quick steps to personalise your experience
              </p>
            </div>
          </div>
        )}

        {/* ══════════════ STEPS 1-4: shared header ══════════════ */}
        {step >= 1 && (
          <div className="shrink-0">
            {/* Progress bar */}
            <StepBar current={step - 1} total={4} />

            {/* Header: back arrow + centered step title + logo */}
            <div className="relative flex items-center justify-center gap-3 px-5 pt-4 pb-3 sm:px-7">
              {step > 1 ? (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="group absolute left-5 sm:left-7 flex h-9 w-9 items-center justify-center text-muted-foreground transition hover:text-foreground"
                >
                  <CutFrameLayers fill="var(--card)" stroke={SOFT_STROKE} />
                  <svg viewBox="0 0 20 20" fill="none" className="relative z-10 h-4 w-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 10H4M9 5l-5 5 5 5" />
                  </svg>
                </button>
              ) : (
                <div className="absolute left-5 sm:left-7 h-9 w-9" />
              )}

              {/* Centered step title */}
              <h2 className="text-center text-xl font-black tracking-tight sm:text-2xl">
                {STEP_TITLES[step]}
              </h2>

              {/* Logo right side */}
              <img
                src="/favicon.png"
                alt="Perfectory Voice"
                className="absolute right-5 sm:right-7 h-8 w-8 rounded-xl object-contain"
              />
            </div>

            {/* Step subtitle */}
            <p className="px-5 pb-1 text-center text-sm text-muted-foreground sm:px-7">
              {step === 1 && 'Pick a public username — it will appear on your profile.'}
              {step === 2 && 'Help us understand how people find Perfectory Voice.'}
              {step === 3 && 'We will personalise your experience based on your role.'}
              {step === 4 && 'Start free, upgrade anytime. Each credit = one generation.'}
            </p>

            {/* Divider */}
            <div className="mt-3 h-px bg-border/60" />
          </div>
        )}

        {/* ════════════════ STEP CONTENT (scrollable) ═══════════════ */}
        {step >= 1 && (
          <div className="flex-1 overflow-y-auto">

            {/* ════════════════ STEP 1 — USERNAME ════════════════ */}
            {step === 1 && (
              <div className="px-5 pb-8 pt-5 sm:px-7">
                <div className="space-y-3">
                  {/* Username field — shared premium cut-frame field */}
                  <FloatingField
                    ref={inputRef}
                    label="Username"
                    icon="user"
                    status={usernameStatus === 'available' ? 'valid' : usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'error' : 'default'}
                    type="text"
                    inputMode="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={username}
                    onChange={(e) => handleUsernameInput(e.target.value)}
                    placeholder="your_username"
                    rightSlot={
                      <span className="relative z-20 flex shrink-0 items-center pr-4">
                        {usernameStatus === 'checking' && (
                          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                        )}
                        {usernameStatus === 'available' && <SvgCheckCircle />}
                        {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <SvgXCircle />}
                      </span>
                    }
                    hint={
                      <p className={`flex items-center gap-1.5 text-xs ${hint.color}`}>
                        {usernameStatus === 'available' && <SvgCheckCircle />}
                        {hint.text}
                      </p>
                    }
                  />
                </div>

                <div className="mt-6">
                  <CutSubmitButton
                    type="button"
                    onClick={() => { if (usernameValid) setStep(2); }}
                    disabled={!usernameValid}
                    label={<span className="inline-flex items-center gap-2">Continue <ArrowRight /></span>}
                  />
                </div>
              </div>
            )}

            {/* ════════════════ STEP 2 — DISCOVERY ══════════════ */}
            {step === 2 && (
              <div className="px-5 pb-8 pt-5 sm:px-7">
                <div className="flex flex-wrap gap-2">
                  {DISCOVERY_SOURCES.map(({ icon, label }) => (
                    <CutChip
                      key={label}
                      icon={icon}
                      label={label}
                      selected={discovery === label}
                      onClick={() => setDiscovery((prev) => prev === label ? '' : label)}
                    />
                  ))}
                </div>

                <div className="mt-6">
                  <CutSubmitButton
                    type="button"
                    onClick={() => { if (discovery) setStep(3); }}
                    disabled={!discovery}
                    label={<span className="inline-flex items-center gap-2">Continue <ArrowRight /></span>}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">Select one option to continue</p>
              </div>
            )}

            {/* ════════════════ STEP 3 — ROLE ═══════════════════ */}
            {step === 3 && (
              <div className="px-5 pb-8 pt-5 sm:px-7">
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(({ icon, label }) => (
                    <CutChip
                      key={label}
                      icon={icon}
                      label={label}
                      selected={role === label}
                      onClick={() => {
                        setRole((prev) => prev === label ? '' : label);
                        if (label !== 'Other') setCustomRole('');
                      }}
                    />
                  ))}
                </div>

                {role === 'Other' && (
                  <div className="mt-3">
                    <FloatingField
                      label="Describe your role"
                      icon="pencil"
                      type="text"
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      placeholder="Describe your role…"
                    />
                  </div>
                )}

                <div className="mt-6">
                  <CutSubmitButton
                    type="button"
                    onClick={() => { if (role) setStep(4); }}
                    disabled={!role}
                    label={<span className="inline-flex items-center gap-2">Continue <ArrowRight /></span>}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">Select one option to continue</p>
              </div>
            )}

            {/* ════════════════ STEP 4 — PLAN ═══════════════════ */}
            {step === 4 && (
              <div className="px-5 pb-8 pt-5 sm:px-7">
                {planLoading ? (
                  <div className="flex flex-col gap-3">
                    {[0, 1, 2].map((i) => <div key={i} className="h-36 animate-shimmer rounded-2xl" />)}
                  </div>
                ) : (
                  <>
                    {/* Plan tab selector — each option is its own primary cut-frame button */}
                    <div className="flex gap-2">
                      {PLAN_DETAILS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setActivePlan(p.id as typeof activePlan)}
                          className={`relative flex-1 py-2.5 text-xs font-semibold transition-colors duration-200 ${
                            activePlan === p.id ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <CutFrameLayers
                            fill={activePlan === p.id ? BRAND_FILL : 'color-mix(in oklch, var(--muted) 55%, transparent)'}
                            stroke={activePlan === p.id ? 'transparent' : SOFT_STROKE}
                          />
                          <span className="relative z-10">
                            {p.id === 'free' ? 'Free' : p.id === 'monthly' ? 'Monthly' : 'Yearly'}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Active plan card */}
                    <CutPanel
                      fill={activePlan === 'free' ? 'var(--card)' : 'linear-gradient(135deg, color-mix(in oklch, var(--brand-3) 10%, white) 0%, color-mix(in oklch, var(--brand) 8%, white) 100%)'}
                      stroke={activePlan === 'monthly' ? 'var(--brand)' : activePlan === 'yearly' ? 'color-mix(in oklch, var(--brand) 60%, transparent)' : SOFT_STROKE}
                      outerClassName="mt-4 overflow-hidden"
                      className="transition-all duration-300"
                    >
                      {/* Card header */}
                      <div className="relative p-5 pb-4">
                        {activePlanDetail.badge && (
                          <CutTag className={`absolute right-4 top-4 ${activePlanDetail.badgeClass}`}>
                            {activePlanDetail.badge}
                          </CutTag>
                        )}
                        <p className="text-base font-bold pr-24">{activePlanDetail.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{activePlanDetail.tagline}</p>
                        <p className="mt-3 text-3xl font-black">
                          {prices[activePlan].price}
                          <span className="ml-1.5 text-sm font-normal text-muted-foreground">{prices[activePlan].period}</span>
                        </p>
                      </div>

                      {/* Stats row */}
                      <div className="flex divide-x divide-border/60 border-y border-border/60 bg-background/40">
                        {activePlanDetail.stats.map((s) => (
                          <div key={s.label} className="flex flex-1 flex-col items-center py-3 text-center">
                            <p className="text-sm font-black text-brand">{s.value}</p>
                            <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Features list */}
                      <div className="space-y-2.5 p-5 pt-4">
                        {activePlanDetail.features.map((f) => (
                          <div key={f.text} className={`flex items-center gap-3 text-sm ${f.highlight ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                            <CutIconBox
                              icon={f.icon}
                              className="h-6 w-6"
                              fill={f.highlight ? BRAND_FILL : 'var(--muted)'}
                              iconClassName={f.highlight ? 'text-white' : 'text-muted-foreground'}
                            />
                            {f.text}
                          </div>
                        ))}
                      </div>
                    </CutPanel>

                    {/* CTA button */}
                    {activePlan === 'monthly' && (
                      <div className="mt-4">
                        <CutSubmitButton
                          type="button"
                          onClick={() => handlePaidPlan('monthly')}
                          loading={saving}
                          label={<span className="inline-flex items-center gap-2"><SvgStar /> Get Monthly Pro — {prices.monthly.price}</span>}
                          loadingLabel="Setting up your plan…"
                        />
                      </div>
                    )}
                    {activePlan === 'yearly' && (
                      <div className="mt-4">
                        <CutSubmitButton
                          type="button"
                          onClick={() => handlePaidPlan('yearly')}
                          loading={saving}
                          label={<span className="inline-flex items-center gap-2"><SvgCrown /> Get Yearly Pro — {prices.yearly.price}</span>}
                          loadingLabel="Setting up your plan…"
                        />
                      </div>
                    )}
                    {activePlan === 'free' && (
                      <div className="mt-4">
                        <CutOutlineButton
                          onClick={handleFreePlan}
                          loading={saving}
                          label="Continue with Free Plan"
                        />
                      </div>
                    )}

                    <p className="mt-3 text-center text-[11px] text-muted-foreground">
                      You can upgrade anytime from your account settings.
                    </p>
                  </>
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
