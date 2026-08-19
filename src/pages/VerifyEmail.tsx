import { useState, useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { AuthLayout } from '@/components/auth-layout';
import { SEOHead } from '@/components/seo-head';
import { PAGE_SEO } from '@/lib/seo-config';
import { CutFrame } from '@/components/cut-frame';
import { CutSubmitButton } from '@/components/cut-submit-button';
import { Icon } from '@/components/icon';
import { updateUserProfile } from '@/lib/user-store';
import { requestSignupCode, confirmSignupCode } from '@/lib/email-verify';

const CODE_LENGTH = 6;

/* ════════════════════════════════════════════
   Verify Email Page — replaces the old signup
   overlay. Reached after signup (account already
   created, emailVerified: false) or after logging
   in to an unverified account. Auto-sends a code
   on mount and lets the user resend as many times
   as they want — resend is completely unlimited,
   with no cooldown or cap of any kind.
════════════════════════════════════════════ */
export default function VerifyEmailPage() {
  const { user, profile, loading, logout, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [sentOnce, setSentOnce] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const isVerified = profile?.emailVerified !== false;

  /* Guard: must be signed in and unverified to be here. Already-verified
     accounts (or anyone not signed in) get redirected away immediately. */
  useEffect(() => {
    if (loading) return;
    if (!user) { setLocation('/login'); return; }
    if (isVerified) { setLocation('/dashboard'); return; }
  }, [loading, user, isVerified, setLocation]);

  const email = profile?.email ?? user?.email ?? '';
  const name = profile?.name ?? user?.displayName ?? undefined;

  const sendCode = async (isResend: boolean) => {
    if (!email) return;
    setError('');
    if (isResend) setResending(true);
    try {
      await requestSignupCode(email, name);
      setSentOnce(true);
    } catch (err) {
      setError((err as Error).message || 'Failed to send verification code.');
    } finally {
      if (isResend) setResending(false);
    }
  };

  // Auto-send the first code once we know who's signed in and that they
  // still need verifying.
  useEffect(() => {
    if (loading || !user || isVerified || !email || sentOnce) return;
    setSentOnce(true);
    sendCode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, isVerified, email, sentOnce]);

  useEffect(() => {
    if (!loading && user && !isVerified) setTimeout(() => inputRefs.current[0]?.focus(), 50);
  }, [loading, user, isVerified]);

  const code = digits.join('');

  function setDigitAt(index: number, value: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleChange(index: number, raw: string) {
    const value = raw.replace(/\D/g, '').slice(-1);
    setDigitAt(index, value);
    if (error) setError('');
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      // Deleting is a single keypress per digit: clear whatever the
      // current box holds and immediately hop back one box, so holding
      // Backspace erases the whole code without ever clicking into
      // another input.
      e.preventDefault();
      if (digits[index]) {
        setDigitAt(index, '');
        if (index > 0) inputRefs.current[index - 1]?.focus();
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        setDigitAt(index - 1, '');
      }
      if (error) setError('');
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    // Always fill starting from the very first box, no matter which box
    // the paste landed in.
    setDigits(() => {
      const next = Array(CODE_LENGTH).fill('');
      for (let i = 0; i < CODE_LENGTH && i < pasted.length; i++) {
        next[i] = pasted[i];
      }
      return next;
    });
    const lastFilled = Math.min(pasted.length, CODE_LENGTH) - 1;
    inputRefs.current[Math.max(lastFilled, 0)]?.focus();
    if (error) setError('');
  }

  async function handleVerify() {
    if (code.length !== CODE_LENGTH || !user) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      // The server sends the welcome email itself, in this same request,
      // the instant the code is confirmed — no separate client follow-up
      // call that could get cut off by the redirect right after.
      await confirmSignupCode(email, code, name);
      // Flip the profile's emailVerified flag — the user's own Firestore
      // doc, so this is a normal client-side write under their own uid.
      await updateUserProfile(user.uid, { emailVerified: true });
      await refreshProfile();
      setLocation('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Invalid code. Please try again.');
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      setLocation('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  // Still resolving auth, already verified, or not signed in — the effect
  // above is already redirecting; render nothing to avoid a flash.
  if (loading || !user || isVerified) return null;

  return (
    <>
      <SEOHead {...(PAGE_SEO.verifyEmail ?? PAGE_SEO.login)} />
      <AuthLayout
        title="Verify your email"
        subtitle="One quick step before you can start generating voices"
      >
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="pv-cut-field relative flex h-14 w-14 items-center justify-center text-brand-2 sm:h-16 sm:w-16">
            <div className="pv-cut-bg" />
            <CutFrame />
            <Icon name="mail" size={26} className="relative z-10" />
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Enter the 6-digit code sent to
            <br />
            <span className="font-medium text-foreground">{email}</span>
          </p>

          {/* Code inputs */}
          <div className="mt-6 flex justify-center gap-2 sm:gap-2.5">
            {digits.map((d, i) => (
              <div key={i} className="pv-cut-field relative h-12 w-10 sm:h-14 sm:w-12">
                <div className="pv-cut-bg" />
                <CutFrame />
                <input
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
                  className="relative z-20 h-full w-full bg-transparent text-center text-lg font-bold text-foreground outline-none sm:text-xl"
                />
              </div>
            ))}
          </div>

          {/* Error container */}
          {error && (
            <div className="relative mt-4 w-full px-4 py-2.5" style={{ clipPath: 'polygon(3% 0%, 97% 0%, 100% 30%, 100% 70%, 97% 100%, 3% 100%, 0% 70%, 0% 30%)' }}>
              <div className="absolute inset-0" style={{ clipPath: 'polygon(3% 0%, 97% 0%, 100% 30%, 100% 70%, 97% 100%, 3% 100%, 0% 70%, 0% 30%)', background: 'color-mix(in oklch, var(--destructive) 8%, transparent)' }} />
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path d="M3 0.5 L97 0.5 L99.7 30 L99.7 70 L97 99.5 L3 99.5 L0.3 70 L0.3 30 Z" fill="none" stroke="var(--destructive)" strokeOpacity="0.35" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              </svg>
              <p className="relative z-10 flex items-center justify-center gap-2 text-xs text-destructive sm:text-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </p>
            </div>
          )}

          {/* Verify button */}
          <div className="mt-6 w-full">
            <CutSubmitButton
              label="Verify"
              loadingLabel="Verifying…"
              loading={verifying}
              disabled={code.length !== CODE_LENGTH}
              onClick={handleVerify}
              type="button"
            />
          </div>

          {/* Resend — completely unlimited, no cooldown or cap. Only
              disabled for the moment a request is actually in flight, so
              a user can't fire a dozen overlapping sends by mashing the
              button. */}
          <button
            type="button"
            onClick={() => sendCode(true)}
            disabled={resending}
            className="mt-4 text-xs font-medium underline-offset-2 transition hover:underline disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            style={{ color: 'oklch(0.42 0.16 350)' }}
          >
            {resending ? 'Resending…' : 'Resend code'}
          </button>

          {/* Wrong account? Log out and start over */}
          <p className="mt-5 text-center text-sm text-gray-500">
            Wrong account?{' '}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="font-semibold transition hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              style={{ color: 'oklch(0.42 0.16 350)' }}
            >
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </p>
        </div>
      </AuthLayout>
    </>
  );
}
