import { useState, forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './icon';

export type FieldStatus = 'default' | 'valid' | 'error';

interface FloatingFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: IconName;
  rightSlot?: ReactNode;
  hint?: ReactNode;
  hintPlacement?: 'below' | 'above';
  status?: FieldStatus;
}

export const FloatingField = forwardRef<HTMLInputElement, FloatingFieldProps>(
  function FloatingField(
    { label, icon, rightSlot, hint, hintPlacement = 'below', status = 'default', id, value, onFocus, onBlur, className = '', ...props },
    ref,
  ) {
    const [focused, setFocused] = useState(false);
    const hasValue = String(value ?? '').length > 0;
    const isFloated = focused || hasValue;

    const borderCls =
      status === 'valid'
        ? 'border-emerald-400'
        : status === 'error'
          ? 'border-destructive/70'
          : focused
            ? 'border-brand-2'
            : 'border-input hover:border-muted-foreground/35';

    const glowCls = focused
      ? status === 'valid'
        ? 'shadow-[0_0_0_4px_rgba(52,211,153,0.12)]'
        : status === 'error'
          ? 'shadow-[0_0_0_4px_rgba(239,68,68,0.12)]'
          : 'auth-field-glow'
      : '';

    const iconCls =
      status === 'valid'
        ? 'text-emerald-500'
        : status === 'error'
          ? 'text-destructive'
          : focused
            ? 'text-brand-2'
            : 'text-muted-foreground/50';

    const labelFloatedColor =
      status === 'valid'
        ? 'text-emerald-500'
        : status === 'error'
          ? 'text-destructive'
          : 'text-brand-2';

    return (
      <div className="relative flex flex-col gap-1.5">
        <div
          className={`relative flex items-center rounded-2xl border bg-card/80 backdrop-blur-sm transition-all duration-200 ${borderCls} ${glowCls}`}
        >
          {icon && (
            <span className={`shrink-0 pl-4 transition-colors duration-200 ${iconCls}`}>
              <Icon name={icon} size={18} />
            </span>
          )}
          <div className="relative min-w-0 flex-1">
            <label
              htmlFor={id}
              className={[
                'pointer-events-none absolute origin-left select-none transition-all duration-200 ease-out',
                icon ? 'left-3.5' : 'left-4',
                isFloated
                  ? `top-[8px] text-[10px] font-semibold tracking-wide ${labelFloatedColor}`
                  : 'top-1/2 -translate-y-1/2 text-sm text-muted-foreground/55',
              ].join(' ')}
            >
              {label}
            </label>
            <input
              ref={ref}
              id={id}
              value={value}
              onFocus={(e) => {
                setFocused(true);
                onFocus?.(e);
              }}
              onBlur={(e) => {
                setFocused(false);
                onBlur?.(e);
              }}
              className={`w-full bg-transparent pb-2.5 pl-3.5 pr-3 pt-5 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-transparent focus:placeholder:text-muted-foreground/30 ${className}`}
              {...props}
            />
          </div>
          {rightSlot}
        </div>
        {hint && focused && (
          <div
            role="status"
            className={[
              'z-30 w-full max-w-[min(100%,32rem)]',
              hintPlacement === 'above'
                ? 'absolute bottom-[calc(100%+10px)] left-0'
                : 'relative mt-2',
            ].join(' ')}
          >
            {hint}
          </div>
        )}
      </div>
    );
  },
);
