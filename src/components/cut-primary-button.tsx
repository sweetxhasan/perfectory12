import { useId, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'wouter';

/**
 * The global "primary" call-to-action button — premium 6-cut chamfered
 * + edge-notched border (4 corner chamfers + a slim notch on the left
 * and right edges), filled with the brand diagonal gradient
 * (linear-gradient(-45deg, #ec5252, #6e1a52)). This is the single
 * primary-action button meant to be reused everywhere a "main" CTA is
 * needed (header, upsells, etc), so it sizes to its own label + icon
 * via padding rather than stretching or shrinking awkwardly.
 *
 * The border is drawn twice for a premium finish: a soft outer glow
 * line (gradient-tinted) plus a crisp inner 1px hairline, so the cut
 * facets read with depth instead of a flat single stroke.
 *
 * Renders as a `<Link>` when `href` is passed, otherwise a `<button>`.
 */
const PRIMARY_CUT_PATH =
  'M8 0.6 L92 0.6 L99.4 8 L99.4 41.5 L94 41.5 L94 58.5 L99.4 58.5 L99.4 92 L92 99.4 L8 99.4 L0.6 92 L0.6 58.5 L6 58.5 L6 41.5 L0.6 41.5 L0.6 8 Z';
const PRIMARY_CUT_CLIP_PATH =
  'polygon(8% 0.6%, 92% 0.6%, 99.4% 8%, 99.4% 41.5%, 94% 41.5%, 94% 58.5%, 99.4% 58.5%, 99.4% 92%, 92% 99.4%, 8% 99.4%, 0.6% 92%, 0.6% 58.5%, 6% 58.5%, 6% 41.5%, 0.6% 41.5%, 0.6% 8%)';

interface CutPrimaryButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: (e: MouseEvent) => void;
  type?: 'button' | 'submit';
  size?: 'sm' | 'md';
  className?: string;
}

export function CutPrimaryButton({
  children,
  href,
  onClick,
  type = 'button',
  size = 'md',
  className = '',
}: CutPrimaryButtonProps) {
  const gradId = useId();
  const padding = size === 'sm' ? 'gap-1 px-3 py-1.5 text-xs' : 'gap-1.5 px-4 py-2 text-[13px]';
  const classes = `group relative inline-flex shrink-0 items-center justify-center font-semibold text-white transition active:scale-[0.97] ${padding} ${className}`;

  const inner = (
    <>
      {/* Soft outer glow, same 6-cut silhouette, sitting just behind the fill */}
      <span
        className="absolute -inset-[2px] opacity-70 blur-[5px] transition-opacity duration-300 group-hover:opacity-100"
        style={{
          clipPath: PRIMARY_CUT_CLIP_PATH,
          background: 'linear-gradient(-45deg, #ec5252, #6e1a52)',
        }}
      />
      {/* Fill — clipped to the exact 6-cut shape */}
      <span
        className="absolute inset-0"
        style={{
          clipPath: PRIMARY_CUT_CLIP_PATH,
          background: 'linear-gradient(-45deg, #ec5252, #6e1a52)',
          boxShadow: '0 4px 18px -6px oklch(0.42 0.16 350 / 0.55)',
        }}
      />
      {/* Hover sheen, same clip */}
      <span
        className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-500 group-hover:translate-x-full"
        style={{ clipPath: PRIMARY_CUT_CLIP_PATH }}
      />
      {/* Double-line 6-cut border: crisp hairline + a faint inset highlight for depth */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${gradId}-edge`} x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ffd9c8" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0.35} />
          </linearGradient>
        </defs>
        <path
          d={PRIMARY_CUT_PATH}
          fill="none"
          stroke={`url(#${gradId}-edge)`}
          strokeWidth={1.1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">{children}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={classes}>
        {inner}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {inner}
    </button>
  );
}

export default CutPrimaryButton;
