import { useId, type ReactNode } from 'react';
import { CUT_FRAME_PATH, CUT_FRAME_CLIP_PATH } from '@/components/cut-frame';

/**
 * Premium loading indicator for the cut-corner buttons — a dual-layer SVG
 * spinner instead of a plain CSS border-spinner. An outer ring sweeps a
 * brand-gradient arc (rotating), a faint full-opacity track sits underneath
 * it for depth, and a soft pulsing core dot sits at the center for a more
 * "alive" premium feel. Colors are drawn from the same diagonal gradient
 * used by the button/badge fills (#ec5252 → #6e1a52).
 */
function CutSpinner({ size = 18 }: { size?: number }) {
  const gradId = useId();
  return (
    <svg
      className="relative z-10 shrink-0"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      {/* Faint full track */}
      <circle cx="12" cy="12" r="9.5" stroke="oklch(1 0 0 / 0.22)" strokeWidth="2.4" />
      {/* Sweeping gradient arc */}
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke={`url(#${gradId})`}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="34 60"
        style={{ transformOrigin: '12px 12px', animation: 'pv-cut-spin 0.9s linear infinite' }}
      />
      {/* Pulsing core */}
      <circle
        cx="12"
        cy="12"
        r="2.4"
        fill="oklch(1 0 0 / 0.9)"
        style={{ transformOrigin: '12px 12px', animation: 'pv-cut-spin-pulse 1.1s ease-in-out infinite' }}
      />
    </svg>
  );
}

/**
 * Premium "cut-corner" submit button — reuses the exact same primary
 * cut-frame shape (CUT_FRAME_PATH / CUT_FRAME_CLIP_PATH) as the input
 * fields and the Google button, so every element on the Login/Signup
 * forms shares one consistent cut language. The fill is drawn as a
 * clip-path layer (so it hugs the exact cut shape at any width) and
 * the border is a separate SVG stroke on top, kept to a crisp 1px
 * regardless of the button's aspect ratio via
 * `vectorEffect="non-scaling-stroke"`.
 *
 * The button spans the full width of the form (matching the input
 * fields' width) and shares their h-14 height, so it must be placed
 * inside the same flex-column form as the fields.
 */
const BUTTON_CUT_PATH = CUT_FRAME_PATH;
const BUTTON_CUT_CLIP_PATH = CUT_FRAME_CLIP_PATH;

export function CutSubmitButton({
  label,
  loading = false,
  loadingLabel,
  disabled = false,
  type = 'submit',
  onClick,
  className = '',
}: {
  label: ReactNode;
  loading?: boolean;
  loadingLabel?: ReactNode;
  disabled?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`group relative flex h-14 w-full shrink-0 items-center justify-center gap-2.5 text-sm font-semibold text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {/* Fill — clipped to the exact 3-cut shape, so it hugs the border precisely */}
      <span
        className="absolute inset-0"
        style={{
          clipPath: BUTTON_CUT_CLIP_PATH,
          background: 'linear-gradient(-45deg, #ec5252, #6e1a52)',
          boxShadow: '0 6px 24px -8px oklch(0.42 0.16 350 / 0.55)',
        }}
      />

      {/* Hover sheen, clipped to the same shape */}
      <span
        className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-500 group-hover:translate-x-full"
        style={{ clipPath: BUTTON_CUT_CLIP_PATH }}
      />

      {/* 1px cut-corner border, crisp at any aspect ratio */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={BUTTON_CUT_PATH} fill="none" stroke="oklch(1 0 0 / 0.32)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>

      {loading ? (
        <>
          <CutSpinner />
          <span className="relative z-10 whitespace-nowrap">{loadingLabel ?? label}</span>
        </>
      ) : (
        <span className="relative z-10 whitespace-nowrap">{label}</span>
      )}
    </button>
  );
}

export default CutSubmitButton;
