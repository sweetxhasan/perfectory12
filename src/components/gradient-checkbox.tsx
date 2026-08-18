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
 * The outline is the same 6-cut geometry as CUT_FRAME_PATH (chamfers +
 * two small tab notches on opposite corners), scaled to a 20x20 box, with
 * a crisp 1px stroke.
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

          {/* Six-cut box: same chamfer + tab-notch geometry as CUT_FRAME_PATH, scaled to 20x20 */}
          <path
            d="M0.8 0.2 H18.5 L19.0 2.1 L19.6 2.1 L20.0 4.6 V15.4 L19.2 19.8 H1.5 L1.1 17.9 L0.4 17.9 L0 15.4 V4.6 Z"
            fill={checked ? `url(#${gradId})` : 'color-mix(in oklch, var(--brand-2) 4%, transparent)'}
            stroke={checked ? `url(#${gradId})` : 'oklch(0.6 0 0 / 0.6)'}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
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
