import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { friendlyAuthError } from '@/lib/auth-errors';
import { AuthLayout } from '@/components/auth-layout';
import { SEOHead } from '@/components/seo-head';
import { PAGE_SEO } from '@/lib/seo-config';
import { GoogleOneTap } from '@/components/google-one-tap';
import { FloatingField, type FieldStatus } from '@/components/floating-field';
import { CutFrame } from '@/components/cut-frame';
import { GradientCheckbox } from '@/components/gradient-checkbox';
import { CutSubmitButton } from '@/components/cut-submit-button';
import { GoogleButton } from '@/components/google-button';
import { CutIconBadge } from '@/components/cut-icon-badge';
import { PremiumTooltip, CutBubbleCard } from '@/components/premium-tooltip';
import { Icon } from '@/components/icon';
import { isPhoneUsed, isEmailUsed } from '@/lib/user-store';
import { EmailVerifyOverlay } from '@/components/email-verify-overlay';
import { requestSignupCode } from '@/lib/email-verify';

const NAME_MIN = 3;
const NAME_MAX = 20;
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

/** Password meets policy: at least PW_MIN characters and at least 3 of the
 *  4 character-class rules below. */
function passwordMeetsPolicy(pw: string): boolean {
  if (pw.length < PW_MIN) return false;
  const checks = [/[A-Z]/.test(pw), /[a-z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  return checks >= 3;
}

/* ── Password requirements — premium 6-cut bubble card, floating a tight
   2px above the password field (same visual language, and the same tight
   gap, as the email/phone status tooltips). Border color mirrors overall
   validity: success green once the policy is met, danger red while it
   isn't. ── */
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const rules = [
    ['Uppercase letters', /[A-Z]/.test(password)],
    ['Lowercase letters', /[a-z]/.test(password)],
    ['Numbers', /[0-9]/.test(password)],
    ['Non-alphanumeric characters', /[^A-Za-z0-9]/.test(password)],
  ] as const;
  const passed = rules.filter(([, valid]) => valid).length;
  const isValid = passwordMeetsPolicy(password);

  return (
    <div className="mx-auto w-[min(88vw,22rem)] sm:w-[min(92vw,22rem)]">
      <CutBubbleCard variant={isValid ? 'valid' : 'invalid'}>
        <div className="px-3 py-2.5 text-[12px] sm:px-5 sm:py-4 sm:text-sm">
          <p className="mb-2 leading-[1.35] text-muted-foreground sm:mb-3 sm:leading-6">
            Passwords must be at least {PW_MIN} characters long and contain at least 3 of the following:
          </p>
          <div className="flex flex-col gap-1.5 sm:gap-2.5">
            {rules.map(([label, valid]) => (
              <div key={label} className={`flex items-center gap-2 sm:gap-2.5 ${valid ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                <CutIconBadge variant={valid ? 'valid' : 'neutral'} size={15} borderWidth={1}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </CutIconBadge>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </CutBubbleCard>

      <span className="sr-only">{passed} of 4 password requirements met, password {isValid ? 'meets' : 'does not meet'} the policy</span>
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
type DuplicateState = 'idle' | 'checking' | 'used' | 'free';

function PhoneField({ value, onChange, touched }: PhoneFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const validation = touched && value.length > 0 ? validatePhone(value) : { valid: false };
  const isError = touched && value.length > 0 && !validation.valid && !!validation.error;
  const isValid = validation.valid;

  /* Firebase duplicate-number check — debounced, cancels on edit/clear */
  const [dup, setDup] = useState<DuplicateState>('idle');
  const isDuplicate = isValid && dup === 'used';
  /* A duplicate number is still an error state — border/label must turn
     red, never stay green, even though the format itself is valid. */
  const statusCls = isValid && !isDuplicate ? 'is-valid' : isError || isDuplicate ? 'is-error' : '';
  useEffect(() => {
    if (!isValid) {
      setDup('idle');
      return;
    }
    setDup('checking');
    let cancelled = false;
    const timer = setTimeout(() => {
      isPhoneUsed('+880' + value)
        .then((used) => { if (!cancelled) setDup(used ? 'used' : 'free'); })
        .catch(() => { if (!cancelled) setDup('free'); });
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isValid, value]);

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
    <div className={`pv-field-wrap flex flex-col gap-1.5 ${statusCls}`}>
      <span className="pv-cut-label">Phone number</span>

      <div className={`pv-cut-field relative flex h-14 items-stretch ${statusCls}`} onClick={() => inputRef.current?.focus()}>
        <div className="pv-cut-bg" />
        <CutFrame />

        <div className="relative z-20 flex min-w-0 flex-1 items-stretch">
          {/* +880 country chip — angular cut edge to match the field's corner language */}
          <div
            className="pv-phone-chip flex shrink-0 items-center gap-2 py-2 pl-4 pr-6 select-none"
            style={{
              clipPath: 'polygon(0 0, calc(100% - 11px) 0, 100% 50%, calc(100% - 11px) 100%, 0 100%)',
            }}
          >
            <svg width="21" height="15" viewBox="0 0 30 20" className="shrink-0 rounded-[2px]" aria-hidden="true">
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

          {/* Status icon — only ever a loading spinner, a valid check, or an
              invalid/duplicate notice. No default placeholder icon. */}
          <div className="flex items-center pr-3">
            {dup === 'checking' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin text-muted-foreground" aria-label="Checking...">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.4" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            ) : isDuplicate ? (
              <PremiumTooltip content="Already used this phone number" variant="invalid">
                {({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="Already used this phone number"
                    className="flex items-center justify-center rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                  >
                    <CutIconBadge variant="invalid" size={18}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="11" /><line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </CutIconBadge>
                  </button>
                )}
              </PremiumTooltip>
            ) : isValid && dup === 'free' ? (
              <PremiumTooltip content="Number is valid, please continue." variant="valid">
                {({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="Number is valid, please continue."
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
            ) : isError && validation.error ? (
              <PremiumTooltip content={validation.error} variant="invalid">
                {({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label={validation.error}
                    className="flex items-center justify-center rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                  >
                    <CutIconBadge variant="invalid" size={18}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="11" /><line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
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

/* ── Email Field (Gmail only, dot-trick-aware duplicate check) ── */
interface EmailFieldProps {
  value: string;
  onChange: (v: string) => void;
}
type EmailDuplicateState = 'idle' | 'checking' | 'used' | 'free';

function EmailField({ value, onChange }: EmailFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = value.trim();
  const formatValid = trimmed !== '' && /^[^\s@]+@gmail\.com$/i.test(trimmed);
  const isFormatError = trimmed !== '' && !formatValid;

  /* Firestore duplicate-email check — debounced, Gmail dot-trick aware */
  const [dup, setDup] = useState<EmailDuplicateState>('idle');
  const isDuplicate = formatValid && dup === 'used';
  const isValid = formatValid && dup === 'free';
  const statusCls = isValid ? 'is-valid' : isFormatError || isDuplicate ? 'is-error' : '';

  useEffect(() => {
    if (!formatValid) {
      setDup('idle');
      return;
    }
    setDup('checking');
    let cancelled = false;
    const timer = setTimeout(() => {
      isEmailUsed(trimmed)
        .then((used) => { if (!cancelled) setDup(used ? 'used' : 'free'); })
        .catch(() => { if (!cancelled) setDup('free'); });
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [formatValid, trimmed]);

  const iconCls = isValid
    ? 'text-emerald-500'
    : isFormatError || isDuplicate
      ? 'text-destructive'
      : 'text-muted-foreground/50';

  return (
    <div className={`pv-field-wrap flex flex-col gap-1.5 ${statusCls}`}>
      <span className="pv-cut-label">Email Address</span>

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
            placeholder="you@gmail.com"
            autoComplete="email"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-w-0 flex-1 bg-transparent px-3.5 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
            aria-label="Email Address"
            required
          />

          {/* Status icon — loading spinner, Gmail-only format notice,
              duplicate-account notice, or valid checkmark. No default icon. */}
          <div className="flex items-center pr-3">
            {dup === 'checking' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin text-muted-foreground" aria-label="Checking email...">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.4" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            ) : isDuplicate ? (
              <PremiumTooltip content="Your email is already used. Please use another email." variant="invalid">
                {({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="Your email is already used. Please use another email."
                    className="flex items-center justify-center rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                  >
                    <CutIconBadge variant="invalid" size={18}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="11" /><line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </CutIconBadge>
                  </button>
                )}
              </PremiumTooltip>
            ) : isValid ? (
              <PremiumTooltip content="Your email is valid for use." variant="valid">
                {({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="Your email is valid for use."
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
              <PremiumTooltip content="Only @gmail.com email supported" variant="invalid">
                {({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="Only @gmail.com email supported"
                    className="flex items-center justify-center rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                  >
                    <CutIconBadge variant="invalid" size={18}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="11" /><line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
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

  /* Email verify overlay — opened after the OTP is sent, closed once the
     account is created post-verification. */
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyCooldownSec, setVerifyCooldownSec] = useState(0);
  const [pendingSignup, setPendingSignup] = useState<{ email: string; password: string; name: string; phone: string } | null>(null);

  useEffect(() => {
    // Accounts are only ever created after the OTP overlay confirms the
    // email, so any signed-in user here is already verified.
    if (!user) return;
    setLocation('/dashboard');
  }, [user, setLocation]);

  /* field validation */
  const emailSt = emailState(email);

  const nameTrimmedLen = name.trim().length;
  const nameLiveStatus: FieldStatus = name === '' ? 'default' : nameTrimmedLen < NAME_MIN ? 'error' : 'valid';
  const nameAtMax = name.length >= NAME_MAX;

  function validateName(v: string) {
    if (!v.trim()) { setNameError('Name is required'); return false; }
    if (v.trim().length < NAME_MIN) { setNameError(`At least ${NAME_MIN} characters`); return false; }
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
      const trimmedEmail = email.trim();
      const trimmedName = name.trim();

      // Send the OTP first — if the email service isn't configured, show
      // the error inline on the form instead of opening the overlay.
      const res = await requestSignupCode(trimmedEmail, trimmedName);

      setPendingSignup({ email: trimmedEmail, password, name: trimmedName, phone: intlPhone });
      setVerifyCooldownSec(res.cooldownSec);
      setVerifyOpen(true);
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg === 'phone-already-in-use') {
        setError('This phone number is already registered with another account.');
      } else {
        setError(msg || friendlyAuthError(err));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerified() {
    if (!pendingSignup) return;
    try {
      await signUpEmail({
        email: pendingSignup.email,
        password: pendingSignup.password,
        name: pendingSignup.name,
        phone: pendingSignup.phone,
        gender: 'male',
      });
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg === 'phone-already-in-use') {
        throw new Error('This phone number is already registered with another account.');
      }
      if (msg === 'email-already-in-use') {
        throw new Error('This email is already registered with another account.');
      }
      throw new Error(friendlyAuthError(err));
    }
    setVerifyOpen(false);
    setLocation('/dashboard');
  }

  return (
    <>
      <SEOHead {...PAGE_SEO.signup} />
      <GoogleOneTap />
      <AuthLayout
        title="Create your account"
        subtitle="Sign up to claim free credits daily"
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
          {/* Name — 3 to 20 characters */}
          <FloatingField
            id="signup-name"
            label="Name"
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
            status={nameError ? 'error' : nameLiveStatus}
            hint={nameError ? <p className="text-[11px] text-red-500 pl-1">{nameError}</p> : null}
            required
            rightSlot={
              nameAtMax ? (
                <div className="mr-3.5 flex shrink-0 items-center">
                  <PremiumTooltip content="Name can't be more than 20 characters." variant="invalid" autoOpenDuration={3000}>
                    {({ toggle }) => (
                      <button
                        type="button"
                        onClick={toggle}
                        aria-label="Name can't be more than 20 characters."
                        className="flex items-center justify-center rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                      >
                        <CutIconBadge variant="invalid" size={18}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="11" /><line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                        </CutIconBadge>
                      </button>
                    )}
                  </PremiumTooltip>
                </div>
              ) : undefined
            }
          />

          {/* Email — Gmail only, dot-trick-aware duplicate check */}
          <EmailField value={email} onChange={setEmail} />

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
            hintPlacement="above"
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
          <CutSubmitButton
            loading={loading}
            label="Sign Up"
            loadingLabel="Creating account…"
          />
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

      <EmailVerifyOverlay
        open={verifyOpen}
        email={pendingSignup?.email ?? email.trim()}
        name={pendingSignup?.name ?? name.trim()}
        initialCooldownSec={verifyCooldownSec}
        onClose={() => setVerifyOpen(false)}
        onVerified={handleVerified}
      />
    </>
  );
}
