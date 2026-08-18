import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'wouter';

/**
 * The global "primary" call-to-action button — premium 6-cut chamfered
 * + edge-notched border (4 corner chamfers + a slim notch on the left
 * and right edges), filled with the brand diagonal gradient
 * (linear-gradient(-45deg, #ec5252, #6e1a52)) and outlined with a
 * crisp 1px SVG stroke. This is the single primary-action button meant
 * to be reused everywhere a "main" CTA is needed (header, upsells,
 * etc). Its height matches the header's CutIconButton (default 40px)
 * so the two controls line up; width sizes to its own label + icon.
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
  /** Fixed control height in px — defaults to 40 to match CutIconButton. */
  height?: number;
  className?: string;
}

export function CutPrimaryButton({
  children,
  href,
  onClick,
  type = 'button',
  height = 40,
  className = '',
}: CutPrimaryButtonProps) {
  const classes = `group relative inline-flex shrink-0 items-center justify-center gap-1.5 px-4 text-[13px] font-semibold text-white transition active:scale-[0.97] ${className}`;
  const style = { height };

  const inner = (
    <>
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
      {/* Crisp 1px cut-corner border */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={PRIMARY_CUT_PATH}
          fill="none"
          stroke="oklch(1 0 0 / 0.4)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">{children}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={classes} style={style}>
        {inner}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes} style={style}>
      {inner}
    </button>
  );
}

export default CutPrimaryButton;
