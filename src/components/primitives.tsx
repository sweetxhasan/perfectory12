import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './icon';
import { PRIMARY_CUT_PATH, PRIMARY_CUT_CLIP_PATH } from './cut-primary-button';

/* ── Buttons ── */
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: IconName;
  iconRight?: boolean;
  fullWidth?: boolean;
}

/**
 * Premium 6-cut chamfered CTA — same geometry as CutPrimaryButton
 * (4 corner chamfers + left/right edge notches), filled with the
 * brand diagonal gradient (linear-deg(-45deg, #ec5252, #6e1a52)) and
 * outlined with a crisp 1px SVG stroke. Used everywhere a primary
 * action button is rendered via the shared BtnProps API.
 */
export function GradientButton({ children, loading, icon, iconRight, fullWidth, className = '', disabled, ...props }: BtnProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`group relative inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 ${fullWidth ? 'w-full' : ''} ${className}`}
    >
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
        className="absolute inset-0 -translate-x-full bg-white/15 transition-transform duration-500 group-hover:translate-x-full"
        style={{ clipPath: PRIMARY_CUT_CLIP_PATH }}
      />
      {/* Crisp 1px cut-corner border */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={PRIMARY_CUT_PATH} fill="none" stroke="oklch(1 0 0 / 0.4)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="relative z-10 flex items-center gap-2">
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : !iconRight ? (
          icon && <Icon name={icon} size={18} />
        ) : null}
        <span>{children}</span>
        {!loading && iconRight && icon && <Icon name={icon} size={18} />}
      </span>
    </button>
  );
}

/**
 * Premium 6-cut chamfered outline button — same cut geometry as
 * GradientButton, but border-only: no CSS border, no fill, just a
 * crisp 1px SVG stroke painted with the brand diagonal gradient, so
 * the page background always shows through.
 */
export function OutlineButton({ children, icon, fullWidth, loading, className = '', disabled, ...props }: BtnProps) {
  const gradId = useId();

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`group relative inline-flex items-center justify-center gap-2 bg-transparent px-5 py-3 text-sm font-medium text-foreground transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ec5252" />
            <stop offset="100%" stopColor="#6e1a52" />
          </linearGradient>
        </defs>
        <path
          d={PRIMARY_CUT_PATH}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
          className="transition-opacity duration-200 group-hover:opacity-80"
        />
      </svg>
      <span className="relative z-10 flex items-center gap-2">
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-2/40 border-t-brand-2" />
        ) : (
          icon && <Icon name={icon} size={18} />
        )}
        {children}
      </span>
    </button>
  );
}

/* ── Inputs ── */
interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: IconName;
  hint?: string;
}

export const TextInput = forwardRef<HTMLInputElement, FieldProps>(function TextInput(
  { label, icon, hint, className = '', id, ...props }, ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-sm text-muted-foreground">{label}</label>}
      <div className="group relative flex items-center rounded-2xl border border-input bg-card transition focus-within:border-brand-2 focus-within:ring-2 focus-within:ring-brand-2/20">
        {icon && (
          <span className="pl-3.5 text-muted-foreground group-focus-within:text-brand-2">
            <Icon name={icon} size={18} />
          </span>
        )}
        <input
          id={id} ref={ref}
          className={`w-full bg-transparent px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground/60 disabled:opacity-50 ${className}`}
          {...props}
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
});

interface AreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, AreaProps>(function TextArea(
  { label, className = '', id, ...props }, ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-sm text-muted-foreground">{label}</label>}
      <textarea
        id={id} ref={ref}
        className={`w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 ${className}`}
        {...props}
      />
    </div>
  );
});

/* ── Card ── */
export function Panel({ children, className = '', gradientBorder }: { children: ReactNode; className?: string; gradientBorder?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl ${gradientBorder ? 'border-gradient bg-gradient-brand' : 'border border-border bg-card'} ${className}`}>
      {/* Decorative corner orbs — blend with card bg */}
      {!gradientBorder && (
        <>
          {/* Top-right primary orb */}
          <span
            aria-hidden="true"
            className="animate-orb pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl"
            style={{ background: 'color-mix(in oklch, var(--brand) 11%, transparent)' }}
          />
          {/* Bottom-left secondary orb */}
          <span
            aria-hidden="true"
            className="animate-orb-delay pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full blur-2xl"
            style={{ background: 'color-mix(in oklch, var(--brand-2) 9%, transparent)' }}
          />
        </>
      )}
      {children}
    </div>
  );
}

export function SectionBadge({ children, icon }: { children: ReactNode; icon?: IconName }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-gradient-soft px-3.5 py-1.5 text-xs text-brand">
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}
