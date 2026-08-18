import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Premium "5-cut" tooltip — a chamfered speech-bubble (four cut corners plus
 * a pointed tail notch) with a white surface and a black svg outline.
 * Opens automatically as soon as it mounts, stays open briefly, then closes —
 * afterward it only responds to clicks. Anchored top-right so it never runs
 * off-screen on narrow / mobile viewports.
 */
/* Tail sits close to the right edge (~90%) so it lines up with a small
   right-anchored trigger icon instead of drifting toward the center. */
const TOOLTIP_CLIP_PATH =
  'polygon(8% 0%, 92% 0%, 100% 9.76%, 100% 65.85%, 96% 75.61%, 94% 75.61%, 90% 97.56%, 86% 75.61%, 8% 75.61%, 0% 65.85%, 0% 9.76%)';
/* Same shape in raw SVG units for a 100×82 viewBox, inset ~0.6u for a crisp stroke. */
const TOOLTIP_PATH = 'M8 0.6 L92 0.6 L99.4 8 L99.4 54 L96 61.4 L94 61.4 L90 79.4 L86 61.4 L8 61.4 L0.6 54 L0.6 8 Z';

export type TooltipVariant = 'valid' | 'invalid' | 'neutral';

const VARIANT_FRAME_COLOR: Record<TooltipVariant, string> = {
  valid: 'oklch(0.60 0.15 152)',   /* success green */
  invalid: 'var(--destructive)',    /* danger red */
  neutral: 'oklch(0.12 0 0)',       /* black */
};

export function PremiumTooltip({
  content,
  variant = 'neutral',
  autoOpenDelay = 150,
  autoOpenDuration = 2000,
  children,
}: {
  content: ReactNode;
  variant?: TooltipVariant;
  autoOpenDelay?: number;
  autoOpenDuration?: number;
  children: (opts: { open: boolean; toggle: () => void }) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Auto-open exactly once per mount, then auto-close again. */
  useEffect(() => {
    const openTimer = setTimeout(() => {
      setOpen(true);
      closeTimer.current = setTimeout(() => setOpen(false), autoOpenDuration);
    }, autoOpenDelay);
    return () => {
      clearTimeout(openTimer);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Click outside to close */
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  function toggle() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen((v) => !v);
  }

  return (
    <div ref={rootRef} className="pv-tooltip-anchor relative inline-flex">
      {children({ open, toggle })}

      <div
        role="tooltip"
        className={`pv-tooltip absolute bottom-full right-[-10px] z-30 mb-0.5 w-[188px] transition-all duration-200 ${
          open ? 'visible translate-y-0 opacity-100' : 'invisible pointer-events-none translate-y-1 opacity-0'
        }`}
      >
        <span className="pv-tooltip-bg absolute inset-0" style={{ clipPath: TOOLTIP_CLIP_PATH }} />
        <svg
          className="pv-tooltip-frame"
          viewBox="0 0 100 82"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{ color: VARIANT_FRAME_COLOR[variant] }}
        >
          <path d={TOOLTIP_PATH} fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        <span className="pv-tooltip-text relative z-10 block px-3.5 pt-2.5 pb-6 text-[12px] font-semibold leading-snug">
          {content}
        </span>
      </div>
    </div>
  );
}

/**
 * Premium "6-cut" speech-bubble card — same cut-corner + centered-tail
 * visual language as PremiumTooltip above, but for content whose height
 * isn't fixed (e.g. the password-requirements list, which grows/shrinks
 * with the viewport and with text wrapping). The four corner chamfers and
 * the two tail-notch diagonals — six cut facets in total — are computed
 * from the card's real measured pixel size via ResizeObserver, so they
 * stay crisp and the tail stays centered on any device instead of
 * stretching the way a fixed percentage clip-path would on a
 * variable-height box.
 */
export function CutBubbleCard({
  children,
  variant = 'neutral',
  cornerCut = 14,
  tailWidth = 18,
  tailDrop = 11,
  className = '',
}: {
  children: ReactNode;
  variant?: TooltipVariant;
  cornerCut?: number;
  tailWidth?: number;
  tailDrop?: number;
  className?: string;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  const ready = w > 0 && h > 0;
  const half = w / 2;
  const shoulder = tailWidth / 2;

  const points: [number, number][] = [
    [cornerCut, 0],
    [w - cornerCut, 0],
    [w, cornerCut],
    [w, h - cornerCut],
    [w - cornerCut, h],
    [half + shoulder, h],
    [half, h + tailDrop],
    [half - shoulder, h],
    [cornerCut, h],
    [0, h - cornerCut],
    [0, cornerCut],
  ];

  const clipPath = ready ? `polygon(${points.map(([x, y]) => `${x}px ${y}px`).join(', ')})` : undefined;
  const framePath = ready ? points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ') + ' Z' : '';

  return (
    <div className={`relative ${className}`} style={{ paddingBottom: ready ? tailDrop : 0 }}>
      <div ref={bodyRef} className="pv-bubble-bg relative" style={clipPath ? { clipPath } : undefined}>
        {children}
      </div>
      {ready && (
        <svg
          className="pv-bubble-frame"
          width={w}
          height={h + tailDrop}
          viewBox={`0 0 ${w} ${h + tailDrop}`}
          aria-hidden="true"
          style={{ color: VARIANT_FRAME_COLOR[variant] }}
        >
          <path d={framePath} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

export default PremiumTooltip;
