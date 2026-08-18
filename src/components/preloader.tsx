import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';

/* ─── Context ──────────────────────────────────────────────────────── */
interface PreloaderCtx {
  /** Call this to trigger a short navigation preloader */
  triggerNav: () => void;
}
const PreloaderContext = createContext<PreloaderCtx | null>(null);
export const usePreloader = () => useContext(PreloaderContext);

/* ─── Visual Screen ────────────────────────────────────────────────── */
type ScreenMode = 'boot' | 'nav';

function PreloaderScreen({
  hiding,
  mode,
}: {
  hiding: boolean;
  mode: ScreenMode;
}) {
  const [dots, setDots] = useState('');
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setPhase(0);
    setDots('');
    const t1 = setTimeout(() => setPhase(1), 120);
    const t2 = setTimeout(() => setPhase(2), 500);
    const d = setInterval(
      () => setDots((v) => (v.length >= 3 ? '' : v + '.')),
      420,
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(d);
    };
  }, [mode]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-400 ${
        hiding ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* Grid bg */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow */}
      <div
        className="absolute h-72 w-72 rounded-full opacity-20"
        style={{
          background:
            'radial-gradient(circle, oklch(0.65 0.22 250) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        {/* Rings + icon */}
        <div
          className={`relative flex items-center justify-center transition-all duration-500 ${
            phase >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
        >
          <span
            className="absolute h-28 w-28 animate-spin rounded-full border border-brand/20"
            style={{ animationDuration: '4s' }}
          />
          <span
            className="absolute h-20 w-20 animate-spin rounded-full border border-brand/40 border-t-brand"
            style={{ animationDuration: '1.6s' }}
          />
          <span
            className="absolute h-14 w-14 animate-spin rounded-full border border-brand-2/30 border-b-brand-2"
            style={{ animationDuration: '1s', animationDirection: 'reverse' }}
          />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-brand shadow-lg ring-glow">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </span>
        </div>

        {/* Brand + label */}
        <div
          className={`text-center transition-all duration-500 delay-100 ${
            phase >= 1
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0'
          }`}
        >
          <p className="text-xl font-semibold tracking-tight">
            Perfectory <span className="text-gradient">Voice</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Loading{dots}
          </p>
        </div>

        {/* Waveform */}
        <div
          className={`flex items-end gap-1 transition-all duration-500 delay-200 ${
            phase >= 2 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {[3, 5, 8, 6, 10, 7, 4, 9, 5, 3, 6, 8, 4].map((h, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-gradient-to-t from-brand to-brand-2"
              style={{
                height: `${h * 3}px`,
                animation: `preloader-wave 1.2s ease-in-out infinite`,
                animationDelay: `${i * 0.09}s`,
              }}
            />
          ))}
        </div>

        {/* Progress shimmer */}
        <div
          className={`w-52 overflow-hidden rounded-full bg-border/50 transition-all duration-500 delay-300 ${
            phase >= 2 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="h-0.5 animate-preloader-bar rounded-full bg-gradient-to-r from-brand via-brand-2 to-brand" />
        </div>
      </div>
    </div>
  );
}

/* ─── Navigation Watcher (must be inside WouterRouter) ─────────────── */
export function NavigationWatcher() {
  const [pathname] = useLocation();
  const ctx = usePreloader();
  const isFirst = useRef(true);

  useEffect(() => {
    // Skip the very first mount — boot preloader already handles it
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    ctx?.triggerNav();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/* ─── Gate ─────────────────────────────────────────────────────────── */
export function PreloaderGate({ children }: { children: ReactNode }) {
  const { loading: authLoading } = useAuth();

  // ── Boot state ──────────────────────────────────────────────────────
  const [bootHiding, setBootHiding] = useState(false);
  const [bootGone, setBootGone] = useState(false);
  const bootStartedHide = useRef(false);

  // ── Nav state ───────────────────────────────────────────────────────
  const [navVisible, setNavVisible] = useState(false);
  const [navHiding, setNavHiding] = useState(false);
  const [navGone, setNavGone] = useState(true);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Boot: hide as soon as Firebase auth resolves
  useEffect(() => {
    if (!authLoading && !bootStartedHide.current) {
      bootStartedHide.current = true;
      setBootHiding(true);
      setTimeout(() => setBootGone(true), 500);
    }
  }, [authLoading]);

  // Navigation trigger
  const triggerNav = useCallback(() => {
    // Clear any pending nav hide
    if (navTimer.current) clearTimeout(navTimer.current);

    setNavGone(false);
    setNavHiding(false);
    setNavVisible(true);

    // Show for 900 ms, then fade out
    navTimer.current = setTimeout(() => {
      setNavHiding(true);
      setTimeout(() => {
        setNavVisible(false);
        setNavGone(true);
      }, 420);
    }, 900);
  }, []);

  return (
    <PreloaderContext.Provider value={{ triggerNav }}>
      {/* Boot preloader */}
      {!bootGone && <PreloaderScreen hiding={bootHiding} mode="boot" />}

      {/* Navigation preloader */}
      {!navGone && navVisible && (
        <PreloaderScreen hiding={navHiding} mode="nav" />
      )}

      {children}
    </PreloaderContext.Provider>
  );
}
