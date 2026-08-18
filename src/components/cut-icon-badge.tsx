import type { ReactNode } from 'react';

/**
 * Premium "4-cut" icon container — a chamfered square (all four corners cut)
 * used to frame small status icons (valid checkmark, duplicate/info notice)
 * next to form fields. Matches the angular-cut language of the input frames.
 */
const BADGE_CUT_CLIP_PATH = 'polygon(26% 0%, 74% 0%, 100% 26%, 100% 74%, 74% 100%, 26% 100%, 0% 74%, 0% 26%)';
const BADGE_CUT_PATH = 'M26 0.9 L74 0.9 L99.1 26 L99.1 74 L74 99.1 L26 99.1 L0.9 74 L0.9 26 Z';

export type CutIconVariant = 'valid' | 'info';

const VARIANT_COLOR: Record<CutIconVariant, string> = {
  valid: 'oklch(0.60 0.15 152)',
  info: 'oklch(0.64 0.16 70)',
};

export function CutIconBadge({
  variant,
  size = 26,
  children,
}: {
  variant: CutIconVariant;
  size?: number;
  children: ReactNode;
}) {
  const color = VARIANT_COLOR[variant];
  return (
    <span
      className="pv-icon-badge relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, color }}
    >
      <span
        className="pv-icon-badge-bg absolute inset-0"
        style={{ clipPath: BADGE_CUT_CLIP_PATH, background: 'color-mix(in oklch, currentColor 12%, var(--background))' }}
      />
      <svg className="pv-icon-badge-frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={BADGE_CUT_PATH} fill="none" stroke="currentColor" strokeWidth="6" />
      </svg>
      <span className="relative z-10 flex items-center justify-center">{children}</span>
    </span>
  );
}

export default CutIconBadge;
