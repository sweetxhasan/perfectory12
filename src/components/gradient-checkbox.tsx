import { useId } from 'react';

type GradientCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  className?: string;
};

export function GradientCheckbox({ checked, onChange, label, className = '' }: GradientCheckboxProps) {
  const id = useId().replace(/:/g, '');
  const filterId = `goo-${id}`;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`group inline-flex items-center gap-2.5 select-none text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec5252]/40 ${className}`}
    >
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full border-2 transition-all duration-200"
          style={{
            borderColor: checked ? '#6e1a52' : '#cfd6df',
            background: 'transparent',
            boxShadow: checked ? '0 0 0 2px rgba(236,82,82,.14)' : 'none',
          }}
        />
        <svg viewBox="0 0 15 14" fill="none" className="relative z-10 h-3.5 w-3.5" aria-hidden="true">
          <path d="M2 8.36364L6.23077 12L13 2" stroke={`url(#${filterId}-check)`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="19" strokeDashoffset={checked ? 0 : 19} style={{ transition: 'stroke-dashoffset .3s ease' }} />
        </svg>
      </span>
      {label && <span>{label}</span>}
      <svg aria-hidden="true" className="pointer-events-none absolute h-0 w-0">
        <defs>
          <linearGradient id={`${filterId}-check`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ec5252" />
            <stop offset="1" stopColor="#6e1a52" />
          </linearGradient>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -6" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
    </button>
  );
}

export default GradientCheckbox;
