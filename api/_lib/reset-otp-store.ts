import crypto from 'crypto';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { serverDb } from './firebase-server';
import { otpDocId, generateCode } from './otp-store';

/**
 * Password-reset OTP records — a dedicated Firestore collection so a
 * forgot-password code can never collide with (or accidentally satisfy)
 * a signup-verification code for the same address. Structurally mirrors
 * api/_lib/otp-store.ts, minus the welcome-email bookkeeping that only
 * applies to signup.
 */
const RESET_OTPS = 'perfectory_password_reset_otps';

export const RESET_OTP_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes — shorter-lived than signup codes, since this authorizes a password change
export const RESET_OTP_MAX_ATTEMPTS = 5;

export interface ResetOtpRecord {
  codeHash: string;
  salt: string;
  expiresAt: Timestamp;
  attempts: number;
  verified: boolean;
  createdAt: unknown;
}

function hashCode(code: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
}

async function getResetOtp(email: string): Promise<(ResetOtpRecord & { id: string }) | null> {
  const id = otpDocId(email);
  const snap = await getDoc(doc(serverDb, RESET_OTPS, id));
  if (!snap.exists()) return null;
  return { id, ...(snap.data() as ResetOtpRecord) };
}

/** Creates/overwrites the reset-OTP record with a brand-new code. Resend is unlimited, same as signup. */
export async function issueResetOtp(email: string): Promise<{ code: string }> {
  const code = generateCode();
  const salt = crypto.randomBytes(16).toString('hex');
  const id = otpDocId(email);
  const now = Date.now();

  await setDoc(doc(serverDb, RESET_OTPS, id), {
    codeHash: hashCode(code, salt),
    salt,
    expiresAt: Timestamp.fromMillis(now + RESET_OTP_EXPIRY_MS),
    attempts: 0,
    verified: false,
    createdAt: serverTimestamp(),
  });

  return { code };
}

export type ResetVerifyOutcome =
  | { ok: true; justVerified: boolean }
  | { ok: false; reason: 'not-found' | 'expired' | 'too-many-attempts' | 'invalid'; attemptsLeft?: number };

export async function verifyResetOtp(email: string, code: string): Promise<ResetVerifyOutcome> {
  const record = await getResetOtp(email);
  if (!record) return { ok: false, reason: 'not-found' };

  if (record.verified) return { ok: true, justVerified: false };

  if (Date.now() > record.expiresAt.toMillis()) {
    await deleteDoc(doc(serverDb, RESET_OTPS, record.id)).catch(() => {});
    return { ok: false, reason: 'expired' };
  }

  if (record.attempts >= RESET_OTP_MAX_ATTEMPTS) {
    return { ok: false, reason: 'too-many-attempts' };
  }

  const candidateHash = hashCode(code, record.salt);
  if (candidateHash !== record.codeHash) {
    const attempts = record.attempts + 1;
    await updateDoc(doc(serverDb, RESET_OTPS, record.id), { attempts });
    if (attempts >= RESET_OTP_MAX_ATTEMPTS) {
      return { ok: false, reason: 'too-many-attempts' };
    }
    return { ok: false, reason: 'invalid', attemptsLeft: RESET_OTP_MAX_ATTEMPTS - attempts };
  }

  await updateDoc(doc(serverDb, RESET_OTPS, record.id), { verified: true });
  return { ok: true, justVerified: true };
}

/** Whether this email has a currently-verified, unexpired reset-OTP record — required before the password can actually be changed. */
export async function isResetOtpVerified(email: string): Promise<boolean> {
  const record = await getResetOtp(email);
  if (!record || !record.verified) return false;
  return Date.now() <= record.expiresAt.toMillis();
}

/** Deletes the reset-OTP record so a completed reset code can never be replayed. */
export async function consumeResetOtp(email: string): Promise<void> {
  const id = otpDocId(email);
  await deleteDoc(doc(serverDb, RESET_OTPS, id)).catch(() => {});
}

/** Sweeps every expired reset-OTP record — see api/cleanup-expired-otps for the signup equivalent this is paired with. */
export async function cleanupExpiredResetOtps(): Promise<{ deleted: number }> {
  const now = Timestamp.fromMillis(Date.now());
  const q = query(collection(serverDb, RESET_OTPS), where('expiresAt', '<=', now));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref).catch(() => {})));
  return { deleted: snap.size };
}
