import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './icon';

/* ── Buttons ── */
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: IconName;
  iconRight?: boolean;
  fullWidth?: boolean;
}

export function GradientButton({ children, loading, icon, iconRight, fullWidth, className = '', disabled, ...props }: BtnProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-brand px-5 py-3 text-sm text-primary-foreground ring-glow transition hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
      ) : !iconRight ? (
        icon && <Icon name={icon} size={18} />
      ) : null}
      <span className="relative">{children}</span>
      {!loading && iconRight && icon && <Icon name={icon} size={18} />}
    </button>
  );
}

export function OutlineButton({ children, icon, fullWidth, loading, className = '', disabled, ...props }: BtnProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm transition hover:border-brand-2 hover:text-brand-2 active:scale-[0.98] disabled:opacity-60 ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-2/40 border-t-brand-2" />
      ) : (
        icon && <Icon name={icon} size={18} />
      )}
      {children}
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
