import { useId } from 'react';

type GradientCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  className?: string;
};

/**
 * Premium "cut-corner" checkbox — no CSS border. The box, the fill and the
 * checkmark are all drawn as SVG so the same angular-cut language used by
 * the input frames (see cut-frame.tsx) carries through to the checkbox.
 * The box has three chamfered corners (top-right, bottom-right, bottom-left)
 * and one square corner (top-left).
 */
export function GradientCheckbox({ checked, onChange, label, className = '' }: GradientCheckboxProps) {
  const id = useId().replace(/:/g, '');
  const gradId = `pv-check-grad-${id}`;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`group inline-flex items-center gap-2.5 select-none text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-2)]/35 focus-visible:ring-offset-1 ${className}`}
    >
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        <svg viewBox="0 0 20 20" className="h-6 w-6 overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ec5252" />
              <stop offset="1" stopColor="#6e1a52" />
            </linearGradient>
          </defs>

          {/* Three-cut box: square top-left, chamfered top-right / bottom-right / bottom-left */}
          <path
            d="M0.9 0.9 H13.4 L19.1 6.6 V13.4 L13.4 19.1 H6.6 L0.9 13.4 Z"
            fill={checked ? `url(#${gradId})` : 'color-mix(in oklch, var(--brand-2) 4%, transparent)'}
            stroke={checked ? `url(#${gradId})` : 'oklch(0.6 0 0 / 0.5)'}
            strokeWidth="1.5"
            style={{ transition: 'fill 0.2s ease, stroke 0.2s ease' }}
            className="transition-colors group-hover:[stroke:var(--brand-2)]"
          />

          {/* Checkmark — revealed fully, no border, scales in */}
          <path
            d="M4.6 10.3 L8.3 14 L15.4 6.2"
            fill="none"
            stroke="oklch(1 0 0)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              opacity: checked ? 1 : 0,
              transform: checked ? 'scale(1)' : 'scale(0.5)',
              transformOrigin: '10px 10px',
              transition: 'opacity 0.16s ease, transform 0.22s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          />
        </svg>
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}

export default GradientCheckbox;
