import type { ReactNode } from 'react';

/**
 * Premium "7-cut" submit button — 4 chamfered corners plus 3 inward
 * notch cuts (right edge, bottom edge, left edge), matching the
 * angular-cut language of the input frames (see cut-frame.tsx) at a
 * more elaborate tier. The fill is drawn as a clip-path layer (so it
 * hugs the exact cut shape at any width) and the border is a separate
 * SVG stroke on top, kept to a crisp 1px regardless of the button's
 * aspect ratio via `vectorEffect="non-scaling-stroke"`.
 *
 * The button never stretches full width — it sizes to its own label +
 * icon via padding, so it must be placed inside a centered wrapper
 * (e.g. `self-center` on a flex-column form).
 */
const BUTTON_CUT_PATH =
  'M9.7 0.7 L90.3 0.7 L99.3 9.7 L99.3 45 L95.3 45 L95.3 55 L99.3 55 L99.3 90.3 L90.3 99.3 L60 99.3 L60 95.3 L50 95.3 L50 99.3 L9.7 99.3 L0.7 90.3 L0.7 55 L4.7 55 L4.7 45 L0.7 45 L0.7 9.7 Z';
const BUTTON_CUT_CLIP_PATH =
  'polygon(9.7% 0.7%, 90.3% 0.7%, 99.3% 9.7%, 99.3% 45%, 95.3% 45%, 95.3% 55%, 99.3% 55%, 99.3% 90.3%, 90.3% 99.3%, 60% 99.3%, 60% 95.3%, 50% 95.3%, 50% 99.3%, 9.7% 99.3%, 0.7% 90.3%, 0.7% 55%, 4.7% 55%, 4.7% 45%, 0.7% 45%, 0.7% 9.7%)';

function ArrowRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="relative z-10 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

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
      className={`group relative inline-flex self-center items-center justify-center gap-2.5 px-8 py-3.5 text-sm font-semibold text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
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
          <span className="relative z-10 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <span className="relative z-10 whitespace-nowrap">{loadingLabel ?? label}</span>
        </>
      ) : (
        <>
          <span className="relative z-10 whitespace-nowrap">{label}</span>
          <ArrowRightIcon />
        </>
      )}
    </button>
  );
}

export default CutSubmitButton;
