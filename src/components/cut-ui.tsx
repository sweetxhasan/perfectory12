import type { CSSProperties, ReactNode } from 'react';

/**
 * Pixel-based cut-corner (chamfered) clip-path — the same "premium cut-frame"
 * idea already used on the Login/Signup forms (see cut-frame.tsx), generalized
 * with fixed-px corners so it scales cleanly to any small UI element: header
 * buttons, nav pills, dropdown panels, sidebar cards. Percentage-based paths
 * (like CUT_FRAME_PATH) distort on very short/wide elements, so header/sidebar
 * chrome uses this px variant instead.
 */
export function cutClipPath(cut: number) {
  const c = Math.max(cut, 0);
  return `polygon(${c}px 0, calc(100% - ${c}px) 0, 100% ${c}px, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, ${c}px 100%, 0 calc(100% - ${c}px), 0 ${c}px)`;
}

export const CUT_BORDER = 1.5;

export type CutVariant = 'primary' | 'outline' | 'ghost';

/**
 * Decorative cut-corner fill + border, absolutely positioned over the
 * nearest `relative` ancestor. Drop it as the FIRST child of a `relative
 * group` button/link, then place real content in a sibling `relative z-10`
 * element right after it. This keeps the interactive element's own box a
 * plain rectangle — correct focus ring + hit area — exactly like the
 * existing CutSubmitButton pattern (border/fill drawn as separate absolute
 * layers rather than clipping the button itself).
 */
export function CutFrame({
  variant = 'outline',
  cut = 10,
  active = false,
  className = '',
}: {
  variant?: CutVariant;
  cut?: number;
  active?: boolean;
  className?: string;
}) {
  const outer = cutClipPath(cut);
  const inner = cutClipPath(Math.max(cut - CUT_BORDER, 0));

  if (variant === 'primary' || active) {
    return (
      <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
        <span
          className="absolute inset-0 bg-gradient-brand shadow-[0_8px_22px_-10px_oklch(0.42_0.16_350_/_0.5)]"
          style={{ clipPath: outer }}
        />
        <span
          className="absolute inset-0 -translate-x-full bg-white/15 transition-transform duration-500 group-hover:translate-x-full"
          style={{ clipPath: outer }}
        />
      </span>
    );
  }

  if (variant === 'ghost') {
    return (
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-transparent transition-colors duration-200 group-hover:bg-secondary ${className}`}
        style={{ clipPath: outer }}
      />
    );
  }

  return (
    <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      <span
        className="absolute inset-0 bg-border transition-colors duration-200 group-hover:bg-brand-2/70"
        style={{ clipPath: outer }}
      />
      <span
        className="absolute bg-card transition-colors duration-200 group-hover:bg-secondary/70"
        style={{ clipPath: inner, inset: CUT_BORDER }}
      />
    </span>
  );
}

/**
 * Real, clipped cut-corner container — border and fill both actually clip
 * the content — for non-focusable containers where content should crop
 * cleanly to the shape: dropdown panels, sidebar cards, the desktop sidebar
 * frame. Simple padding-based double layer, no absolute positioning needed.
 */
export function CutPanel({
  cut = 16,
  tone = 'card',
  className = '',
  contentClassName = '',
  style,
  children,
}: {
  cut?: number;
  tone?: 'card' | 'soft' | 'brand' | 'popover';
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const outer = cutClipPath(cut);
  const inner = cutClipPath(Math.max(cut - CUT_BORDER, 0));
  const fill =
    tone === 'soft' ? 'bg-gradient-soft'
    : tone === 'brand' ? 'bg-gradient-brand'
    : tone === 'popover' ? 'bg-popover'
    : 'bg-card';

  return (
    <div className={`bg-border/70 ${className}`} style={{ clipPath: outer, padding: CUT_BORDER, ...style }}>
      <div className={`h-full w-full ${fill} ${contentClassName}`} style={{ clipPath: inner }}>
        {children}
      </div>
    </div>
  );
}

export default CutFrame;
