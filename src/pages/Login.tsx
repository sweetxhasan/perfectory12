import { useState, useEffect, type FormEvent } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import {
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { friendlyAuthError } from '@/lib/auth-errors';
import { AuthLayout } from '@/components/auth-layout';
import { SEOHead } from '@/components/seo-head';
import { PAGE_SEO } from '@/lib/seo-config';
import { GoogleOneTap } from '@/components/google-one-tap';
import { GoogleButton } from '@/components/google-button';
import { FloatingField } from '@/components/floating-field';
import { GradientCheckbox } from '@/components/gradient-checkbox';
import { CutSubmitButton } from '@/components/cut-submit-button';

const REMEMBER_KEY = 'pv_remember_me';

/* ── Remember-me checkbox ── */
function RememberCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <GradientCheckbox checked={checked} onChange={onChange} label={<span className="text-sm text-gray-500 transition-colors group-hover:text-gray-700">Remember me</span>} />;
}

/* ── Eye icon toggle ── */
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12S5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
    </svg>
  );
}

export default function LoginPage() {
  const { user, signInEmail, signInGoogle } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const redirectTo = new URLSearchParams(search).get('redirect') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    try { return localStorage.getItem(REMEMBER_KEY) === 'true'; } catch { return false; }
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'generic' | 'wrong-password'>('generic');

  useEffect(() => {
    if (!user) return;
    if (user.emailVerified) setLocation(redirectTo);
    else setLocation('/verify-email');
  }, [user, setLocation, redirectTo]);

  function handleRemember(v: boolean) {
    setRememberMe(v);
    try { localStorage.setItem(REMEMBER_KEY, String(v)); } catch { /* ignore */ }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setErrorType('generic');
    setLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInEmail(email, password);
      setLocation(redirectTo);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      const isWrongPassword =
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found';
      setErrorType(isWrongPassword ? 'wrong-password' : 'generic');
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setError('');
    setGoogleLoading(true);
    try {
      await signInGoogle();
      setLocation(redirectTo);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <>
      <SEOHead {...PAGE_SEO.login} />
      <GoogleOneTap />
      <AuthLayout
        title="Welcome back"
        subtitle="Sign in to your Perfectory Voice account"
      >
        {/* Error banner */}
        {error && (
          <div
            className="mb-5 flex items-start gap-3 rounded-2xl p-4 text-sm"
            style={{ background: 'oklch(0.97 0.04 25)', border: '1px solid oklch(0.88 0.08 25)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="oklch(0.55 0.20 25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ color: 'oklch(0.40 0.18 25)' }}>
              {error}
              {errorType === 'wrong-password' && (
                <>{' '}<Link href="/forgot-password" className="font-semibold underline">Reset password</Link></>
              )}
            </span>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <FloatingField
            id="login-email"
            label="Email address"
            placeholder="you@example.com"
            icon="mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* Password */}
          <FloatingField
            id="login-password"
            label="Password"
            placeholder="Enter your password"
            icon="lock"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            rightSlot={
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw((p) => !p)}
                className="mr-3.5 shrink-0 text-gray-400 transition hover:text-gray-600"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showPw} />
              </button>
            }
          />

          {/* Remember me + Forgot */}
          <div className="flex items-center justify-between">
            <RememberCheckbox checked={rememberMe} onChange={handleRemember} />
            <Link
              href="/forgot-password"
              className="text-xs font-medium transition hover:underline"
              style={{ color: 'oklch(0.42 0.16 350)' }}
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <CutSubmitButton
            className="mt-1"
            loading={loading}
            label="Log In"
            loadingLabel="Signing in…"
          />
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-[11px] font-medium uppercase tracking-widest text-gray-400">or</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Google */}
        <GoogleButton onClick={onGoogle} loading={googleLoading} disabled={loading} />

        <p className="mt-5 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link
            href="/signup"
            className="font-semibold transition hover:underline"
            style={{ color: 'oklch(0.42 0.16 350)' }}
          >
            Sign up free
          </Link>
        </p>
      </AuthLayout>
    </>
  );
}
