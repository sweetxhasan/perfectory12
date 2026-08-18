import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { friendlyAuthError } from '@/lib/auth-errors';
import { AuthLayout, SparkleIcon } from '@/components/auth-layout';
import { SEOHead } from '@/components/seo-head';
import { PAGE_SEO } from '@/lib/seo-config';
import { GoogleOneTap } from '@/components/google-one-tap';
import { FloatingField, type FieldStatus } from '@/components/floating-field';
import { CutFrame } from '@/components/cut-frame';
import { GradientCheckbox } from '@/components/gradient-checkbox';
import { GoogleButton } from '@/components/google-button';

const NAME_MAX = 40;
const PW_MIN = 8;

/* ── Phone validation (10 digits after +880, starts with 1[3-9]) ── */
function validatePhone(digits: string): { valid: boolean; error?: string } {
  if (!digits) return { valid: false, error: '' };
  if (digits.length < 10) return { valid: false, error: `${10 - digits.length} more digit${10 - digits.length > 1 ? 's' : ''} needed` };
  if (digits.length > 10) return { valid: false, error: 'Must be exactly 10 digits' };
  if (!/^1[3-9]\d{8}$/.test(digits)) return { valid: false, error: 'Enter a valid Bangladesh mobile number' };
  return { valid: true };
}

/** Format as 1XXXX-XXXXX while typing */
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 5) return d;
  return d.slice(0, 5) + '-' + d.slice(5);
}

/* ── Email validation — Gmail only ── */
function emailState(email: string): 'empty' | 'invalid' | 'valid' {
  if (!email) return 'empty';
  return /^[^\s@]+@gmail\.com$/i.test(email.trim()) ? 'valid' : 'invalid';
}

