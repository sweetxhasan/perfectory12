import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'wouter';

/**
 * The global "primary" call-to-action button — premium 7-cut chamfered
 * + edge-notched border (4 corner chamfers + notches on the right,
 * bottom, and left edges), filled with the same brand diagonal
 * gradient used by the auth pages' premium buttons
 * (linear-gradient(-45deg, #ec5252, #6e1a52)). This is the single
 * primary-action button meant to be reused everywhere a "main" CTA is
 * needed (header, upsells, etc), so it sizes to its own label + icon
 * via padding rather than stretching or shrinking awkwardly.
 *
 * Renders as a `<Link>` when `href` is passed, otherwise a `<button>`.
 */
const PRIMARY_CUT_PATH =
  'M9.7 0.7 L90.3 0.7 L99.3 9.7 L99.3 45 L95.3 45 L95.3 55 L99.3 55 L99.3 90.3 L90.3 99.3 L60 99.3 L60 95.3 L50 95.3 L50 99.3 L9.7 99.3 L0.7 90.3 L0.7 55 L4.7 55 L4.7 45 L0.7 45 L0.7 9.7 Z';
const PRIMARY_CUT_CLIP_PATH =
  'polygon(9.7% 0.7%, 90.3% 0.7%, 99.3% 9.7%, 99.3% 45%, 95.3% 45%, 95.3% 55%, 99.3% 55%, 99.3% 90.3%, 90.3% 99.3%, 60% 99.3%, 60% 95.3%, 50% 95.3%, 50% 99.3%, 9.7% 99.3%, 0.7% 90.3%, 0.7% 55%, 4.7% 55%, 4.7% 45%, 0.7% 45%, 0.7% 9.7%)';

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
  const padding = size === 'sm' ? 'gap-1.5 px-3.5 py-2 text-[13px]' : 'gap-2 px-5 py-2.5 text-sm';
  const classes = `group relative inline-flex shrink-0 items-center justify-center font-semibold text-white transition active:scale-[0.97] ${padding} ${className}`;

  const inner = (
    <>
      {/* Fill — clipped to the exact 7-cut shape */}
      <span
        className="absolute inset-0"
        style={{
          clipPath: PRIMARY_CUT_CLIP_PATH,
          background: 'linear-gradient(-45deg, #ec5252, #6e1a52)',
          boxShadow: '0 4px 18px -6px oklch(0.42 0.16 350 / 0.5)',
        }}
      />
      {/* Hover sheen, same clip */}
      <span
        className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-500 group-hover:translate-x-full"
        style={{ clipPath: PRIMARY_CUT_CLIP_PATH }}
      />
      {/* 1px cut-corner border, crisp at any aspect ratio */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={PRIMARY_CUT_PATH}
          fill="none"
          stroke="oklch(1 0 0 / 0.32)"
          strokeWidth={1}
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
