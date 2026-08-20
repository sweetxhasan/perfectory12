import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { isEmailUsed } from '@/lib/user-store';
import { requestResetCode, confirmResetCode, submitNewPassword } from '@/lib/password-reset';
import { AuthLayout } from '@/components/auth-layout';
import { CutSubmitButton } from '@/components/cut-submit-button';
import { CutFrame, CUT_FRAME_PATH, CUT_FRAME_CLIP_PATH } from '@/components/cut-frame';
import { CutIconBadge } from '@/components/cut-icon-badge';
import { PremiumTooltip } from '@/components/premium-tooltip';
import { Icon } from '@/components/icon';
import { FloatingField } from '@/components/floating-field';
import { PasswordField, passwordMeetsPolicy } from '@/components/password-field';
import { CutOtpInput } from '@/components/otp-input';

const CODE_LENGTH = 6;

/** Basic email shape check — deliberately looser than Signup's Gmail-only
 *  rule, since a reset request may target any address already on file. */
function isValidEmailFormat(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Premium checkmark mark used inside the "reset link sent" icon badge. */
function CheckmarkIcon({ size = 34 }: { size?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" width={size} height={size} fill="none">
      <path d="M9 21 16.5 28.5 31 12" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The standard "info" glyph (dot on top, stem below) — reused for every
 *  format/notice icon across this flow, matching Signup's icon language. */
function InfoGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="11" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/**
 * Square, radius-0 icon badge that reuses the exact same primary cut-frame
 * shape as the inputs/buttons (CUT_FRAME_PATH / CUT_FRAME_CLIP_PATH), so the
 * confirmation icon on the "done" step matches the rest of the auth UI.
 */
function CutIconTile({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-none">
      <span
        className="absolute inset-0"
        style={{
          clipPath: CUT_FRAME_CLIP_PATH,
          background: 'linear-gradient(-45deg, #ec5252, #6e1a52)',
          boxShadow: '0 12px 28px -10px oklch(0.42 0.16 350 / 0.55)',
        }}
      />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={CUT_FRAME_PATH} fill="none" stroke="oklch(1 0 0 / 0.35)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="relative z-10 text-white">{children}</span>
    </div>
  );
}

/**
 * The same primary cut-corner frame used everywhere else, wrapped around
 * each step's card: radius 0, tinted backdrop, 1px cut-frame stroke on top.
 */
function ResetCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-md rounded-none px-6 py-9 sm:px-10 sm:py-11">
      <span
        className="absolute inset-0"
        style={{
          clipPath: CUT_FRAME_CLIP_PATH,
          background: 'color-mix(in oklch, var(--card) 94%, transparent)',
          backdropFilter: 'blur(6px)',
        }}
      />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={CUT_FRAME_PATH} fill="none" stroke="oklch(0.15 0 0 / 0.85)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="mb-4 rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-600">
      {message}
    </div>
  );
}

type CheckState = 'idle' | 'checking' | 'exists' | 'not_found';

/**
 * Reset-password email field — same visual language as Signup's EmailField
 * (cut-frame container, right-aligned status icon, premium cut-corner
 * tooltip) but checking the *opposite* condition: it looks up Firestore for
 * an account that already exists for this address, since that's what a
 * password reset requires. A debounced live check drives the inline
 * icon + tooltip as the user types, and `notFoundSignal` lets the parent
 * force the "no account found" tooltip open again (e.g. after a blocked
 * Send click) by remounting it.
 */
function ResetEmailField({
  value,
  onChange,
  notFoundSignal,
  onCheckChange,
}: {
  value: string;
  onChange: (v: string) => void;
  notFoundSignal: number;
  /** Reports the live lookup state up to the parent so it can gate the
   *  "Send reset code" submit button until the account is confirmed. */
  onCheckChange: (check: CheckState) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = value.trim();
  const formatValid = trimmed !== '' && isValidEmailFormat(trimmed);
  const isFormatError = trimmed !== '' && !formatValid;

  const [check, setCheck] = useState<CheckState>('idle');
  const notFound = formatValid && check === 'not_found';
  const isValid = formatValid && check === 'exists';
  const statusCls = isValid ? 'is-valid' : isFormatError || notFound ? 'is-error' : '';

  useEffect(() => {
    onCheckChange(formatValid ? check : 'idle');
  }, [formatValid, check, onCheckChange]);

  useEffect(() => {
    if (!formatValid) {
      setCheck('idle');
      return;
    }
    setCheck('checking');
    let cancelled = false;
    const timer = setTimeout(() => {
      isEmailUsed(trimmed)
        .then((used) => { if (!cancelled) setCheck(used ? 'exists' : 'not_found'); })
        // Fail open on a network hiccup — don't block the user on a lookup error.
        .catch(() => { if (!cancelled) setCheck('exists'); });
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [formatValid, trimmed]);

  const iconCls = isValid
    ? 'text-emerald-500'
    : isFormatError || notFound
      ? 'text-destructive'
      : 'text-muted-foreground/50';

  return (
    <div className={`pv-field-wrap flex flex-col gap-1.5 ${statusCls}`}>
      <span className="pv-cut-label">Email address</span>

      <div className={`pv-cut-field relative flex h-14 items-stretch ${statusCls}`} onClick={() => inputRef.current?.focus()}>
        <div className="pv-cut-bg" />
        <CutFrame />

        <div className="relative z-20 flex min-w-0 flex-1 items-center">
          <span className={`shrink-0 pl-4 transition-colors duration-200 ${iconCls}`}>
            <Icon name="mail" size={18} />
          </span>

          <input
            ref={inputRef}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-w-0 flex-1 bg-transparent px-3.5 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
            aria-label="Email address"
            required
          />

          {/* Status icon — loading spinner, "no account found" notice
              (auto-opens for 3s), valid checkmark, or a format notice.
              No default placeholder icon. */}
          <div className="flex items-center pr-3">
            {check === 'checking' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin text-muted-foreground" aria-label="Checking...">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.4" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            ) : notFound ? (
              <PremiumTooltip
                key={`not-found-${notFoundSignal}`}
                content="No account found with this email address"
                variant="invalid"
                autoOpenDuration={3000}
              >
                {({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="No account found with this email address"
                    className="flex items-center justify-center rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                  >
                    <CutIconBadge variant="invalid" size={18}>
                      <InfoGlyph />
                    </CutIconBadge>
                  </button>
                )}
              </PremiumTooltip>
            ) : isValid ? (
              <PremiumTooltip content="Account found — you can send the reset code." variant="valid">
                {({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="Account found — you can send the reset code."
                    className="flex items-center justify-center rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.60_0.15_152)]/40"
                  >
                    <CutIconBadge variant="valid" size={18}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </CutIconBadge>
                  </button>
                )}
              </PremiumTooltip>
            ) : isFormatError ? (
              <PremiumTooltip content="Enter a valid email address" variant="invalid">
                {({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="Enter a valid email address"
                    className="flex items-center justify-center rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                  >
                    <CutIconBadge variant="invalid" size={18}>
                      <InfoGlyph />
                    </CutIconBadge>
                  </button>
                )}
              </PremiumTooltip>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Plain "confirm password" field — no strength meter, just a live match check against the new password. */
function ConfirmPasswordField({
  value,
  onChange,
  matchTarget,
}: {
  value: string;
  onChange: (v: string) => void;
  matchTarget: string;
}) {
  const [showPw, setShowPw] = useState(false);
  const touched = value.length > 0;
  const matches = touched && value === matchTarget;
  const mismatch = touched && matchTarget.length > 0 && value !== matchTarget;

  return (
    <FloatingField
      id="reset-confirm-password"
      label="Confirm new password"
      placeholder="Re-enter your new password"
      icon="lock"
      type={showPw ? 'text' : 'password'}
      autoComplete="new-password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      status={matches ? 'valid' : mismatch ? 'error' : 'default'}
      required
      rightSlot={
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPw((p) => !p)}
          className="mr-3.5 shrink-0 text-gray-400 transition hover:text-gray-600"
          aria-label={showPw ? 'Hide password' : 'Show password'}
        >
          {showPw ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12S5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
            </svg>
          )}
        </button>
      }
      hint={mismatch ? <p className="pl-1 text-[11px] text-red-500">Passwords don&apos;t match</p> : null}
    />
  );
}

type Step = 'email' | 'code' | 'password' | 'done';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  /** Mirrors ResetEmailField's live account lookup — the "Send reset code"
   *  button stays disabled (dimmed) until this reaches 'exists'. */
  const [emailCheck, setEmailCheck] = useState<CheckState>('idle');
  /** Bumped whenever a Send click is blocked by a missing account, so the
   *  "no account found" tooltip remounts and auto-opens again even if it
   *  had already auto-closed from an earlier keystroke check. */
  const [notFoundSignal, setNotFoundSignal] = useState(0);

  async function onSubmitEmail(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !isValidEmailFormat(trimmed)) return;

    setLoading(true);
    setError('');
    try {
      // Always verify against Firestore first — a code is only ever sent
      // for an email address that actually has an account on file.
      const accountExists = await isEmailUsed(trimmed);
      if (!accountExists) {
        setLoading(false);
        setNotFoundSignal((n) => n + 1);
        return;
      }
      await requestResetCode(trimmed);
      setCode('');
      setStep('code');
    } catch (err) {
      setError((err as Error).message || 'We could not send the reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setResending(true);
    setError('');
    try {
      await requestResetCode(email.trim());
      setCode('');
    } catch (err) {
      setError((err as Error).message || 'Failed to resend the code.');
    } finally {
      setResending(false);
    }
  }

  async function onSubmitCode() {
    if (code.length !== CODE_LENGTH) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await confirmResetCode(email.trim(), code);
      setStep('password');
    } catch (err) {
      setError((err as Error).message || 'Invalid code. Please try again.');
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitPassword(e: FormEvent) {
    e.preventDefault();
    if (!passwordMeetsPolicy(newPassword)) {
      setError('Please choose a stronger password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords don\u2019t match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await submitNewPassword(email.trim(), code, newPassword);
      setStep('done');
    } catch (err) {
      setError((err as Error).message || 'We could not update your password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<Step, { title: string; subtitle: string }> = {
    email: { title: 'Reset your password', subtitle: 'Recover access to your Perfectory Voice account' },
    code: { title: 'Enter your code', subtitle: 'One quick step before you can set a new password' },
    password: { title: 'Choose a new password', subtitle: 'Almost there — set a new password for your account' },
    done: { title: 'Password updated', subtitle: 'You can now sign in with your new password' },
  };

  return (
    <AuthLayout title={titles[step].title} subtitle={titles[step].subtitle}>
      {step === 'done' ? (
        <ResetCard>
          <div className="flex flex-col items-center gap-5 text-center">
            <CutIconTile>
              <CheckmarkIcon />
            </CutIconTile>
            <div className="max-w-sm">
              <p className="text-base leading-7 text-gray-600">
                Your password has been updated. You can now sign in to <strong className="font-semibold text-gray-900">{email}</strong> with your new password.
              </p>
            </div>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6e1a52] transition hover:text-[#ec5252]">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4 6 10l6 6" /><path d="M7 10h8" /></svg> Return to login
            </Link>
          </div>
        </ResetCard>
      ) : step === 'code' ? (
        <ResetCard>
          {error && <ErrorBanner message={error} />}
          <div className="flex flex-col items-center text-center">
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

            <div className="mt-6 w-full">
              <CutOtpInput
                length={CODE_LENGTH}
                value={code}
                onChange={(next) => { setCode(next); if (error) setError(''); }}
                autoFocus
                ariaLabel="Reset code"
              />
            </div>

            <div className="mt-6 w-full">
              <CutSubmitButton
                label="Verify code"
                loadingLabel="Verifying…"
                loading={loading}
                disabled={code.length !== CODE_LENGTH}
                onClick={onSubmitCode}
                type="button"
              />
            </div>

            <button
              type="button"
              onClick={onResend}
              disabled={resending}
              className="mt-4 text-xs font-medium underline-offset-2 transition hover:underline disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              style={{ color: 'oklch(0.42 0.16 350)' }}
            >
              {resending ? 'Resending…' : 'Resend code'}
            </button>

            <p className="mt-5 text-center text-sm text-gray-500">
              Wrong email?{' '}
              <button
                type="button"
                onClick={() => { setStep('email'); setError(''); }}
                className="font-semibold text-[#6e1a52] transition hover:underline"
              >
                Go back
              </button>
            </p>
          </div>
        </ResetCard>
      ) : step === 'password' ? (
        <ResetCard>
          {error && <ErrorBanner message={error} />}
          <form onSubmit={onSubmitPassword} className="flex flex-col gap-4">
            <PasswordField id="reset-new-password" label="New password" placeholder="Create a strong password" value={newPassword} onChange={setNewPassword} />
            <ConfirmPasswordField value={confirmPassword} onChange={setConfirmPassword} matchTarget={newPassword} />
            <CutSubmitButton label="Update password" loadingLabel="Updating…" loading={loading} />
          </form>
        </ResetCard>
      ) : (
        <ResetCard>
          {error && <ErrorBanner message={error} />}
          <form onSubmit={onSubmitEmail} className="flex flex-col gap-5">
            <ResetEmailField value={email} onChange={setEmail} notFoundSignal={notFoundSignal} onCheckChange={setEmailCheck} />
            <CutSubmitButton
              label="Send reset code"
              loadingLabel="Checking your account..."
              loading={loading}
              disabled={loading || emailCheck !== 'exists'}
            />
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">Remembered your password? <Link href="/login" className="font-semibold text-[#6e1a52] hover:text-[#ec5252]">Sign in</Link></p>
        </ResetCard>
      )}
    </AuthLayout>
  );
}
