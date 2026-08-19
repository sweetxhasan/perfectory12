import { useState } from 'react';
import { FloatingField } from './floating-field';
import { CutIconBadge } from './cut-icon-badge';
import { CutBubbleCard } from './premium-tooltip';

export const PW_MIN = 8;

/* ── Password strength ── */
export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  textColor: string;
  tips: string[];
}

export function getStrength(pw: string): StrengthResult | null {
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
 *  4 character-class rules below. Mirrored server-side in api/_lib/handlers.ts. */
export function passwordMeetsPolicy(pw: string): boolean {
  if (pw.length < PW_MIN) return false;
  const checks = [/[A-Z]/.test(pw), /[a-z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  return checks >= 3;
}

/* ── Password requirements — premium 6-cut bubble card, floating a tight
   2px above the password field. Border color mirrors overall validity:
   success green once the policy is met, danger red while it isn't. ── */
export function PasswordStrength({ password }: { password: string }) {
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

interface PasswordFieldProps {
  id: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  /** Shows the live "requirements" bubble card while focused. Turn off for a plain confirm-password field. */
  showStrength?: boolean;
}

/**
 * Shared password input: cut-frame field, show/hide eye toggle, and the
 * live password-requirements bubble card — the exact same visual
 * language used on Signup, now reused on the forgot-password flow so
 * both places enforce (and look like) the identical policy.
 */
export function PasswordField({
  id,
  label = 'Password',
  placeholder = 'Create a strong password',
  value,
  onChange,
  autoComplete = 'new-password',
  showStrength = true,
}: PasswordFieldProps) {
  const [showPw, setShowPw] = useState(false);

  return (
    <FloatingField
      id={id}
      label={label}
      placeholder={placeholder}
      icon="lock"
      type={showPw ? 'text' : 'password'}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
      hint={showStrength ? <PasswordStrength password={value} /> : null}
    />
  );
}
