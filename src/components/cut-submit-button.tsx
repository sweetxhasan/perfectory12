import type { ReactNode } from 'react';
import { CUT_FRAME_PATH, CUT_FRAME_CLIP_PATH } from '@/components/cut-frame';

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
          <span className="relative z-10 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <span className="relative z-10 whitespace-nowrap">{loadingLabel ?? label}</span>
        </>
      ) : (
        <span className="relative z-10 whitespace-nowrap">{label}</span>
      )}
    </button>
  );
}

export default CutSubmitButton;
