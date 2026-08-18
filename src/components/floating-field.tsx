import { useState, forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './icon';
import { CutFrame } from './cut-frame';

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

    const iconCls =
      status === 'valid'
        ? 'text-emerald-500'
        : status === 'error'
          ? 'text-destructive'
          : focused
            ? 'text-brand-2'
            : 'text-muted-foreground/50';

    const statusCls = status === 'valid' ? 'is-valid' : status === 'error' ? 'is-error' : '';

    return (
      <div className="relative flex flex-col gap-1.5 pt-1.5">
        <div className={`pv-cut-field relative flex h-14 items-stretch ${statusCls}`}>
          <div className="pv-cut-bg" />
          <CutFrame />

          <span className="pv-cut-label">{label}</span>

          <div className="relative z-20 flex min-w-0 flex-1 items-center">
            {icon && (
              <span className={`shrink-0 pl-4 transition-colors duration-200 ${iconCls}`}>
                <Icon name={icon} size={18} />
              </span>
            )}
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
              className={`w-full min-w-0 flex-1 bg-transparent px-3.5 py-2 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/40 ${icon ? 'pl-2.5' : ''} ${className}`}
              {...props}
            />
            {rightSlot}
          </div>
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
