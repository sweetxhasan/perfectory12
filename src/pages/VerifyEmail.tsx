import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Icon } from '@/components/icon';
import { BrandLogo } from '@/components/brand-logo';
import { LineBg } from '@/components/line-bg';

export default function VerifyEmailPage() {
  const { user, resendVerification, logout } = useAuth();
  const [, setLocation] = useLocation();

  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [countdown, setCountdown] = useState(0);
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!user) { setLocation('/login'); return; }
    if (user.emailVerified) { setLocation('/dashboard'); return; }
  }, [user, setLocation]);

  const checkVerified = useCallback(async () => {
    if (!auth.currentUser || auth.currentUser.emailVerified) return;
    setChecking(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        setVerified(true);
        setTimeout(() => setLocation('/dashboard'), 1800);
      }
    } finally {
      setChecking(false);
    }
  }, [setLocation]);

  useEffect(() => {
    const id = setInterval(checkVerified, 4000);
    return () => clearInterval(id);
  }, [checkVerified]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function handleResend() {
    setResendStatus('sending');
    try {
      await resendVerification();
      setResendStatus('sent');
      setCountdown(60);
    } catch {
      setResendStatus('error');
    }
  }

  async function handleLogout() {
    await logout();
    setLocation('/login');
  }

  if (!user) return null;

  const email = user.email ?? '';
  const name = user.displayName ?? email.split('@')[0];
  const avatarUrl = user.photoURL ?? `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`;

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-3 py-8 sm:px-4 sm:py-12">
      <LineBg />

      <div className="relative z-10 w-full max-w-[22rem] float-up sm:max-w-md">
        {/* Logo */}
        <div className="mb-6 flex justify-center sm:mb-8">
          <BrandLogo />
        </div>

        {/* Photo-style card */}
        <div className="relative rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">

          {/* Gradient header band */}
          <div className="relative h-24 bg-gradient-brand sm:h-28 overflow-hidden">
            {/* Decorative circles */}
            <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
            <span className="absolute -left-4 -bottom-4 h-16 w-16 rounded-full bg-white/10" />
            <span className="absolute right-1/3 top-1/4 h-10 w-10 rounded-full bg-white/5" />
          </div>

          {/* Avatar — floats between header and body */}
          <div className="absolute left-1/2 -translate-x-1/2 top-10 sm:top-12">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-card bg-card overflow-hidden shadow-lg ring-2 ring-brand/30 sm:h-24 sm:w-24">
                <img
                  src={avatarUrl}
                  alt={name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(name)}`;
                  }}
                />
              </div>
              {/* Status badge */}
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-amber-500 sm:h-7 sm:w-7">
                <Icon name="mail" size={12} className="text-white sm:hidden" />
                <Icon name="mail" size={14} className="text-white hidden sm:block" />
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 pb-6 pt-14 sm:px-6 sm:pb-7 sm:pt-16">
            {verified ? (
              /* ── Verified state ── */
              <div className="flex flex-col items-center gap-3 text-center sm:gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 sm:h-14 sm:w-14">
                  <Icon name="check" size={24} className="text-emerald-500 sm:hidden" />
                  <Icon name="check" size={28} className="text-emerald-500 hidden sm:block" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-emerald-600 sm:text-xl">Email Verified! 🎉</h1>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Taking you to your dashboard…</p>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full animate-[grow_1.8s_ease-in-out_forwards] rounded-full bg-gradient-brand" />
                </div>
              </div>
            ) : (
              <>
                {/* Name + Email */}
                <div className="text-center">
                  <h2 className="text-base font-semibold sm:text-lg">{name}</h2>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">{email}</p>
                </div>

                {/* Divider */}
                <div className="my-4 h-px bg-border sm:my-5" />

                {/* Title */}
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs text-amber-700 ring-1 ring-amber-400/40 sm:text-sm">
                    <span className={`h-2 w-2 rounded-full transition-all ${checking ? 'bg-amber-500 animate-pulse' : 'bg-amber-400'}`} />
                    {checking ? 'Checking…' : 'Verification Pending'}
                  </div>
                  <h1 className="mt-3 text-lg font-semibold sm:text-xl">Verify your email</h1>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    We sent a link to <span className="font-medium text-foreground">{email}</span>.
                    Click it to activate your account.
                  </p>
                </div>

                {/* Info box */}
                <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-50/70 px-3 py-2.5 sm:mt-5 sm:px-4 sm:py-3">
                  <p className="flex items-start gap-2 text-xs text-amber-700 sm:text-sm">
                    <Icon name="info" size={14} className="mt-0.5 shrink-0" />
                    <span>Can't find it? Check <strong>Spam</strong> or <strong>Promotions</strong> folder.</span>
                  </p>
                </div>

                {/* Resend feedback */}
                {resendStatus === 'sent' && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-700 sm:mt-4 sm:px-4 sm:py-2.5 sm:text-sm">
                    <Icon name="check" size={14} />
                    Email resent! Check your inbox.
                  </div>
                )}
                {resendStatus === 'error' && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive sm:mt-4 sm:px-4 sm:py-2.5 sm:text-sm">
                    <Icon name="shield" size={14} />
                    Failed to resend. Try again.
                  </div>
                )}

                {/* Actions */}
                <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:gap-3">
                  <button
                    onClick={handleResend}
                    disabled={resendStatus === 'sending' || countdown > 0}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-3 text-xs font-medium text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                  >
                    {resendStatus === 'sending' ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                    ) : (
                      <Icon name="mail" size={14} className="sm:hidden" />
                    )}
                    {resendStatus === 'sending' ? null : <Icon name="mail" size={16} className="hidden sm:block" />}
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend verification email'}
                  </button>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 text-xs text-muted-foreground transition hover:border-destructive/50 hover:text-destructive active:scale-[0.98] sm:text-sm"
                  >
                    <Icon name="logout" size={14} className="sm:hidden" />
                    <Icon name="logout" size={16} className="hidden sm:block" />
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-4 text-center text-[11px] text-muted-foreground sm:mt-5 sm:text-xs">
          Auto-checking every few seconds · Refresh to check manually
        </p>
      </div>

      <style>{`
        @keyframes grow { from { width: 0% } to { width: 100% } }
      `}</style>
    </div>
  );
}
