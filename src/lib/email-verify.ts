/**
 * Client helpers for the signup OTP flow. Unlike the admin SMTP calls in
 * `smtp-store.ts`, these hit public endpoints — no Firebase ID token is
 * needed, since the account doesn't exist yet at this point.
 */

export interface SendCodeResult {
  success: true;
  cooldownSec: number;
  expiresInSec: number;
}

export interface SendCodeError {
  success: false;
  error: string;
  cooldownRemainingMs?: number;
}

export interface VerifyCodeError {
  success: false;
  error: string;
  attemptsLeft?: number;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error || `Request failed (${res.status}).`) as Error & {
      attemptsLeft?: number;
      cooldownRemainingMs?: number;
    };
    err.attemptsLeft = (data as { attemptsLeft?: number }).attemptsLeft;
    err.cooldownRemainingMs = (data as { cooldownRemainingMs?: number }).cooldownRemainingMs;
    throw err;
  }
  return data as T;
}

export async function requestSignupCode(email: string, name?: string): Promise<SendCodeResult> {
  return postJson<SendCodeResult>('/api/send-verification-code', { email, name });
}

export async function confirmSignupCode(email: string, code: string): Promise<{ success: true }> {
  return postJson<{ success: true }>('/api/verify-code', { email, code });
}
