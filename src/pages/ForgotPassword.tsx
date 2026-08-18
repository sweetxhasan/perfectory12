import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AuthLayout } from '@/components/auth-layout';

function RecoveryIcon({ sent = false }: { sent?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      {sent ? (
        <>
          <rect x="11" y="16" width="42" height="32" rx="7" />
          <path d="m13 20 19 15 19-15" />
          <path d="m22 39 6 6 14-15" className="text-[#6e1a52]" />
        </>
      ) : (
        <>
          <rect x="9" y="17" width="46" height="32" rx="8" />
          <path d="m11 20 21 16 21-16" />
          <path d="M32 36 19 46M32 36l13 10" />
          <circle cx="49" cy="15" r="7" className="fill-white text-[#ec5252]" />
          <path d="m46 15 2 2 4-5" className="text-[#ec5252]" />
        </>
      )}
    </svg>
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
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#6e1a52]/20 bg-[#6e1a52]/[0.04] text-[#6e1a52]">
            <RecoveryIcon sent />
          </div>
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
      ) : (
        <div className="w-full max-w-md">
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#6e1a52]/20 bg-white text-[#6e1a52] shadow-[0_12px_30px_rgba(110,26,82,.08)]">
              <RecoveryIcon />
            </div>
            <p className="max-w-sm text-sm leading-6 text-gray-500">No worries. Enter the email connected to your account and we&apos;ll send a secure link to create a new password.</p>
          </div>

          {errMsg && (
            <div role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-600">{errMsg}</div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="fp-email" className="text-sm font-semibold text-gray-700">Email address</label>
              <div className="flex items-center rounded-2xl border border-gray-200 bg-white transition focus-within:border-[#6e1a52] focus-within:ring-4 focus-within:ring-[#6e1a52]/10">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="ml-4 h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                <input id="fp-email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent px-3.5 py-4 text-base text-gray-900 outline-none placeholder:text-gray-400" />
              </div>
            </div>

            <button type="submit" disabled={status === 'loading'} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(-45deg,#ec5252,#6e1a52)] py-4 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(110,26,82,.18)] transition hover:opacity-95 active:scale-[.99] disabled:opacity-60">
              {status === 'loading' ? <span className="h-5 w-5 animate-spin rounded-full border border-white/40 border-t-white" /> : <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h12" /><path d="m10 5 5 5-5 5" /></svg>}
              Send secure reset link
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">Remembered your password? <Link href="/login" className="font-semibold text-[#6e1a52] hover:text-[#ec5252]">Sign in</Link></p>
        </div>
      )}
    </AuthLayout>
  );
}
