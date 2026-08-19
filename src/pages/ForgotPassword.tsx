import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { isEmailUsed } from '@/lib/user-store';
import { AuthLayout } from '@/components/auth-layout';
import { CutSubmitButton } from '@/components/cut-submit-button';
import { CutFrame, CUT_FRAME_PATH, CUT_FRAME_CLIP_PATH } from '@/components/cut-frame';
import { CutIconBadge } from '@/components/cut-icon-badge';
import { PremiumTooltip } from '@/components/premium-tooltip';
import { Icon } from '@/components/icon';

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

/** The standard "info" glyph (dot on top, stem below) — reused for both the
 *  format-error and "no account found" states, matching the icon language
 *  already used across the Signup fields. */
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
 * confirmation icon on the "sent" state matches the rest of the auth UI.
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
 * The same primary cut-corner frame used everywhere else, wrapped around the
 * whole reset-password card: radius 0, tinted backdrop, 1px cut-frame stroke
 * on top. Keeps the container itself on-brand with the inputs and buttons.
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
}: {
  value: string;
  onChange: (v: string) => void;
  notFoundSignal: number;
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
              <PremiumTooltip content="Account found — you can send the reset link." variant="valid">
                {({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="Account found — you can send the reset link."
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');
  /** Bumped whenever a Send click is blocked by a missing account, so the
   *  "no account found" tooltip remounts and auto-opens again even if it
   *  had already auto-closed from an earlier keystroke check. */
  const [notFoundSignal, setNotFoundSignal] = useState(0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !isValidEmailFormat(trimmed)) return;

    setStatus('loading');
    setErrMsg('');
    try {
      // Always verify against Firestore first — a reset link is only ever
      // sent for an email address that actually has an account on file.
      const accountExists = await isEmailUsed(trimmed);
      if (!accountExists) {
        setStatus('idle');
        setNotFoundSignal((n) => n + 1);
        return;
      }
      await sendPasswordResetEmail(auth, trimmed);
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrMsg(err instanceof Error ? err.message : 'We could not send the reset link. Please try again.');
    }
  }

  return (
    <AuthLayout
      title={status === 'sent' ? 'Reset link on its way' : 'Reset your password'}
      subtitle={status === 'sent' ? 'One click and you are back in' : 'Recover access to your Perfectory Voice account'}
    >
      {status === 'sent' ? (
        <ResetCard>
          <div className="flex flex-col items-center gap-5 text-center">
            <CutIconTile>
              <CheckmarkIcon />
            </CutIconTile>
            <div className="max-w-sm">
              <p className="text-base leading-7 text-gray-600">
                We&apos;ve emailed a secure reset link to <strong className="font-semibold text-gray-900">{email}</strong>. Open it within the next 60 minutes to choose a new password.
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-400">Don&apos;t see it? Check your spam or promotions folder — delivery can take a minute during busy hours.</p>
            </div>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6e1a52] transition hover:text-[#ec5252]">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4 6 10l6 6" /><path d="M7 10h8" /></svg> Return to login
            </Link>
          </div>
        </ResetCard>
      ) : (
        <ResetCard>
          {errMsg && (
            <div role="alert" className="mb-4 rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-600">{errMsg}</div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <ResetEmailField value={email} onChange={setEmail} notFoundSignal={notFoundSignal} />

            <CutSubmitButton
              label="Send secure reset link"
              loadingLabel="Checking your account..."
              loading={status === 'loading'}
              disabled={status === 'loading'}
            />
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">Remembered your password? <Link href="/login" className="font-semibold text-[#6e1a52] hover:text-[#ec5252]">Sign in</Link></p>
        </ResetCard>
      )}
    </AuthLayout>
  );
}
