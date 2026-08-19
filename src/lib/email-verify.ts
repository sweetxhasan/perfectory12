/**
 * Client helpers for the signup OTP flow. Unlike the admin SMTP calls in
 * `smtp-store.ts`, these hit public endpoints — no Firebase ID token is
 * needed, since the account doesn't exist yet at this point.
 */

export interface SendCodeResult {
  success: true;
  expiresInSec: number;
}

export interface SendCodeError {
  success: false;
  error: string;
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
    };
    err.attemptsLeft = (data as { attemptsLeft?: number }).attemptsLeft;
    throw err;
  }
  return data as T;
}

export async function requestSignupCode(email: string, name?: string): Promise<SendCodeResult> {
  return postJson<SendCodeResult>('/api/send-verification-code', { email, name });
}

/**
 * Confirms the OTP code. The server sends the "Welcome to Perfectory
 * Voice!" email itself, in the same request, the moment the code is
 * confirmed — no separate client follow-up call needed.
 */
export async function confirmSignupCode(email: string, code: string, name?: string): Promise<{ success: true }> {
  return postJson<{ success: true }>('/api/verify-code', { email, code, name });
}

/**
 * Manual fallback: re-fires the welcome email for an address that has
 * already completed OTP verification. The server re-checks that the OTP
 * record is actually verified before sending, so this can't be abused to
 * spam an address that never completed the code flow.
 */
export async function sendWelcomeEmail(email: string, name?: string): Promise<void> {
  await postJson('/api/send-welcome-email', { email, name });
}
