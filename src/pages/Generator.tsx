import {
  useState, useRef, useEffect, useCallback,
  type CSSProperties,
} from 'react';
import { motion } from 'framer-motion';
import { OverlayShell } from '@/components/overlay-shell';
import { Link } from 'wouter';
import { SiteShell } from '@/components/site-shell';
import { SEOHead } from '@/components/seo-head';
import { PAGE_SEO } from '@/lib/seo-config';
import { GradientButton, OutlineButton, Panel, SectionBadge } from '@/components/primitives';
import { CutPanel, CutButton } from '@/components/cut-ui';
import { Icon } from '@/components/icon';
import { useAuth } from '@/lib/auth-context';
import {
  LANGUAGES, VOICES, creditCost, canUseVoice, fetchVoices,
  type ApiVoice, type LanguageId, type VoicePlan,
} from '@/lib/voices';
import {
  spendCredits, logGeneration, logApiRequest, PLAN_TEXT_LIMIT,
  type PlanId,
} from '@/lib/user-store';

/* ── Plan badge ────────────────────────────────────── */
const PLAN_BADGE: Record<string, { label: string; cls: string }> = {
  free:    { label: 'Free',    cls: 'bg-secondary text-muted-foreground' },
  monthly: { label: 'Pro',     cls: 'bg-brand-2/15 text-brand-2 font-semibold' },
  yearly:  { label: 'Pro Max', cls: 'bg-gradient-brand text-primary-foreground font-semibold' },
};

const GENDER_FLAG: Record<string, string> = { male: '♂', female: '♀' };

interface GenEntry {
  id: string;
  text: string;
  language: string;
  voiceName: string;
  audioUrl: string;
  createdAt: number;
}

const TTS_API = '/api/text-to-voice';
const ONE_HOUR = 60 * 60 * 1000;

const Sk = ({ className = '', style }: { className?: string; style?: CSSProperties }) => (
  <div className={`animate-shimmer rounded-2xl ${className}`} style={style} />
);

/* ═══════════════════════════════════════════════════
   Skeleton
═══════════════════════════════════════════════════ */
function GeneratorSkeleton() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Sk className="h-5 w-28 rounded-full" />
          <Sk className="h-10 w-80 rounded-2xl" />
          <Sk className="h-3.5 w-40 rounded-full" />
        </div>

        {/* Main card */}
        <div className="rounded-3xl border border-border bg-card overflow-hidden">
          {/* char counter row */}
          <div className="flex justify-end px-4 pt-3">
            <Sk className="h-5 w-20 rounded-full" />
          </div>
          {/* textarea area */}
          <div className="px-5 pt-2 pb-4 space-y-2.5">
            <Sk className="h-4 w-[72%] rounded-full" />
            <Sk className="h-4 w-[55%] rounded-full" />
            <Sk className="h-4 w-[63%] rounded-full" />
            <Sk className="h-4 w-[40%] rounded-full" style={{ opacity: 0.5 }} />
            <div className="h-16" />
          </div>
          {/* toolbar */}
          <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-secondary/30 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              {/* language pill */}
              <Sk className="h-[30px] w-[80px] rounded-full" />
              {/* voice pill */}
              <Sk className="h-[30px] w-[90px] rounded-full" />
            </div>
            {/* generate button */}
            <Sk className="h-[30px] w-[110px] rounded-full" />
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

/* ═══════════════════════════════════════════════════
   Constants — flags, avatar colors, plan sections
═══════════════════════════════════════════════════ */
const LANG_FLAG: Record<LanguageId, string>   = { en: '🇺🇸', bn: '🇧🇩', hi: '🇮🇳' };
const LANG_BG:   Record<LanguageId, string>   = { en: '#3b82f620', bn: '#22c55e20', hi: '#f9731620' };

