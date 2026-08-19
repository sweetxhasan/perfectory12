import { useId } from 'react';
import { CUT_FRAME_PATH } from '@/components/cut-frame';

type GradientCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  className?: string;
};

/**
 * Premium "cut-corner" checkbox — no CSS border. The box, the fill and the
 * checkmark are all drawn as SVG so the exact same primary cut-frame shape
 * used by the input fields and the Sign Up / Google buttons (CUT_FRAME_PATH,
 * see cut-frame.tsx) carries through to the checkbox too, just scaled down
 * to a small square box with a crisp 1px stroke.
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
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-6 w-6 overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ec5252" />
              <stop offset="1" stopColor="#6e1a52" />
            </linearGradient>
          </defs>

          {/* Same primary cut-frame shape as the input fields and buttons (CUT_FRAME_PATH) */}
          <path
            d={CUT_FRAME_PATH}
            fill={checked ? `url(#${gradId})` : 'color-mix(in oklch, var(--brand-2) 4%, transparent)'}
            stroke={checked ? `url(#${gradId})` : 'oklch(0.6 0 0 / 0.6)'}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            style={{ transition: 'fill 0.2s ease, stroke 0.2s ease' }}
            className="transition-colors group-hover:[stroke:var(--brand-2)]"
          />

          {/* Checkmark — revealed fully, no border, scales in */}
          <path
            d="M23 51.5 L41.5 70 L77 31"
            fill="none"
            stroke="oklch(1 0 0)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              opacity: checked ? 1 : 0,
              transform: checked ? 'scale(1)' : 'scale(0.5)',
              transformOrigin: '50px 50px',
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
