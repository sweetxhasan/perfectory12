import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { CUT_FRAME_PATH, CUT_FRAME_INNER_PATH, CUT_FRAME_CLIP_PATH } from './cut-frame';

/**
 * @deprecated kept only so any stray callers don't crash — every element
 * now reuses the exact CUT_FRAME_CLIP_PATH geometry from cut-frame.tsx
 * (the same percentage-based shape as the Login/Signup inputs & buttons)
 * instead of a generic px-chamfer, so header/sidebar chrome is pixel-for-
 * pixel identical to the auth pages.
 */
export function cutClipPath() {
  return CUT_FRAME_CLIP_PATH;
}

export const CUT_BORDER = 1.4;

export type CutVariant = 'primary' | 'outline' | 'ghost' | 'light';

export function CutButton({
  children,
  variant = 'outline',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: CutVariant }) {
  return (
    <button {...props} className={`group relative isolate inline-flex items-center justify-center gap-2 overflow-hidden px-5 py-3 text-sm font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${className}`}>
      <CutFrame variant={variant} />
      <span className={`relative z-10 inline-flex items-center gap-2 ${variant === 'primary' ? 'text-primary-foreground' : ''}`}>{children}</span>
    </button>
  );
}

export function CutIconBox({ children, className = '', tone = 'soft' }: { children: ReactNode; className?: string; tone?: 'soft' | 'brand' | 'card' }) {
  return <CutPanel tone={tone} className={`size-14 ${className}`} contentClassName="flex items-center justify-center text-primary-foreground">{children}</CutPanel>;
}

/** Shared double-stroke SVG overlay — identical to the Login/Signup <CutFrame>. */
function CutFrameStrokes({
  stroke = 'url(#cut-brand-gradient)',
  strokeWidth = 1.4,
  innerStroke = 'oklch(0.15 0 0 / 0.08)',
  className = '',
}: {
  stroke?: string;
  strokeWidth?: number;
  innerStroke?: string;
  className?: string;
}) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cut-brand-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6e1a52" />
          <stop offset="100%" stopColor="#ec5252" />
        </linearGradient>
      </defs>
      <path d={CUT_FRAME_PATH} fill="none" stroke={stroke} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
      <path d={CUT_FRAME_INNER_PATH} fill="none" stroke={innerStroke} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * Decorative cut-corner fill + border, absolutely positioned over the
 * nearest `relative` ancestor. Drop it as the FIRST child of a `relative
 * group` button/link, then place real content in a sibling `relative z-10`
 * element right after it. Uses the exact same CUT_FRAME_PATH /
 * CUT_FRAME_CLIP_PATH geometry as the Login/Signup form's inputs, submit
 * button and Google button — so header/sidebar chrome shares one identical
 * cut-frame language with the auth pages, not an approximation of it.
 */
export function CutFrame({
  variant = 'outline',
  active = false,
  className = '',
}: {
  variant?: CutVariant;
  /** @deprecated no longer configurable — geometry is fixed to CUT_FRAME_PATH */
  cut?: number;
  active?: boolean;
  className?: string;
}) {
  if (variant === 'light') {
    return (
      <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
        <span className="absolute inset-0 bg-background" style={{ clipPath: CUT_FRAME_CLIP_PATH }} />
        <CutFrameStrokes stroke="oklch(1 0 0 / 0.9)" strokeWidth={1} innerStroke="oklch(0.15 0 0 / 0.12)" />
      </span>
    );
  }

  if (variant === 'primary' || active) {
    return (
      <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
        <span
          className="absolute inset-0 bg-[linear-gradient(-45deg,#ec5252,#6e1a52)] shadow-[0_8px_22px_-10px_oklch(0.42_0.16_350_/_0.5)]"
          style={{ clipPath: CUT_FRAME_CLIP_PATH }}
        />
        <span
          className="absolute inset-0 -translate-x-full bg-white/15 transition-transform duration-500 group-hover:translate-x-full"
          style={{ clipPath: CUT_FRAME_CLIP_PATH }}
        />
        <CutFrameStrokes stroke="url(#cut-brand-gradient)" strokeWidth={1} innerStroke="url(#cut-brand-gradient)" />
      </span>
    );
  }

  if (variant === 'ghost') {
    return (
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 ${className}`}
      >
        <span
          className="absolute inset-0 bg-transparent transition-colors duration-200 group-hover:bg-secondary"
          style={{ clipPath: CUT_FRAME_CLIP_PATH }}
        />
        <CutFrameStrokes
          stroke="transparent"
          className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 [&_path:first-child]:transition-[stroke] [&_path:first-child]:duration-200 group-hover:[&_path:first-child]:stroke-[var(--border)]"
        />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      <span
        className="absolute inset-0 bg-transparent transition-colors duration-200 group-hover:bg-transparent"
        style={{ clipPath: CUT_FRAME_CLIP_PATH }}
      />
      <CutFrameStrokes className="[&_path:first-child]:transition-[stroke] [&_path:first-child]:duration-200 group-hover:[&_path:first-child]:stroke-[var(--brand-2)]" />
    </span>
  );
}

/**
 * Real, clipped cut-corner container — the whole element (fill + children)
 * is clipped to the exact CUT_FRAME_CLIP_PATH shape, with the same SVG
 * double-stroke border drawn on top — for non-focusable containers where
 * content should crop cleanly to the shape: dropdown panels, sidebar
 * cards, the desktop sidebar frame.
 */
export function CutPanel({
  tone = 'card',
  className = '',
  contentClassName = '',
  style,
  children,
}: {
  /** @deprecated no longer configurable — geometry is fixed to CUT_FRAME_PATH */
  cut?: number;
  tone?: 'card' | 'soft' | 'brand' | 'popover';
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const fill =
    tone === 'soft' ? 'bg-gradient-soft'
    : tone === 'brand' ? 'bg-gradient-brand'
    : tone === 'popover' ? 'bg-popover'
    : 'bg-card';

  return (
    <div className={`relative isolate ${className}`} style={{ clipPath: CUT_FRAME_CLIP_PATH, ...style }}>
      <div className={`relative z-10 h-full w-full ${fill} ${contentClassName}`}>{children}</div>
      <CutFrameStrokes className="z-20" />
    </div>
  );
}

export default CutFrame;