/* ── Password strength ── */
interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  textColor: string;
  tips: string[];
}
function getStrength(pw: string): StrengthResult | null {
  if (!pw) return null;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const longEnough = pw.length >= PW_MIN;
  const veryLong = pw.length >= 12;

  const tips: string[] = [];
  if (!longEnough) tips.push(`At least ${PW_MIN} characters`);
  if (!hasUpper) tips.push('One uppercase letter');
  if (!hasLower) tips.push('One lowercase letter');
  if (!hasNumber) tips.push('One number (0–9)');
  if (!hasSpecial) tips.push('One symbol (! @ # $…)');

  let score: 0 | 1 | 2 | 3 | 4 = 0;
  if (!longEnough) score = 0;
  else {
    const checks = [hasUpper, hasLower, hasNumber, hasSpecial, veryLong].filter(Boolean).length;
    score = (checks <= 1 ? 1 : checks === 2 ? 2 : checks === 3 ? 3 : 4) as 0 | 1 | 2 | 3 | 4;
  }

  const map: Record<number, Omit<StrengthResult, 'score' | 'tips'>> = {
    0: { label: 'Too short', color: 'bg-red-400',     textColor: 'text-red-500' },
    1: { label: 'Weak',      color: 'bg-red-400',     textColor: 'text-red-500' },
    2: { label: 'Fair',      color: 'bg-amber-400',   textColor: 'text-amber-500' },
    3: { label: 'Good',      color: 'bg-yellow-400',  textColor: 'text-yellow-600' },
    4: { label: 'Strong',    color: 'bg-emerald-400', textColor: 'text-emerald-600' },
  };
  return { score, tips, ...map[score] };
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const rules = [
    ['Uppercase letters', /[A-Z]/.test(password)],
    ['Lowercase letters', /[a-z]/.test(password)],
    ['Numbers', /[0-9]/.test(password)],
    ['Non-alphanumeric characters', /[^A-Za-z0-9]/.test(password)],
  ] as const;
  const passed = rules.filter(([, valid]) => valid).length;
  return (
    <div className="relative rounded-xl border border-[#b7b8c0] bg-card px-3.5 py-3 text-sm shadow-[0_12px_26px_rgba(40,40,50,0.12)] sm:rounded-2xl sm:px-5 sm:py-4 sm:text-base">
      <p className="mb-2.5 max-w-[32rem] leading-5 text-muted-foreground sm:mb-3 sm:leading-6">Passwords must be at least 8 characters long and contain at least 3 of the following:</p>
      <div className="flex flex-col gap-2 sm:gap-2.5">
        {rules.map(([label, valid]) => (
          <div key={label} className={`flex items-center gap-2 ${valid ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="8 12 11 15 16 9" />
            </svg>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <span className="sr-only">{passed} of 4 password requirements met</span>
    </div>
  );
}

/* ── Eye toggle ── */
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

/* ── Simple Phone Field (+880 prefix, 10 digits) ── */
interface PhoneFieldProps {
  value: string;   // raw digits, max 10
  onChange: (v: string) => void;
  touched: boolean;
}
function PhoneField({ value, onChange, touched }: PhoneFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const validation = touched && value.length > 0 ? validatePhone(value) : { valid: false };
  const isError = touched && value.length > 0 && !validation.valid && !!validation.error;
  const isValid = validation.valid;
  const statusCls = isValid ? 'is-valid' : isError ? 'is-error' : '';

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange(raw);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (!allowed.includes(e.key) && !/^\d$/.test(e.key) && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
    }
  }

  return (
    <div className="flex flex-col gap-1.5 pt-1.5">
      <div className={`pv-cut-field relative flex h-14 items-stretch ${statusCls}`} onClick={() => inputRef.current?.focus()}>
        <div className="pv-cut-bg" />
        <CutFrame />

        <span className="pv-cut-label">Phone Number</span>

        <div className="relative z-20 flex min-w-0 flex-1 items-stretch">
          {/* +880 country chip — angular cut edge to match the field's corner language */}
          <div
            className="pv-phone-chip flex shrink-0 items-center gap-2 py-2 pl-4 pr-6 select-none"
            style={{
              background: 'linear-gradient(135deg, oklch(0.26 0.10 335 / 0.12), oklch(0.42 0.16 350 / 0.12))',
              clipPath: 'polygon(0 0, calc(100% - 11px) 0, 100% 50%, calc(100% - 11px) 100%, 0 100%)',
            }}
          >
            <svg width="21" height="15" viewBox="0 0 30 20" className="shrink-0 rounded-[2px] ring-1 ring-black/10" aria-hidden="true">
              <rect width="30" height="20" fill="#006A4E" />
              <circle cx="13" cy="10" r="6" fill="#F42A41" />
            </svg>
            <span className="text-[14px] font-bold tracking-wide text-foreground">+880</span>
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            placeholder="1XXXX-XXXXX"
            value={formatPhone(value)}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            maxLength={11} /* 10 digits + 1 hyphen */
            className="min-w-0 flex-1 bg-transparent py-2 pr-2 pl-2 text-[15px] font-semibold tracking-wide text-foreground outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground/70"
            aria-label="Phone number"
            autoComplete="tel-national"
          />

          {/* Status icon */}
          <div className="flex items-center pr-3.5">
            {isValid ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="oklch(0.60 0.15 152)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : isError ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-destructive" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-muted-foreground/50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Hint */}
      <div className="min-h-[18px] pl-1">
        {isError && validation.error ? (
          <p className="text-[11px] text-destructive">{validation.error}</p>
        ) : isValid ? (
          <p className="flex items-center gap-1 text-[11px] text-emerald-600">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            Valid Bangladesh number
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">10-digit number after +880 (e.g. 1712345678)</p>
        )}
      </div>
    </div>
  );
}

/* ── Terms checkbox ── */
function TermsCheckbox({ checked, onChange, error }: { checked: boolean; onChange: (v: boolean) => void; error?: boolean }) {
  return (
    <GradientCheckbox
      checked={checked}
      onChange={onChange}
      className="w-full items-start py-0.5"
      label={<span className={`text-sm leading-snug transition-colors group-hover:text-gray-700 ${error && !checked ? 'text-red-500' : 'text-gray-500'}`}>
        I agree to the{' '}
        <span
          className="font-semibold underline underline-offset-2 transition-colors"
          style={{ color: 'oklch(0.42 0.16 350)' }}
          onClick={(e) => e.stopPropagation()}
        >
          Terms &amp; Conditions
        </span>
        {' '}and{' '}
        <span
          className="font-semibold underline underline-offset-2 transition-colors"
          style={{ color: 'oklch(0.42 0.16 350)' }}
          onClick={(e) => e.stopPropagation()}
        >
          Privacy Policy
        </span>
      </span>}
    />
  );
}

/* ════════════════════════════════════════════
   Sign Up Page
════════════════════════════════════════════ */
export default function SignupPage() {
  const { user, signUpEmail, signInGoogle } = useAuth();
  const [, setLocation] = useLocation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateKeyboardState = () => setKeyboardOpen(window.innerHeight - viewport.height > 140);
    updateKeyboardState();
    viewport.addEventListener('resize', updateKeyboardState);
    return () => viewport.removeEventListener('resize', updateKeyboardState);
  }, []);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (user.emailVerified) setLocation('/dashboard');
    else setLocation('/verify-email');
  }, [user, setLocation]);

  /* field validation */
  const emailSt = emailState(email);
  const emailFieldStatus: FieldStatus =
    email === '' ? 'default' : emailSt === 'valid' ? 'valid' : 'error';
  const emailHint =
    email && emailSt === 'invalid'
      ? <p className="text-[11px] text-red-500 pl-1">Only @gmail.com addresses are accepted</p>
      : null;

  function validateName(v: string) {
    if (!v.trim()) { setNameError('Name is required'); return false; }
    if (v.trim().length < 2) { setNameError('At least 2 characters'); return false; }
    if (v.trim().length > NAME_MAX) { setNameError(`Max ${NAME_MAX} characters`); return false; }
    setNameError('');
    return true;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setTermsError(false);

    if (!validateName(name)) return;
    if (emailSt !== 'valid') { setError('Please enter a valid Gmail address (@gmail.com)'); return; }

    setPhoneTouched(true);
    const phoneVal = validatePhone(phone);
    if (!phoneVal.valid) { setError('Please enter a valid Bangladesh phone number'); return; }

    const s = getStrength(password);
    if (!s || s.score < 2) { setError('Please use a stronger password'); return; }

    if (!termsAccepted) {
      setTermsError(true);
      setError('Please accept the Terms & Conditions to continue');
      return;
    }

    setLoading(true);
    try {
      // International format: +880 + 10 digits (user typed without leading 0)
      const intlPhone = '+880' + phone;
      await signUpEmail({
        email: email.trim(),
        password,
        name: name.trim(),
        phone: intlPhone,
        gender: 'male',
      });
      setLocation('/verify-email');
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg === 'phone-already-in-use') {
        setError('This phone number is already registered with another account.');
      } else {
        setError(friendlyAuthError(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SEOHead {...PAGE_SEO.signup} />
      <GoogleOneTap />
      <AuthLayout
        title={<>Create your account <SparkleIcon /></>}
        subtitle="Sign up free and get 10 credits to start"
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
            <span style={{ color: 'oklch(0.40 0.18 25)' }}>{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* Full name */}
          <FloatingField
            id="signup-name"
            label="Full name"
            placeholder="Enter your full name"
            icon="user"
            type="text"
            autoComplete="name"
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) validateName(e.target.value);
            }}
            status={nameError ? 'error' : name.trim().length >= 2 ? 'valid' : 'default'}
            hint={nameError ? <p className="text-[11px] text-red-500 pl-1">{nameError}</p> : null}
            required
          />

          {/* Email — Gmail only */}
          <FloatingField
            id="signup-email"
            label="Email Address"
            placeholder="you@gmail.com"
            icon="mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            status={emailFieldStatus}
            hint={emailHint}
            required
          />

          {/* Phone */}
          <PhoneField
            value={phone}
            onChange={(v) => {
              setPhone(v);
              if (!phoneTouched && v.length > 0) setPhoneTouched(true);
            }}
            touched={phoneTouched}
          />

          {/* Password */}
          <FloatingField
            id="signup-password"
            label="Password"
            placeholder="Create a strong password"
            icon="lock"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
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
            hintPlacement={keyboardOpen ? 'above' : 'below'}
            hint={<PasswordStrength password={password} />}
          />

          {/* Terms & Conditions */}
          <div className="pt-1">
            <TermsCheckbox
              checked={termsAccepted}
              onChange={(v) => { setTermsAccepted(v); if (v) setTermsError(false); }}
              error={termsError}
            />
            {termsError && (
              <p className="mt-1 pl-7 text-[11px] text-red-500">You must accept the terms to continue</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl py-3.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: 'linear-gradient(115deg, oklch(0.26 0.10 335) 0%, oklch(0.42 0.16 350) 48%, oklch(0.60 0.18 22) 100%)',
              boxShadow: '0 4px 24px -8px oklch(0.60 0.18 22 / 0.55)',
            }}
          >
            <span className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-500 group-hover:translate-x-full" />
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span className="relative">Creating account…</span>
              </>
            ) : (
              <>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="relative">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                <span className="relative">Create free account</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-[11px] font-medium uppercase tracking-widest text-gray-400">or</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Google */}
        <GoogleButton
          onClick={async () => {
            setError('');
            setGoogleLoading(true);
            try {
              await signInGoogle();
              setLocation('/dashboard');
            } catch (err) {
              setError(friendlyAuthError(err));
            } finally {
              setGoogleLoading(false);
            }
          }}
          loading={googleLoading}
          disabled={loading}
        />

        <p className="mt-5 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold transition hover:underline"
            style={{ color: 'oklch(0.42 0.16 350)' }}
          >
            Log in
          </Link>
        </p>
      </AuthLayout>
    </>
  );
}
