import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AuthLayout } from '@/components/auth-layout';
import { FloatingField } from '@/components/floating-field';
import { CutSubmitButton } from '@/components/cut-submit-button';
import { CUT_FRAME_PATH, CUT_FRAME_CLIP_PATH } from '@/components/cut-frame';

/** Premium checkmark mark used inside the "reset link sent" icon badge. */
function CheckmarkIcon({ size = 34 }: { size?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" width={size} height={size} fill="none">
      <path d="M9 21 16.5 28.5 31 12" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Square, radius-0 icon badge that reuses the exact same primary cut-frame
 * shape as the inputs/buttons (CUT_FRAME_PATH / CUT_FRAME_CLIP_PATH), so the
 * confirmation icon on the "sent" state matches the rest of the auth UI.
 */
function CutIconBadge({ children }: { children: React.ReactNode }) {
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setErrMsg('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrMsg(err instanceof Error ? err.message : 'We could not send the reset link. Please try again.');
    }
  }

  return (
    <AuthLayout
      title={status === 'sent' ? 'Check your inbox' : 'Reset your password'}
      subtitle={status === 'sent' ? 'Your next step is waiting in your email' : 'Recover access to your Perfectory Voice account'}
    >
      {status === 'sent' ? (
        <ResetCard>
          <div className="flex flex-col items-center gap-5 text-center">
            <CutIconBadge>
              <CheckmarkIcon />
            </CutIconBadge>
            <div className="max-w-sm">
              <p className="text-base leading-7 text-gray-600">
                If an account exists for <strong className="font-semibold text-gray-900">{email}</strong>, we&apos;ve sent a secure password reset link.
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-400">Check your inbox and spam folder. The link may take a moment to arrive.</p>
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
            <FloatingField
              id="fp-email"
              label="Email address"
              icon="mail"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <CutSubmitButton
              label="Send secure reset link"
              loadingLabel="Sending link..."
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
