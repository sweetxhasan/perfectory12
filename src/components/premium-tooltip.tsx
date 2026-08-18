import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Premium "5-cut" tooltip — a chamfered speech-bubble (four cut corners plus
 * a pointed tail notch) with a white surface and a black svg outline.
 * Opens automatically once, 3s after it mounts, stays open briefly, then
 * only responds to clicks afterward. Anchored top-right so it never runs
 * off-screen on narrow / mobile viewports.
 */
const TOOLTIP_CLIP_PATH =
  'polygon(8% 0%, 92% 0%, 100% 9.76%, 100% 65.85%, 92% 75.61%, 90% 75.61%, 85% 97.56%, 80% 75.61%, 8% 75.61%, 0% 65.85%, 0% 9.76%)';
/* Same shape in raw SVG units for a 100×82 viewBox, inset ~0.6u for a crisp stroke. */
const TOOLTIP_PATH = 'M8 0.6 L92 0.6 L99.4 8 L99.4 54 L92 61.4 L90 61.4 L85 79.4 L80 61.4 L8 61.4 L0.6 54 L0.6 8 Z';

export function PremiumTooltip({
  content,
  autoOpenDelay = 3000,
  autoOpenDuration = 3200,
  children,
}: {
  content: ReactNode;
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
        className={`pv-tooltip absolute bottom-full right-0 z-30 mb-3 w-[188px] transition-all duration-200 ${
          open ? 'visible translate-y-0 opacity-100' : 'invisible pointer-events-none translate-y-1 opacity-0'
        }`}
      >
        <span className="pv-tooltip-bg absolute inset-0" style={{ clipPath: TOOLTIP_CLIP_PATH }} />
        <svg className="pv-tooltip-frame" viewBox="0 0 100 82" preserveAspectRatio="none" aria-hidden="true">
          <path d={TOOLTIP_PATH} fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        <span className="pv-tooltip-text relative z-10 block px-3.5 pt-2.5 pb-6 text-[12px] font-semibold leading-snug">
          {content}
        </span>
      </div>
    </div>
  );
}

export default PremiumTooltip;
