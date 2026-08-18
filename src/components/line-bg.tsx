export function LineBg() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 line-grid opacity-70" />
      <div className="sweep-line top-24" style={{ animationDelay: '0s' }} />
      <div className="sweep-line top-1/2" style={{ animationDelay: '1.5s' }} />
      <div className="sweep-line top-3/4" style={{ animationDelay: '3s' }} />
      <svg className="absolute inset-0 h-full w-full opacity-[0.15]" preserveAspectRatio="none">
        <line x1="0" y1="20%" x2="100%" y2="20%" stroke="var(--brand-2)" strokeWidth="1" className="animated-line" />
        <line x1="0" y1="80%" x2="100%" y2="80%" stroke="var(--brand-3)" strokeWidth="1" className="animated-line" />
      </svg>
    </div>
  );
}