/** Deterministic avatar color from a voice id string */
function voiceColor(id: string): string {
  const COLORS = ['#3b82f6','#f43f5e','#6366f1','#a855f7','#f97316','#14b8a6','#475569','#ec4899','#f59e0b','#10b981'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0x7fffffff;
  return COLORS[h % COLORS.length];
}

const PLAN_ORDER: VoicePlan[] = ['free', 'monthly', 'yearly'];

/* ── Emotions ────────────────────────────────────── */
type EmotionId = 'normal' | 'happy' | 'sad' | 'angry';
interface Emotion { id: EmotionId; label: string; description: string; color: string; emoji?: string; }
const EMOTIONS: Emotion[] = [
  { id: 'normal', label: 'Normal', description: 'Natural, balanced tone',  color: '#6366f1' },
  { id: 'happy',  label: 'Happy',  description: 'Upbeat and cheerful',      color: '#f59e0b' },
  { id: 'sad',    label: 'Sad',    description: 'Soft and somber',           color: '#3b82f6' },
  { id: 'angry',  label: 'Angry',  description: 'Strong and assertive',      color: '#ef4444' },
];

/* ── Animated emoji-face emotion SVG icons ───────────
   All icons: viewBox 0 0 40 40, size prop controls render size.
   Features are bold enough to read at 20 px and look great at 28 px.
─────────────────────────────────────────────────── */

/** 😐 Normal — calm neutral face, slow blink, gentle breathing */
function NormalIcon({ color = '#6366f1', size = 20 }: { color?: string; size?: number }) {
  return (
    <motion.svg viewBox="0 0 40 40" width={size} height={size} fill="none"
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      style={{ originX: '20px', originY: '20px' }}
    >
      {/* face */}
      <circle cx="20" cy="20" r="18" fill={color} fillOpacity="0.14" stroke={color} strokeWidth="2.4" />

      {/* left eye — blinks naturally */}
      <motion.rect x="11" y="15" width="6" height="6" rx="3" fill={color}
        animate={{ scaleY: [1, 0.1, 1, 1, 1] }}
        transition={{ duration: 4.5, times: [0, 0.05, 0.1, 0.55, 1], repeat: Infinity }}
        style={{ transformOrigin: '14px 18px' }}
      />
      {/* right eye — blinks slightly after */}
      <motion.rect x="23" y="15" width="6" height="6" rx="3" fill={color}
        animate={{ scaleY: [1, 0.1, 1, 1, 1] }}
        transition={{ duration: 4.5, times: [0, 0.05, 0.1, 0.55, 1], repeat: Infinity, delay: 0.07 }}
        style={{ transformOrigin: '26px 18px' }}
      />

      {/* flat straight mouth */}
      <motion.line x1="12" y1="28" x2="28" y2="28"
        stroke={color} strokeWidth="3" strokeLinecap="round"
        animate={{ y1: [28, 28.5, 28], y2: [28, 28.5, 28] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.svg>
  );
}

/** 😄 Happy — big smile, squint eyes, cheeks, cheerful bounce */
function HappyIcon({ color = '#f59e0b', size = 20 }: { color?: string; size?: number }) {
  return (
    <motion.svg viewBox="0 0 40 40" width={size} height={size} fill="none"
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* face */}
      <circle cx="20" cy="20" r="18" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="2.4" />

      {/* happy squint eyes — upward arcs (^_^) */}
      <motion.path d="M10 17 Q14 12 18 17" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none"
        animate={{ d: ['M10 17 Q14 12 18 17', 'M10 16 Q14 11 18 16'] }}
        transition={{ duration: 0.9, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />
      <motion.path d="M22 17 Q26 12 30 17" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none"
        animate={{ d: ['M22 17 Q26 12 30 17', 'M22 16 Q26 11 30 16'] }}
        transition={{ duration: 0.9, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />

      {/* wide U-shaped smile */}
      <motion.path d="M10 24 Q20 34 30 24" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none"
        animate={{ d: ['M10 24 Q20 34 30 24', 'M10 23 Q20 35 30 23'] }}
        transition={{ duration: 0.9, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />

      {/* rosy cheeks */}
      <ellipse cx="9" cy="26" rx="4" ry="2.5" fill={color} fillOpacity="0.32" />
      <ellipse cx="31" cy="26" rx="4" ry="2.5" fill={color} fillOpacity="0.32" />
    </motion.svg>
  );
}

/** 😢 Sad — frown, downcast eyes, falling teardrop, slow droop */
function SadIcon({ color = '#3b82f6', size = 20 }: { color?: string; size?: number }) {
  return (
    <motion.svg viewBox="0 0 40 40" width={size} height={size} fill="none"
      animate={{ y: [0, 1.5, 0] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* face */}
      <circle cx="20" cy="20" r="18" fill={color} fillOpacity="0.13" stroke={color} strokeWidth="2.4" />

      {/* sad inner brows — angled outward-down (opposite of angry) */}
      <path d="M10 13 Q14 15 18 13" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.55" />
      <path d="M22 13 Q26 15 30 13" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.55" />

      {/* heavy-lidded eyes — flat-bottom ovals */}
      <motion.ellipse cx="14" cy="19" rx="3.5" ry="3"
        fill={color}
        animate={{ ry: [3, 1.5, 3] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.ellipse cx="26" cy="19" rx="3.5" ry="3"
        fill={color}
        animate={{ ry: [3, 1.5, 3] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      {/* frown — inverted arc */}
      <path d="M11 30 Q20 23 29 30" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* falling teardrop from right eye */}
      <motion.path d="M27 23 Q25 28 27 31 Q29 28 27 23 Z" fill={color}
        animate={{ y: [0, 6, 0], opacity: [0.85, 0, 0.85] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeIn', delay: 0.8 }}
      />
    </motion.svg>
  );
}

/** 😠 Angry — V brows, squint eyes, tight scowl, head shake + red pulse */
function AngryIcon({ color = '#ef4444', size = 20 }: { color?: string; size?: number }) {
  return (
    <motion.svg viewBox="0 0 40 40" width={size} height={size} fill="none"
      animate={{ x: [0, -2, 2, -2, 2, 0] }}
      transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' }}
    >
      {/* face — pulses red when shaking */}
      <motion.circle cx="20" cy="20" r="18"
        fill={color}
        fillOpacity="0.15"
        stroke={color} strokeWidth="2.4"
        animate={{ fillOpacity: [0.15, 0.28, 0.15] }}
        transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 1.8 }}
      />

      {/* angry V eyebrows — thick, inward-angled */}
      <motion.path d="M9 13 L17 17" stroke={color} strokeWidth="3.2" strokeLinecap="round"
        animate={{ d: ['M9 13 L17 17', 'M9 11.5 L17 15.5'] }}
        transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />
      <motion.path d="M31 13 L23 17" stroke={color} strokeWidth="3.2" strokeLinecap="round"
        animate={{ d: ['M31 13 L23 17', 'M31 11.5 L23 15.5'] }}
        transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />

      {/* squinting angry eyes — flat ovals */}
      <ellipse cx="14" cy="21" rx="4" ry="2" fill={color} />
      <ellipse cx="26" cy="21" rx="4" ry="2" fill={color} />

      {/* tight wavy scowl */}
      <path
        d="M10 30 Q14 27 18 30 Q22 33 26 30 Q28 28 30 30"
        stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
    </motion.svg>
  );
}

function EmotionIcon({ id, color, size = 20 }: { id: EmotionId; color: string; size?: number }) {
  if (id === 'normal') return <NormalIcon color={color} size={size} />;
  if (id === 'happy')  return <HappyIcon  color={color} size={size} />;
  if (id === 'sad')    return <SadIcon    color={color} size={size} />;
  return                      <AngryIcon  color={color} size={size} />;
}

const PLAN_META: Record<string, {
  label: string;
  headingCls: string;
  badgeCls: string;
}> = {
  free: {
    label: 'Free',
    headingCls: 'text-muted-foreground',
    badgeCls:   'bg-secondary border-border text-muted-foreground',
  },
  monthly: {
    label: 'Pro',
    headingCls: 'text-brand-2',
    badgeCls:   'bg-brand-2/10 border-brand-2/30 text-brand-2 font-semibold',
  },
  yearly: {
    label: 'Pro Max',
    headingCls: 'text-brand',
    badgeCls:   'bg-gradient-brand border-transparent text-white font-semibold',
  },
};

/* ═══════════════════════════════════════════════════
   Language picker
═══════════════════════════════════════════════════ */
function LanguagePicker({
  value, onChange, compact = false,
}: { value: LanguageId; onChange: (id: LanguageId) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const active = LANGUAGES.find((l) => l.id === value)!;
  const close  = useCallback(() => setOpen(false), []);

  return (
    <>
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={compact
          ? `flex items-center h-[30px] gap-1 rounded-full border px-2.5 transition active:scale-[0.97] shrink-0 ${open ? 'border-brand-2 bg-brand-2/5' : 'border-border bg-secondary/60 hover:bg-secondary'}`
          : `flex sm:flex-1 items-center gap-1.5 sm:gap-2 rounded-[50px] border px-2.5 py-1.5 sm:px-4 sm:py-2.5 sm:justify-center [scroll-snap-align:start] transition hover:border-brand-2/60 active:scale-[0.98] ${open ? 'border-brand-2 bg-brand-2/5 ring-2 ring-brand-2/20' : 'border-border bg-card hover:bg-secondary/40'}`
        }
      >
        {compact ? (
          <>
            <span className="text-sm leading-none select-none">{LANG_FLAG[value]}</span>
            <span className="text-[11px] font-semibold whitespace-nowrap">{active.label}</span>
            <Icon name="chevron-down" size={10} className="shrink-0 text-muted-foreground" />
          </>
        ) : (
          <>
            <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-gradient-soft text-xs sm:text-sm">
              {LANG_FLAG[value]}
            </span>
            <span className="text-xs sm:text-sm font-semibold leading-tight whitespace-nowrap">{active.label}</span>
            <Icon name="chevron-down" size={12} className="shrink-0 text-muted-foreground" />
          </>
        )}
      </button>

      {/* Overlay */}
      <OverlayShell open={open} onClose={close} title="Choose Language">
        <div className="flex flex-col gap-2.5 p-4">
          {LANGUAGES.map((l) => {
            const sel = l.id === value;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => { onChange(l.id); close(); }}
                className={`
                  flex items-center gap-4 border p-4 text-left transition active:scale-[0.99]
                  ${sel
                    ? 'border-brand-2/40 bg-gradient-soft shadow-sm'
                    : 'border-border hover:bg-secondary/70'}
                `}
                style={{ borderRadius: '50px' }}
              >
                {/* Flag — no container */}
                <span className="shrink-0 text-3xl leading-none select-none">
                  {LANG_FLAG[l.id]}
                </span>

                {/* Info */}
                <span className="flex-1 min-w-0">
                  <span className="block text-base font-bold">{l.label}</span>
                </span>

                {/* Check / circle */}
                {sel ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white">
                    <Icon name="check" size={12} />
                  </span>
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border" />
                )}
              </button>
            );
          })}
        </div>
      </OverlayShell>
    </>
  );
}

/* ═════════════════���═════════════════════════════════
   Voice picker — premium overlay with plan sections
═══════════════════════════════════════════════════ */
function VoicePicker({
  value, onChange, userPlan, previewId, onTogglePreview, voices, compact = false, voicesLoading = false,
}: {
  value: string;
  onChange: (id: string) => void;
  userPlan: PlanId;
  previewId: string | null;
  onTogglePreview: (e: React.MouseEvent, v: ApiVoice) => void;
  voices: ApiVoice[];
  compact?: boolean;
  voicesLoading?: boolean;
}) {
  const [open, setOpen]     = useState(false);
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const activeVoice = voices.find((v) => v.voice_id === value) ?? voices[0];
  const close = useCallback(() => setOpen(false), []);

  const maleCount   = voices.filter((v) => v.gender === 'male').length;
  const femaleCount = voices.filter((v) => v.gender === 'female').length;

  /* filtered list, grouped by plan tier */
  const filtered = voices.filter((v) => gender === 'all' || v.gender === gender);
  const grouped  = PLAN_ORDER
    .map((plan) => ({ plan, items: filtered.filter((v) => v.plan === plan) }))
    .filter((g) => g.items.length > 0);

  const avatarBgFor = (id: string, locked: boolean) =>
    locked ? '#94a3b8' : voiceColor(id);

  return (
    <>
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={compact
          ? `flex items-center h-[30px] gap-1 rounded-full border px-2.5 transition active:scale-[0.97] min-w-0 ${open ? 'border-brand-2 bg-brand-2/5' : 'border-border bg-secondary/60 hover:bg-secondary'}`
          : `flex sm:flex-1 items-center gap-1.5 sm:gap-2 rounded-[50px] border px-2.5 py-1.5 sm:px-4 sm:py-2.5 sm:justify-center [scroll-snap-align:start] transition hover:border-brand-2/60 active:scale-[0.98] min-w-0 ${open ? 'border-brand-2 bg-brand-2/5 ring-2 ring-brand-2/20' : 'border-border bg-card hover:bg-secondary/40'}`
        }
      >
        {compact ? (
          voicesLoading ? (
            /* shimmer skeleton matching pill size */
            <span className="flex items-center gap-1.5 px-0.5">
              <span className="animate-shimmer h-5 w-5 rounded-full" />
              <span className="animate-shimmer h-2.5 w-14 rounded-full" />
            </span>
          ) : (
          <>
            {activeVoice?.profile_photo_url ? (
              <img src={activeVoice.profile_photo_url} alt={activeVoice.name} className="h-5 w-5 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: voiceColor(activeVoice?.voice_id ?? '') }}>
                {activeVoice?.name.charAt(0) ?? '?'}
              </span>
            )}
            <span className="text-[11px] font-semibold leading-tight truncate max-w-[80px]">
              {activeVoice?.name ?? 'Voice'}
            </span>
            <Icon name="chevron-down" size={10} className="shrink-0 text-muted-foreground" />
          </>
          )
        ) : (
          <>
            {activeVoice?.profile_photo_url ? (
              <img
                src={activeVoice.profile_photo_url}
                alt={activeVoice.name}
                className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-bold text-white shadow-sm"
                style={{ background: voiceColor(activeVoice?.voice_id ?? '') }}
              >
                {activeVoice?.name.charAt(0) ?? '?'}
              </span>
            )}
            <span className="text-xs sm:text-sm font-semibold leading-tight truncate max-w-[72px] sm:max-w-[120px]">
              {activeVoice?.name ?? 'Voice'}
            </span>
            <Icon name="chevron-down" size={12} className="shrink-0 text-muted-foreground" />
          </>
        )}
      </button>

      {/* Overlay */}
      <OverlayShell open={open} onClose={close} title="Choose Voice" badge={voices.length}>

        {/* ── Gender filter tabs ── */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="flex rounded-2xl border border-border bg-secondary/60 p-1 text-xs font-medium">
            {([
              { id: 'all',    label: 'All',      count: voices.length },
              { id: 'male',   label: '♂ Male',   count: maleCount },
              { id: 'female', label: '♀ Female', count: femaleCount },
            ] as const).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGender(g.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 transition
                  ${gender === g.id
                    ? 'bg-card text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'}`}
              >
                {g.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] leading-none font-bold
                  ${gender === g.id ? 'bg-gradient-brand text-white' : 'bg-border text-muted-foreground'}`}>
                  {g.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Voice list — loading skeleton ── */}
        {voicesLoading && (
          <div className="px-4 pb-5 space-y-2 pt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-border/60 px-3.5 py-3">
                {/* play btn */}
                <span className="animate-shimmer h-9 w-9 shrink-0 rounded-xl" />
                {/* avatar */}
                <span className="animate-shimmer h-9 w-9 shrink-0 rounded-xl" />
                {/* name + gender */}
                <span className="flex-1 space-y-1.5">
                  <span className="animate-shimmer block h-3 rounded-full" style={{ width: `${52 + (i % 3) * 18}%` }} />
                  <span className="animate-shimmer block h-2.5 w-12 rounded-full" />
                </span>
                {/* badge */}
                <span className="animate-shimmer h-5 w-10 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* ── Voice list — grouped by plan ── */}
        {!voicesLoading && <div className="px-4 pb-5 space-y-0.5">
          {grouped.map(({ plan, items }) => {
            const meta = PLAN_META[plan];
            return (
              <div key={plan}>
                {/* Plan section header */}
                <div className="flex items-center gap-2.5 py-3 sticky top-0 bg-card z-10">
                  <span className={`text-[11px] font-black uppercase tracking-[0.12em] ${meta.headingCls}`}>
                    {meta.label}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                  <span className={`text-[10px] rounded-full px-2 py-0.5 border leading-tight ${meta.badgeCls}`}>
                    {items.length} voice{items.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Voice cards */}
                <div className="flex flex-col gap-1.5">
                  {items.map((v) => {
                    const sel        = value === v.voice_id;
                    const locked     = !canUseVoice(userPlan, v.plan);
                    const previewing = previewId === v.voice_id;
                    const vMeta      = PLAN_META[v.plan];
                    const bg         = avatarBgFor(v.voice_id, locked);

                    return (
                      <div
                        key={v.voice_id}
                        role="button"
                        tabIndex={locked ? -1 : 0}
                        onClick={() => { if (!locked) { onChange(v.voice_id); close(); } }}
                        onKeyDown={(e) => e.key === 'Enter' && !locked && (onChange(v.voice_id), close())}
                        className={`
                          group flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition
                          ${locked
                            ? 'cursor-not-allowed border-border/40 bg-secondary/20 opacity-55'
                            : sel
                              ? 'cursor-pointer border-brand-2/50 bg-gradient-soft shadow-md'
                              : 'cursor-pointer border-border/60 hover:bg-secondary/60 hover:border-border hover:shadow-sm'}
                        `}
                      >
                        {/* Play / Pause button */}
                        <button
                          type="button"
                          title={previewing ? 'Stop' : 'Preview'}
                          onClick={(e) => { e.stopPropagation(); if (!locked) onTogglePreview(e, v); }}
                          disabled={locked || !v.play_audio_url}
                          tabIndex={-1}
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition
                            ${previewing
                              ? 'bg-gradient-brand text-white shadow-lg ring-2 ring-brand/30'
                              : sel
                                ? 'bg-brand-2/15 text-brand-2 hover:bg-brand-2/25'
                                : 'bg-secondary text-muted-foreground group-hover:bg-border group-hover:text-foreground'}
                            ${locked || !v.play_audio_url ? 'pointer-events-none opacity-40' : ''}`}
                        >
                          <Icon name={previewing ? 'pause' : 'play'} size={13} />
                        </button>

                        {/* Profile photo or colored initial */}
                        {v.profile_photo_url ? (
                          <img
                            src={v.profile_photo_url}
                            alt={v.name}
                            className={`h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm ${locked ? 'opacity-50 grayscale' : ''}`}
                          />
                        ) : (
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                            style={{ background: bg }}
                          >
                            {v.name.charAt(0)}
                          </span>
                        )}

                        {/* Name + details */}
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold leading-tight">{v.name}</span>
                          <span className="block text-[11px] text-muted-foreground mt-0.5">
                            {GENDER_FLAG[v.gender]} {v.gender}
                          </span>
                        </span>

                        {/* Right: plan badge + state indicator */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Plan badge — always visible */}
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] leading-tight border ${vMeta.badgeCls}`}>
                            {vMeta.label}
                          </span>

                          {/* Lock or checkmark */}
                          {locked ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-border text-muted-foreground">
                              <Icon name="lock" size={9} />
                            </span>
                          ) : sel ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-brand text-white">
                              <Icon name="check" size={9} />
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>}
      </OverlayShell>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   Emotion picker
═══════════════════════════════════════════════════ */
function EmotionPicker({
  value, onChange,
}: { value: EmotionId; onChange: (id: EmotionId) => void }) {
  const [open, setOpen] = useState(false);
  const active = EMOTIONS.find((e) => e.id === value)!;
  const close  = useCallback(() => setOpen(false), []);

  return (
    <>
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`
          flex sm:flex-1 items-center gap-1.5 sm:gap-2 rounded-[50px] border
          px-2.5 py-1.5 sm:px-4 sm:py-2.5
          sm:justify-center [scroll-snap-align:start]
          transition hover:border-brand-2/60 active:scale-[0.98]
          ${open ? 'border-brand-2 bg-brand-2/5 ring-2 ring-brand-2/20' : 'border-border bg-card hover:bg-secondary/40'}
        `}
      >
        <span
          className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${active.color}18` }}
        >
          <EmotionIcon id={active.id} color={active.color} size={18} />
        </span>
        <span className="text-xs sm:text-sm font-semibold leading-tight whitespace-nowrap">{active.label}</span>
        <Icon name="chevron-down" size={12} className="shrink-0 text-muted-foreground" />
      </button>

      {/* Overlay */}
      <OverlayShell open={open} onClose={close} title="Choose Emotion">
        <div className="flex flex-col gap-2.5 p-4">
          {EMOTIONS.map((em) => {
            const sel = em.id === value;
            return (
              <button
                key={em.id}
                type="button"
                onClick={() => { onChange(em.id); close(); }}
                className={`
                  flex items-center gap-4 rounded-2xl border p-4 text-left transition active:scale-[0.99]
                  ${sel
                    ? 'border-brand-2/40 bg-gradient-soft shadow-sm'
                    : 'border-border hover:bg-secondary/70'}
                `}
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm"
                  style={{ background: `${em.color}18` }}
                >
                  <EmotionIcon id={em.id} color={em.color} size={28} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-base font-bold">{em.label}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{em.description}</span>
                </span>
                {sel ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white">
                    <Icon name="check" size={12} />
                  </span>
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border" />
                )}
              </button>
            );
          })}
        </div>
      </OverlayShell>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   Mobile scroll hint — shows swipe tip then fades
═══════════════════════════════════════════════════ */
function ScrollRowHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {/* Right-edge gradient fade — always present while buttons overflow */}
      <div
        className="
          pointer-events-none absolute inset-y-0 right-0 w-10
          bg-gradient-to-l from-background to-transparent
          sm:hidden
        "
      />

      {/* Animated swipe tip */}
      <motion.div
        className="sm:hidden mt-2 flex items-center justify-center gap-2"
        initial={{ opacity: 1 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.6 }}
        aria-hidden="true"
      >
        {/* Sliding dot bar */}
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-[3px] rounded-full bg-muted-foreground/40"
              animate={{ width: i === 1 ? [8, 20, 8] : [14, 6, 14] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
            />
          ))}
        </div>

        {/* Swipe label */}
        <span className="text-[10px] font-medium text-muted-foreground/50 tracking-wide select-none">
          swipe to see all
        </span>

        {/* Bouncing arrow */}
        <motion.div
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon name="arrow-right" size={11} className="text-muted-foreground/50" />
        </motion.div>
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════ */
export default function GeneratorPage() {
  const { loading } = useAuth();
  if (loading) return <GeneratorSkeleton />;
  return <GeneratorContent />;
}

function GeneratorContent() {
  const { user, profile, refreshProfile } = useAuth();
  const [text, setText] = useState('');
  const [clearingText, setClearingText] = useState(false);
  const [lang, setLang] = useState<LanguageId>('bn');
  const [voiceId, setVoiceId] = useState('');
  const [voiceFilter, setVoiceFilter] = useState<'all' | 'male' | 'female'>('all');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [currentGen, setCurrentGen] = useState<{
    url: string; text: string; language: string; voiceName: string; emotion: string;
  } | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [history, setHistory] = useState<GenEntry[]>([]);
  const [historyPlayId, setHistoryPlayId] = useState<string | null>(null);
  const historyAudioRef = useRef<HTMLAudioElement | null>(null);
  const [now, setNow] = useState(() => Date.now());

  /* ── API voice list ── */
  const [voices, setVoices] = useState<ApiVoice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setVoicesLoading(true);
    setPreviewId(null);
    fetchVoices(lang)
      .then((list) => {
        if (cancelled) return;
        setVoices(list);
        setVoiceId((current) => list.some((voice) => voice.voice_id === current) ? current : (list[0]?.voice_id ?? ''));
      })
      .catch(() => {
        if (!cancelled) {
          setVoices([]);
          setVoiceId('');
        }
      })
      .finally(() => { if (!cancelled) setVoicesLoading(false); });
    return () => { cancelled = true; };
  }, [lang]);

  const cost      = creditCost(text);
  const credits   = profile?.credits ?? 0;
  const canAfford = credits >= cost;
  const activeLang  = LANGUAGES.find((l) => l.id === lang)!;
  const activeVoice = voices.find((v) => v.voice_id === voiceId) ?? null;
  const userPlan: PlanId = profile?.plan ?? 'free';
  const textLimit = PLAN_TEXT_LIMIT[userPlan];
  const isFree = userPlan === 'free';
  const isPaid = !isFree;

  const showFreeZero       = !!user && isFree && credits === 0;
  const showDailyExhausted = !!user && isPaid  && credits === 0;
  const hasZeroCredits     = showFreeZero || showDailyExhausted;

  const BST_OFFSET_MS = 6 * 60 * 60 * 1000;
  const bstNow = new Date(now + BST_OFFSET_MS);
  const nextBSTMidnightUTC = Date.UTC(
    bstNow.getUTCFullYear(), bstNow.getUTCMonth(),
    bstNow.getUTCDate() + 1, 0, 0, 0, 0,
  ) - BST_OFFSET_MS;
  const resetInMs = showDailyExhausted ? Math.max(0, nextBSTMidnightUTC - now) : null;

  useEffect(() => {
    if (!showDailyExhausted) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [showDailyExhausted]);

  useEffect(() => {
    const t = setInterval(() => {
      setHistory((prev) => {
        const fresh = prev.filter((g) => Date.now() - g.createdAt < ONE_HOUR);
        return fresh;
      });
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => {
    audioRef.current?.pause();
    historyAudioRef.current?.pause();
    previewAudioRef.current?.pause();
    window.speechSynthesis?.cancel();
  }, []);

  /* ── Voice preview — one at a time ── */
  const activePreviewId = useRef<string | null>(null);
  const previewRequestId = useRef(0);
  
  function stopVoicePreview() {
    previewRequestId.current += 1;
    const audio = previewAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audio.onerror = null;
    }
    previewAudioRef.current = null;
    activePreviewId.current = null;
    setPreviewId(null);
  }
  
  function toggleVoicePreview(e: React.MouseEvent, v: ApiVoice) {
    e.stopPropagation();
  
    if (activePreviewId.current === v.voice_id) {
      stopVoicePreview();
      return;
    }
  
    // Always stop the previous voice before starting a new preview.
    stopVoicePreview();
    if (!v.play_audio_url) return;
  
    const requestId = previewRequestId.current;
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audio.src = v.play_audio_url;
    previewAudioRef.current = audio;
    activePreviewId.current = v.voice_id;
    setPreviewId(v.voice_id);
  
    const finish = () => {
      if (previewRequestId.current === requestId && activePreviewId.current === v.voice_id) {
        previewAudioRef.current = null;
        activePreviewId.current = null;
        setPreviewId(null);
      }
    };
    audio.onended = finish;
    audio.onerror = finish;
    audio.play().catch(finish);
  }


  function parseDurationMs(value?: string): number | null {
    if (!value) return null;
    const match = value.match(/(?:(\\d+)m)?\\s*(?:(\\d+(?:\\.\\d+)?)s)?/i);
    if (!match || (!match[1] && !match[2])) return null;
    return ((Number(match[1] ?? 0) * 60) + Number(match[2] ?? 0)) * 1000;
  }

  function fmtCountdown(ms: number): string {
    const s   = Math.floor(ms / 1000);
    const h   = Math.floor(s / 3600);
    const m   = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  /* ── Generate ── */
  async function generate() {
    setError('');
    if (!user)          { setError('Please log in to generate voice.'); return; }
    if (!text.trim())   { setError('Please enter some text.'); return; }
    if (hasZeroCredits) return;
    if (!canAfford)     { setError('Not enough credits. Shorten your text or upgrade.'); return; }
    if (!activeVoice?.voice_id) { setError('Please select a voice first.'); return; }

    const selectedVoiceId = activeVoice.voice_id;
    setGenerating(true);
    audioRef.current?.pause();
    setAudioPlaying(false);

    try {
      const reqStart = Date.now();
      const resp = await fetch(TTS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          language_code: activeLang.id,
          speaker: selectedVoiceId,
        }),
      });

      const result = await resp.json();
      if (!resp.ok || !Array.isArray(result.audios) || !result.audios[0]) {
        throw new Error(result.error ?? 'Voice generation failed. Please try again.');
      }

      const audioUrl = result.audios[0].startsWith('data:')
        ? result.audios[0]
        : `data:audio/wav;base64,${result.audios[0]}`;
      const durationMs: number = parseDurationMs(result.audio_durations?.[0]) ?? (Date.now() - reqStart);

      const voiceName = activeVoice?.name ?? 'Unknown';
      const gen = { url: audioUrl, text: text.trim(), language: activeLang.label, voiceName, emotion: '' };
      setCurrentGen(gen);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setAudioPlaying(true);
      audio.play().catch(() => {});
      audio.onended = () => setAudioPlaying(false);

      setHistory((prev) => [{
        id: `${Date.now()}`,
        text: text.trim(),
        language: activeLang.label,
        voiceName,
        audioUrl,
        createdAt: Date.now(),
      }, ...prev]);

      setGenerating(false);

      /* ── Animated textarea clear ── */
      const snapshot = text;
      setClearingText(true);
      let remaining = snapshot;
      const chunkSize = Math.max(2, Math.ceil(snapshot.length / 18));
      const intervalId = setInterval(() => {
        remaining = remaining.slice(0, -chunkSize);
        setText(remaining);
        if (remaining.length === 0) {
          clearInterval(intervalId);
          setClearingText(false);
        }
      }, 40);

      try {
        await spendCredits(user.uid, cost);
        await logGeneration(user.uid, {
          text: text.slice(0, 200),
          language: activeLang.label,
          voice: voiceName,
          cost,
          audioUrl,
        });
        await logApiRequest(user.uid, {
          text: text.slice(0, 200),
          language: activeLang.id,
          voiceId: activeVoice?.voice_id ?? '',
          success: true,
          durationMs,
          userName: profile?.name || profile?.username || user.email || '',
          username: profile?.username || '',
          userPhotoURL: profile?.photoURL || '',
        });
        await refreshProfile();
      } catch { /* non-fatal */ }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Something went wrong.';
      setError(errMsg);
      setGenerating(false);
      // log failed request (non-fatal)
      if (user) {
        logApiRequest(user.uid, {
          text: text.slice(0, 200),
          language: activeLang.id,
          voiceId: activeVoice?.voice_id ?? '',
          success: false,
          error: errMsg,
          durationMs: 0,
          userName: profile?.name || profile?.username || user.email || '',
          username: profile?.username || '',
          userPhotoURL: profile?.photoURL || '',
        }).catch(() => {});
      }
    }
  }

  function toggleCurrentAudio() {
    const a = audioRef.current;
    if (!a) return;
    if (audioPlaying) { a.pause(); setAudioPlaying(false); }
    else { a.play().catch(() => {}); setAudioPlaying(true); a.onended = () => setAudioPlaying(false); }
  }

  function download(url: string, textSnippet: string) {
    const name = textSnippet.slice(0, 30).replace(/[^\w\u0080-\uFFFF\s]/g, '').trim() || 'voice';
    const a = document.createElement('a');
    a.href = url; a.download = `${name}.wav`; a.target = '_blank'; a.click();
  }

  function toggleHistoryPlay(item: GenEntry) {
    if (historyPlayId === item.id) {
      historyAudioRef.current?.pause(); setHistoryPlayId(null);
    } else {
      historyAudioRef.current?.pause();
      const a = new Audio(item.audioUrl);
      historyAudioRef.current = a;
      a.play().catch(() => {}); setHistoryPlayId(item.id);
      a.onended = () => setHistoryPlayId(null);
    }
  }

  /* ── Render ── */
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl">

        {/* ── Header ── */}
        <div className="text-center px-2">
          <h1 className="text-balance text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
            Turn any text into a{' '}
            <span className="bg-[linear-gradient(-45deg,#ec5252,#6e1a52)] bg-clip-text text-transparent">
              natural, lifelike voice
            </span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            বাংলা · English · Hindi
          </p>
        </div>

        {/* ── Guest banner ── */}
        {!user && (
          <CutPanel
            tone="soft"
            stroke="url(#cut-brand-gradient)"
            className="mt-6 w-full"
            contentClassName="bg-gradient-to-br from-[#fff7f7] to-[#f8eef2] px-5 py-4"
          >
            <div className="flex w-full flex-row items-center justify-between gap-4">
              <p className="min-w-0 flex-1 whitespace-nowrap text-[clamp(0.68rem,2.8vw,1rem)] text-foreground">
                Log in to generate and download your audio.
              </p>
              <Link href="/login" className="shrink-0">
                <CutButton variant="primary" className="px-5 py-2.5 text-sm font-semibold !text-white">
                  Log In
                </CutButton>
              </Link>
            </div>
          </CutPanel>
        )}

        {/* ── Photo-style textarea card ── */}
        <CutPanel
          tone="card"
          stroke="url(#cut-brand-gradient)"
          className={`mt-8 w-full ${error ? 'ring-2 ring-destructive/20' : ''}`}
          contentClassName="bg-white px-5 pb-5 pt-5 sm:px-8 sm:pb-8 sm:pt-6"
        >
          {/* Text label and character counter */}
          <div className="flex items-center justify-between px-1 pb-3">
            <span className="text-base font-semibold text-slate-800 sm:text-lg">Your Text</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
              text.length >= textLimit
                ? 'bg-destructive/15 text-destructive'
                : text.length > textLimit * 0.8
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-secondary/80 text-muted-foreground'
            }`}>
              {text.length.toLocaleString()} / {textLimit.toLocaleString()}
            </span>
          </div>

          {/* Scrollable textarea */}
          <CutPanel tone="card" stroke="url(#cut-brand-gradient)" className="w-full" contentClassName="bg-white">
          <textarea
            maxLength={textLimit}
            placeholder={activeLang.placeholder}
            value={text}
            onChange={(e) => { if (!clearingText) setText(e.target.value); }}
            readOnly={clearingText}
            className={`
              pv-textarea
              w-full resize-none bg-transparent
              px-5 pt-2 pb-3
              text-sm leading-relaxed outline-none
              placeholder:text-muted-foreground/40
              min-h-[180px] sm:min-h-[210px] max-h-[320px]
              overflow-y-auto transition-opacity duration-75
              ${clearingText ? 'text-destructive/70 select-none cursor-default' : ''}
            `}
          />
          </CutPanel>

          {/* Language and voice controls */}
          <div className="mt-7 flex flex-col gap-7">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800 sm:text-lg">Select Language</h2>
              </div>
              <CutPanel tone="card" stroke="url(#cut-brand-gradient)" className="w-full" contentClassName="bg-white p-2 sm:p-3">
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGES.map((item) => {
                    const selected = lang === item.id;
                    return <CutButton key={item.id} type="button" variant={selected ? 'primary' : 'light'} onClick={() => setLang(item.id)} className="min-h-11 w-full px-2 text-xs sm:text-sm">
                      <span>{LANG_FLAG[item.id]}</span><span>{item.label}</span>
                    </CutButton>;
                  })}
                </div>
              </CutPanel>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-800 sm:text-lg">Voice List</h2>
                <div className="flex gap-2">
                  {(['all', 'male', 'female'] as const).map((filter) => {
                    const active = voiceFilter === filter;
                    return (
                      <CutButton
                        key={filter}
                        type="button"
                        variant={active ? 'primary' : 'light'}
                        onClick={() => setVoiceFilter(filter)}
                        className={`h-8 min-w-[52px] px-3 py-1 text-[11px] font-semibold capitalize sm:min-w-[60px] sm:text-xs ${active ? '!text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                      >
                        {filter}
                      </CutButton>
                    );
                  })}
                </div>
              </div>
              <div className="-mx-1 flex min-h-16 gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory">
                {voicesLoading ? (
                  <p className="voice-loading-text px-1 py-4 text-sm font-semibold">Voice founding please wait<span className="loading-dots" aria-hidden="true">...</span></p>
                ) : voices.filter((voice) => voiceFilter === 'all' || voice.gender === voiceFilter).length === 0 ? (
                  <p className="voice-loading-text px-1 py-4 text-sm font-semibold">No voice found</p>
                ) : voices.filter((voice) => voiceFilter === 'all' || voice.gender === voiceFilter).slice(0, 20).map((voice) => <div role="button" tabIndex={0} key={voice.voice_id} onClick={() => setVoiceId(voice.voice_id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setVoiceId(voice.voice_id); }} className="w-[148px] shrink-0 snap-start text-left sm:w-[168px]">
                <CutPanel tone="card" stroke="url(#cut-brand-gradient)" className="w-full" contentClassName={`p-2 ${voiceId === voice.voice_id ? 'bg-[linear-gradient(-45deg,#ec5252,#6e1a52)] text-white' : 'bg-white text-slate-800'}`}>
                  <div className="flex items-center gap-1.5">
                    {voice.profile_photo_url ? <img src={voice.profile_photo_url} alt={voice.name} className="h-7 w-7 rounded-full object-cover" /> : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ec5252] to-[#6e1a52] text-xs font-bold text-white">{voice.name.charAt(0)}</span>}
                    <span className={`min-w-0 flex-1 whitespace-nowrap text-xs font-semibold sm:text-sm ${voiceId === voice.voice_id ? 'text-white' : 'text-slate-800'}`}>{voice.name}</span>
                    <CutButton type="button" variant="primary" onClick={(event) => onTogglePreview(event, voice)} className="h-7 w-7 min-w-7 shrink-0 px-0 py-0 !text-white [&_svg]:!text-white [&_svg]:opacity-100"><Icon name={previewId === voice.voice_id ? 'pause' : 'play'} size={12} className="!text-white" /></CutButton>
                  </div>
                </CutPanel>
              </div>)}
              </div>
            </section>
          </div>

          {/* Generate button */}
            <div className="mt-5 flex items-center shrink-0">
              {/* Generate button — three-part: [credit | divider | generate] */}
              <CutButton
                type="button"
                variant="primary"
                onClick={generate}
                disabled={generating || !text.trim() || !activeVoice?.voice_id || (hasZeroCredits && !!user)}
                className="mx-auto min-h-12 w-[250px] max-w-full px-6 text-sm font-semibold !text-white"
              >
                {generating ? 'Generating voice...' : hasZeroCredits && user ? 'Upgrade' : 'Generate Voice'}
              </CutButton>
            </div>
        </CutPanel>

        {/* ── Zero-credit banners ── */}
        {showFreeZero && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#ec5252]/30 bg-gradient-to-br from-[#ec5252]/5 via-[#b03070]/5 to-[#6e1a52]/5">
            <div className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Icon name="bolt" size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-amber-900 leading-tight">You have 0 credits</p>
                <p className="mt-0.5 text-xs text-amber-700/80">Upgrade your plan to keep generating.</p>
              </div>
              <Link href="/plans">
                <span className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-brand px-4 py-2 text-xs font-semibold text-white whitespace-nowrap transition hover:opacity-90 active:scale-[0.97]">
                  Upgrade <Icon name="arrow-right" size={12} />
                </span>
              </Link>
            </div>
            <div className="h-1 w-full bg-gradient-brand opacity-60" />
          </div>
        )}

        {showDailyExhausted && (
          <div className="mt-3 rounded-2xl border border-brand/20 bg-gradient-to-br from-[#ec5252]/5 via-[#b03070]/5 to-[#6e1a52]/5 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-2/10 text-brand-2">
                <Icon name="clock" size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-tight">Daily credits exhausted</p>
                {resetInMs !== null && resetInMs > 0 ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Resets in <span className="font-semibold text-brand-2">{fmtCountdown(resetInMs)}</span>
                  </p>
                ) : resetInMs === 0 ? (
                  <p className="mt-0.5 text-xs text-emerald-600 font-medium">Credits ready — refresh!</p>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground">Resets at midnight BD time.</p>
                )}
              </div>
              {resetInMs === 0 ? (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-brand px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap transition hover:opacity-90"
                >
                  <Icon name="refresh" size={12} /> Refresh
                </button>
              ) : (
                <Link href="/plans">
                  <span className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-brand px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap transition hover:opacity-90">
                    <Icon name="plus" size={12} /> Buy Credits
                  </span>
                </Link>
              )}
            </div>
          </div>
        )}

        {error && (
          <div
            className="mt-3 flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(236,82,82,0.10) 0%, rgba(110,26,82,0.08) 100%)',
              border: '1px solid rgba(236,82,82,0.28)',
              boxShadow: '0 2px 12px rgba(236,82,82,0.10)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            {/* Icon */}
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(-45deg, #ec5252, #6e1a52)' }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <circle cx="12" cy="16" r="0.6" fill="white" stroke="none" />
              </svg>
            </span>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight" style={{ background: 'linear-gradient(-45deg, #ec5252, #6e1a52)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {error}
              </p>
            </div>

            {/* Dismiss */}
            <button
              type="button"
              onClick={() => setError('')}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition hover:bg-destructive/15 active:scale-90"
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Result player ── */}
        {currentGen && (
          <CutPanel
            tone="brand"
            stroke="oklch(1 0 0 / 0.55)"
            className="mt-6 w-full"
            contentClassName="overflow-hidden bg-[linear-gradient(-45deg,#ec5252,#6e1a52)] p-5 sm:p-6"
          >
            {/* Waveform animation */}
            <div className="mb-4 flex items-end justify-center gap-1 h-8">
              {Array.from({ length: 14 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-white/60 eq-bar"
                  style={{
                    height: `${30 + (i % 3) * 25 + (i % 5) * 10}%`,
                    animationDelay: `${(i * 0.11).toFixed(2)}s`,
                    animationPlayState: audioPlaying ? 'running' : 'paused',
                  }}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                <Icon name="soundwave" size={20} className="text-white" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">Voice generated!</p>
                <p className="mt-0.5 text-xs text-white/70 truncate">
                  {currentGen.language} · {currentGen.voiceName}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <CutButton
                type="button"
                variant="primary"
                onClick={toggleCurrentAudio}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium !text-white sm:px-5"
              >
                <Icon name={audioPlaying ? 'pause' : 'play'} size={16} className="!text-white" />
                {audioPlaying ? 'Pause' : 'Play again'}
              </CutButton>
              <CutButton
                type="button"
                variant="primary"
                onClick={() => download(currentGen.url, currentGen.text)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium !text-white sm:px-5"
              >
                <Icon name="download" size={16} className="!text-white" /> Download
              </CutButton>
            </div>
          </CutPanel>
        )}


      </div>
    </SiteShell>
  );
}
