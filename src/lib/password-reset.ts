/**
 * Client helpers for the forgot-password OTP flow. Mirrors
 * src/lib/email-verify.ts's shape — public endpoints, no Firebase ID
 * token required, since the user is signed out at this point.
 */

export interface SendResetCodeResult {
  success: true;
  expiresInSec: number;
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

/** Sends (or resends — unlimited, no cooldown) a 6-digit reset code to an email that already has an account. */
export async function requestResetCode(email: string, name?: string): Promise<SendResetCodeResult> {
  return postJson<SendResetCodeResult>('/api/send-reset-code', { email, name });
}

/** Confirms the reset code without changing anything yet — just unlocks the "choose a new password" step. */
export async function confirmResetCode(email: string, code: string): Promise<{ success: true }> {
  return postJson<{ success: true }>('/api/verify-reset-code', { email, code });
}

/** Final step: sets the new password server-side via the Firebase Admin SDK. The code is re-checked here too. */
export async function submitNewPassword(email: string, code: string, newPassword: string): Promise<{ success: true }> {
  return postJson<{ success: true }>('/api/reset-password', { email, code, newPassword });
}
