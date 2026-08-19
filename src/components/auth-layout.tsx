import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { CUT_FRAME_PATH } from '@/components/cut-frame';

/* ─────────────────────────────────────────────
   Centered logo — favicon.png + wordmark
───────────────────────────────────────────── */
export function AuthLogo() {
  return (
    <Link href="/" className="flex flex-col items-center gap-2 group">
      <img
        src="/favicon.png"
        alt="Perfectory Voice"
        className="h-14 w-14 rounded-2xl object-contain transition-transform duration-200 group-hover:scale-105"
      />
    </Link>
  );
}

/* ─────────────────────────────────────────────
   Right visual panel — voice/TTS themed
───────────────────────────────────────────── */
function VoiceVisualPanel() {
  return (
    <div
      className="relative hidden min-h-[250px] flex-1 flex-col justify-between overflow-hidden sm:min-h-[320px] lg:flex lg:min-h-[560px]"
      style={{
        background: 'linear-gradient(145deg, rgba(35,24,48,.98), rgba(110,39,82,.96) 58%, rgba(236,82,82,.9))',
      }}
    >
      {/* Radial glow blobs */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 70% 30%, oklch(0.50 0.20 22 / 0.18) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 30% 80%, oklch(0.42 0.16 350 / 0.22) 0%, transparent 65%)',
        }}
      />

      {/* Grid texture overlay */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Logo top-left */}
      <div className="relative z-10 p-8">
        <div className="flex items-center gap-2.5">
          <img
            src="/favicon.png"
            alt="Perfectory Voice"
            className="h-8 w-8 rounded-xl object-contain"
          />
        </div>
      </div>

      <img src="/signup-voice-visual.png" alt="Studio microphone for voice generation" className="absolute inset-0 h-full w-full object-cover opacity-75 mix-blend-screen" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#24172f]/95 via-[#5d2656]/35 to-transparent" />

      {/* Central visual */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 pb-4">
        {/* Waveform visualizer */}
        <div className="mb-8 flex items-end gap-[3px]" style={{ height: 72 }}>
          {[28,40,56,64,72,60,48,72,64,52,68,44,60,36,50,72,58,42,66,38,54,70,46,62,34].map((h, i) => (
            <span
              key={i}
              style={{
                width: 4,
                height: h,
                borderRadius: 3,
                background: `linear-gradient(to top, oklch(0.60 0.18 22 / 0.9), oklch(0.78 0.18 350 / 0.7))`,
                animationName: 'pvBar',
                animationDuration: `${0.6 + (i % 5) * 0.18}s`,
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDirection: 'alternate',
                animationDelay: `${(i * 0.07) % 0.8}s`,
              }}
            />
          ))}
        </div>

        {/* Headline */}
        <h2 className="mb-3 text-center text-2xl font-bold leading-snug text-white/95">
          Turn your text into
          <br />
          <span style={{ background: 'linear-gradient(90deg, oklch(0.85 0.18 22), oklch(0.80 0.18 350))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            natural voice instantly
          </span>
        </h2>
        <p className="mb-10 text-center text-sm leading-relaxed text-white/50">
          AI-powered voices in Bangla, English &amp; Hindi.<br />Perfect for creators, teachers &amp; storytellers.
        </p>

        {/* Feature chips */}
        <div className="flex flex-wrap justify-center gap-2.5">
          {[
            { icon: <SvgMicIcon />, label: 'Natural Voices' },
            { icon: <SvgGlobeIcon />, label: '3 Languages' },
            { icon: <SvgBoltIcon />, label: 'Instant Generation' },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white/80"
              style={{
                background: 'oklch(1 0 0 / 0.07)',
                border: '1px solid oklch(1 0 0 / 0.12)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="opacity-80">{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom floating card */}
      <div className="relative z-10 mx-8 mb-8">
        <div
          className="flex items-center gap-4 rounded-2xl p-4"
          style={{
            background: 'oklch(1 0 0 / 0.06)',
            border: '1px solid oklch(1 0 0 / 0.10)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Mini waveform */}
          <div className="flex shrink-0 items-end gap-[2px]" style={{ height: 28 }}>
            {[10,18,22,14,24,18,12,22,16,20].map((h, i) => (
              <span
                key={i}
                style={{
                  width: 3, height: h, borderRadius: 2,
                  background: 'linear-gradient(to top, oklch(0.60 0.18 22), oklch(0.80 0.16 350))',
                  animationName: 'pvBar',
                  animationDuration: `${0.5 + (i % 4) * 0.15}s`,
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationDirection: 'alternate',
                  animationDelay: `${(i * 0.09) % 0.6}s`,
                }}
              />
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/90 truncate">Sample: English · Natural</p>
            <p className="mt-0.5 text-[10px] text-white/40">Generating in real-time…</p>
          </div>
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'linear-gradient(135deg, oklch(0.26 0.10 335), oklch(0.60 0.18 22))' }}
          >
            <SvgPlayIcon />
          </div>
        </div>
      </div>

      {/* CSS animation keyframes */}
      <style>{`
        @keyframes pvBar {
          from { transform: scaleY(0.35); opacity: 0.5; }
          to   { transform: scaleY(1);    opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

/* ── Tiny inline SVG icons ── */
function SvgMicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}
function SvgGlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
    </svg>
  );
}
function SvgBoltIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function SvgPlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   AuthLayout — main export
───────────────────────────────────────────── */
interface AuthLayoutProps {
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center overflow-x-hidden bg-white p-0 lg:p-8"
    >
      {/* Outer card — holds both panels. On desktop it swaps the rounded,
          shadowed card for the same primary cut-corner frame used by the
          inputs/buttons: border-radius 0, no shadow, clipped to the cut
          shape with an SVG stroke on top. Mobile stays a plain flat sheet. */}
      <div
        className="pv-auth-shell relative w-full max-w-6xl overflow-hidden rounded-none border-0 bg-white shadow-none backdrop-blur-xl lg:flex lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-white/35 lg:shadow-none"
        style={{ minHeight: 580 }}
      >
        {/* Desktop-only cut-frame outline, same primary geometry as the inputs */}
        <svg
          className="pointer-events-none absolute inset-0 z-20 hidden h-full w-full lg:block"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d={CUT_FRAME_PATH}
            fill="none"
            stroke="oklch(0.15 0 0 / 0.85)"
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* ── Left: form panel ── */}
        <div
          className="relative z-10 flex w-full flex-1 flex-col items-center justify-center bg-white px-5 py-8 text-center backdrop-blur-xl sm:px-10 sm:py-10 lg:max-w-[53%] lg:bg-white/65 lg:px-12"
          style={{ zIndex: 1 }}
        >
          {/* Logo — favicon.png, centered */}
          <div className="mb-6">
            <AuthLogo />
          </div>

          {/* Heading */}
          <div className="mb-7 w-full">
            <h1 className="flex flex-wrap items-center justify-center gap-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-[1.65rem]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>

          {/* Form content from page — left-align inputs inside centered wrapper */}
          <div className="w-full text-left">{children}</div>

          {/* Back to home */}
          <div className="mt-8 w-full text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 transition hover:text-gray-600"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Back to home
            </Link>
          </div>
        </div>

        {/* ── Right: visual panel ── */}
        <VoiceVisualPanel />
      </div>
    </div>
  );
}
