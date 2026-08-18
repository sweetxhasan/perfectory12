import { useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icon';

/**
 * Shared overlay shell — bottom sheet on mobile, centered modal on desktop.
 * Same look & feel as the Generator's language/voice pickers.
 */
export function OverlayShell({
  open, onClose, title, badge, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  badge?: string | number;
  children: ReactNode;
}) {
  const sheetRef    = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const dragStartY  = useRef(0);
  const dragging    = useRef(false);
  const lastDelta   = useRef(0);
  const startHeight = useRef(0);

  /* lock body scroll */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  /* close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  /* reset position & backdrop whenever sheet opens */
  useEffect(() => {
    if (open) {
      if (sheetRef.current) {
      sheetRef.current.style.transform  = '';
      sheetRef.current.style.transition = '';
      sheetRef.current.style.maxHeight = '';
      }
      if (backdropRef.current) {
        backdropRef.current.style.opacity    = '';
        backdropRef.current.style.transition = '';
      }
    }
  }, [open]);

  const DISMISS_PX   = 140;
  const BACKDROP_BASE = 0.55;

  function onDragStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
    lastDelta.current  = 0;
    startHeight.current = sheetRef.current?.getBoundingClientRect().height ?? 0;
    dragging.current   = true;
    if (sheetRef.current)    sheetRef.current.style.transition    = 'none';
    if (backdropRef.current) backdropRef.current.style.transition = 'none';
  }

  function onDragMove(e: React.TouchEvent) {
    if (!dragging.current) return;
    const raw = e.touches[0].clientY - dragStartY.current;
    lastDelta.current = raw;
    if (sheetRef.current) {
      if (raw > 0) {
        sheetRef.current.style.transform = `translateY(${raw}px)`;
      } else {
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const nextHeight = Math.min(viewportHeight * 0.96, startHeight.current + Math.abs(raw));
        sheetRef.current.style.maxHeight = `${nextHeight}px`;
        sheetRef.current.style.transform = 'translateY(0)';
      }
    }
    if (backdropRef.current) {
      const progress = Math.min(raw / DISMISS_PX, 1);
      backdropRef.current.style.opacity = String(BACKDROP_BASE * (1 - progress));
    }
  }

  function onDragEnd() {
    if (!dragging.current) return;
    dragging.current = false;
    if (lastDelta.current < -70) {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'max-height 0.28s ease';
        sheetRef.current.style.maxHeight = '96dvh';
        sheetRef.current.style.transform = 'translateY(0)';
      }
      if (backdropRef.current) {
        backdropRef.current.style.transition = 'opacity 0.25s ease';
        backdropRef.current.style.opacity = String(BACKDROP_BASE);
      }
      return;
    }
    if (lastDelta.current >= DISMISS_PX) {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.25s cubic-bezier(0.4,0,1,1)';
        sheetRef.current.style.transform  = 'translateY(115%)';
      }
      if (backdropRef.current) {
        backdropRef.current.style.transition = 'opacity 0.25s ease';
        backdropRef.current.style.opacity    = '0';
      }
      setTimeout(onClose, 240);
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.42s cubic-bezier(0.34,1.56,0.64,1)';
        sheetRef.current.style.transform  = 'translateY(0)';
      }
      if (backdropRef.current) {
        backdropRef.current.style.transition = 'opacity 0.3s ease';
        backdropRef.current.style.opacity    = String(BACKDROP_BASE);
      }
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-overlay-backdrop"
        onClick={onClose}
      />

      {/* Mobile: bottom sheet */}
      <div
        ref={sheetRef}
        className="sm:hidden absolute bottom-0 left-0 right-0 flex flex-col bg-card rounded-t-[2rem] max-h-[92dvh] animate-overlay-sheet shadow-2xl transition-[max-height] duration-300"
      >
        {/* Drag handle */}
        <div
          className="flex justify-center items-center pt-3 pb-2.5 shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          <div className="h-[5px] w-[52px] rounded-full bg-border/80" />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0 touch-none select-none"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold">{title}</span>
            {badge !== undefined && (
              <span className="rounded-full bg-brand-2/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-2 leading-none">
                {badge}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            onTouchStart={(e) => e.stopPropagation()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition hover:bg-border hover:text-foreground"
          >
            <Icon name="x" size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
        <div className="shrink-0" style={{ height: 'env(safe-area-inset-bottom, 12px)' }} />
      </div>

      {/* Desktop: centered modal */}
      <div
        className="hidden sm:flex flex-col bg-card rounded-3xl shadow-2xl border border-border w-[480px] max-h-[85vh] absolute top-1/2 left-1/2 animate-overlay-modal"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold">{title}</span>
            {badge !== undefined && (
              <span className="rounded-full bg-brand-2/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-2 leading-none">
                {badge}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition hover:bg-border hover:text-foreground"
          >
            <Icon name="x" size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
