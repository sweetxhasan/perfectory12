/** Twitter-style blue verified badge — shown next to admin names */
export function VerifiedBadge({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-label="Verified Admin"
      className={`inline-block shrink-0 ${className}`}
    >
      {/* Blue circle */}
      <circle cx="12" cy="12" r="11" fill="#3b82f6" />
      {/* Subtle inner highlight */}
      <circle cx="10" cy="9" r="3.5" fill="rgba(255,255,255,0.12)" />
      {/* Checkmark */}
      <path
        d="M7 12.5 10.5 16 17 8"
        stroke="white"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
