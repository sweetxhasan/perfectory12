import { useId, type ReactNode } from 'react';

/**
 * Premium "5-cut" square icon button — 4 chamfered corners plus a
 * single inward notch on the right edge. No CSS border — the outline
 * is a 1px SVG stroke painted with the brand diagonal gradient
 * (linear-gradient(-45deg, #ec5252, #6e1a52)). Used for compact
 * icon-only controls in the header (e.g. the mobile menu toggle).
 */
const ICON_CUT_PATH =
  'M15 0.8 L85 0.8 L99.2 15 L99.2 42 L94 42 L94 58 L99.2 58 L99.2 85 L85 99.2 L15 99.2 L0.8 85 L0.8 15 Z';
const ICON_CUT_CLIP_PATH =
  'polygon(15% 0.8%, 85% 0.8%, 99.2% 15%, 99.2% 42%, 94% 42%, 94% 58%, 99.2% 58%, 99.2% 85%, 85% 99.2%, 15% 99.2%, 0.8% 85%, 0.8% 15%)';

interface CutIconButtonProps {
  children: ReactNode;
  onClick?: () => void;
  ariaLabel: string;
  size?: number;
  className?: string;
}

export function CutIconButton({ children, onClick, ariaLabel, size = 40, className = '' }: CutIconButtonProps) {
  const gradId = useId();

  return (
    <div className={`group relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      {/* 5-cut border stroke, painted with the brand diagonal gradient */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id={gradId} x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ec5252" />
            <stop offset="100%" stopColor="#6e1a52" />
          </linearGradient>
        </defs>
        <path
          d={ICON_CUT_PATH}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
          className="transition-opacity duration-200 group-hover:opacity-80"
        />
      </svg>

      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className="relative flex h-full w-full items-center justify-center bg-card text-foreground transition active:scale-[0.94]"
        style={{ clipPath: ICON_CUT_CLIP_PATH }}
      >
        <span className="relative z-10 flex items-center justify-center">{children}</span>
      </button>
    </div>
  );
}

export default CutIconButton;
