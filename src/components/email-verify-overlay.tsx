import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { CutFrame, CUT_FRAME_PATH, CUT_FRAME_CLIP_PATH } from '@/components/cut-frame';
import { CutSubmitButton } from '@/components/cut-submit-button';
import { Icon } from '@/components/icon';
import { requestSignupCode, confirmSignupCode } from '@/lib/email-verify';

const CODE_LENGTH = 6;

/** Small 4-cut single-digit input box, reusing the same cut geometry as the badge icons. */
const DIGIT_CUT_CLIP_PATH = 'polygon(18% 0%, 82% 0%, 100% 18%, 100% 82%, 82% 100%, 18% 100%, 0% 82%, 0% 18%)';
const DIGIT_CUT_PATH = 'M18 0.9 L82 0.9 L99.1 18 L99.1 82 L82 99.1 L18 99.1 L0.9 82 L0.9 18 Z';

interface EmailVerifyOverlayProps {
  open: boolean;
  email: string;
  name?: string;
  onClose: () => void;
  /** Called after the OTP is confirmed server-side. Should create the account. */
  onVerified: () => Promise<void>;
  /**
   * Seconds left on the resend cooldown from a code the caller already sent
   * before opening this overlay (e.g. Signup.tsx sends the first code itself
   * so it can show a form-level error if the email service is unavailable).
   * When set, the overlay skips its own initial send.
   */
  initialCooldownSec?: number;
}

export function EmailVerifyOverlay({ open, email, name, onClose, onVerified, initialCooldownSec }: EmailVerifyOverlayProps) {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [sentOnce, setSentOnce] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const sendCode = async (isResend: boolean) => {
    setError('');
    if (isResend) setResending(true);
    try {
      const res = await requestSignupCode(email, name);
      setCooldown(res.cooldownSec);
      setSentOnce(true);
    } catch (err) {
      const cooldownMs = (err as { cooldownRemainingMs?: number })?.cooldownRemainingMs;
      if (cooldownMs) setCooldown(Math.ceil(cooldownMs / 1000));
      setError((err as Error).message || 'Failed to send verification code.');
    } finally {
      if (isResend) setResending(false);
    }
  };

  // Send the initial code once, the first time the overlay opens — unless
  // the caller already sent one (initialCooldownSec is set), in which case
  // just start the matching cooldown instead of sending a second email.
  useEffect(() => {
    if (!open) {
      setDigits(Array(CODE_LENGTH).fill(''));
      setError('');
      setSentOnce(false);
      return;
    }
    if (sentOnce) return;
    setSentOnce(true);
    if (typeof initialCooldownSec === 'number') {
      setCooldown(initialCooldownSec);
      return;
    }
    sendCode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setTimeout(() => inputRefs.current[0]?.focus(), 50);
  }, [open]);

  if (!open) return null;

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
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        setDigitAt(index - 1, '');
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(index: number, e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    setDigits((prev) => {
      const next = [...prev];
      let cursor = index;
      for (const ch of pasted) {
        if (cursor >= CODE_LENGTH) break;
        next[cursor] = ch;
        cursor++;
      }
      return next;
    });
    const lastFilled = Math.min(index + pasted.length, CODE_LENGTH) - 1;
    inputRefs.current[Math.max(lastFilled, 0)]?.focus();
    if (error) setError('');
  }

  async function handleVerify() {
    if (code.length !== CODE_LENGTH) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      await confirmSignupCode(email, code);
      await onVerified();
    } catch (err) {
      setError((err as Error).message || 'Invalid code. Please try again.');
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Verify your email"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-3 py-8 backdrop-blur-sm sm:px-4"
    >
      <div className="relative w-full max-w-[22rem] sm:max-w-md">
        {/* Close chip — premium cut-corner square, top-right, outside/above the card */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="group absolute -right-1 -top-12 z-10 flex h-9 w-9 items-center justify-center text-white/85 transition hover:text-white sm:-top-14"
        >
          <span
            className="absolute inset-0"
            style={{ clipPath: DIGIT_CUT_CLIP_PATH, background: 'oklch(1 0 0 / 0.12)' }}
          />
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d={DIGIT_CUT_PATH} fill="none" stroke="oklch(1 0 0 / 0.55)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" className="transition-[stroke] group-hover:stroke-white" />
          </svg>
          <Icon name="close" size={16} className="relative z-10" />
        </button>

        {/* Card */}
        <div className="relative bg-card p-6 shadow-2xl sm:p-8" style={{ clipPath: CUT_FRAME_CLIP_PATH }}>
          <div className="absolute inset-0" style={{ clipPath: CUT_FRAME_CLIP_PATH, background: 'var(--card)' }} />
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d={CUT_FRAME_PATH} fill="none" stroke="oklch(0.15 0 0 / 0.14)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          </svg>

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Icon */}
            <div className="relative flex h-14 w-14 items-center justify-center text-[oklch(0.42_0.16_350)] sm:h-16 sm:w-16">
              <span className="absolute inset-0" style={{ clipPath: DIGIT_CUT_CLIP_PATH, background: 'color-mix(in oklch, var(--brand-2) 12%, transparent)' }} />
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path d={DIGIT_CUT_PATH} fill="none" stroke="currentColor" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
              </svg>
              <Icon name="mail" size={26} className="relative z-10" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-foreground sm:text-xl">Verify your email</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Enter the 6-digit code sent to
              <br />
              <span className="font-medium text-foreground">{email}</span>
            </p>

            {/* Code inputs */}
            <div className="mt-6 flex justify-center gap-2 sm:gap-2.5">
              {digits.map((d, i) => (
                <div key={i} className="pv-cut-field relative h-12 w-10 sm:h-14 sm:w-12">
                  <div className="pv-cut-bg" style={{ clipPath: DIGIT_CUT_CLIP_PATH }} />
                  <svg className="pv-cut-frame-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <path className="pv-cut-frame" d={DIGIT_CUT_PATH} />
                  </svg>
                  <input
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={(e) => handlePaste(i, e)}
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

            {/* Resend */}
            <button
              type="button"
              onClick={() => sendCode(true)}
              disabled={resending || cooldown > 0}
              className="mt-4 text-xs font-medium text-muted-foreground underline-offset-2 transition hover:underline disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              style={{ color: cooldown > 0 ? undefined : 'oklch(0.42 0.16 350)' }}
            >
              {resending ? 'Resending…' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailVerifyOverlay;
