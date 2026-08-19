import crypto from 'crypto';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { serverDb } from './firebase-server';

const OTPS = 'perfectory_email_otps';

export const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
export const OTP_MAX_ATTEMPTS = 5;

export interface OtpRecord {
  codeHash: string;
  salt: string;
  expiresAt: Timestamp;
  lastSentAt: Timestamp;
  attempts: number;
  verified: boolean;
  createdAt: unknown;
}

/** Gmail dot-trick-normalized doc id, mirroring src/lib/user-store.ts's normalizeGmailEmail. */
export function otpDocId(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at === -1) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const normalizedLocal = domain === 'gmail.com' ? local.replace(/\./g, '') : local;
  // Firestore doc ids can't contain '/', but emails never do either way.
  return `${normalizedLocal}@${domain}`;
}

function hashCode(code: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
}

export function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export async function getOtp(email: string): Promise<(OtpRecord & { id: string }) | null> {
  const id = otpDocId(email);
  const snap = await getDoc(doc(serverDb, OTPS, id));
  if (!snap.exists()) return null;
  return { id, ...(snap.data() as OtpRecord) };
}

/** Creates/overwrites the OTP record with a brand-new code, enforcing the resend cooldown. */
export async function issueOtp(email: string): Promise<{ code: string; cooldownRemainingMs: number } | { code: null; cooldownRemainingMs: number }> {
  const existing = await getOtp(email);
  const now = Date.now();

  if (existing?.lastSentAt) {
    const elapsed = now - existing.lastSentAt.toMillis();
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      return { code: null, cooldownRemainingMs: OTP_RESEND_COOLDOWN_MS - elapsed };
    }
  }

  const code = generateCode();
  const salt = crypto.randomBytes(16).toString('hex');
  const id = otpDocId(email);

  await setDoc(doc(serverDb, OTPS, id), {
    codeHash: hashCode(code, salt),
    salt,
    expiresAt: Timestamp.fromMillis(now + OTP_EXPIRY_MS),
    lastSentAt: Timestamp.fromMillis(now),
    attempts: 0,
    verified: false,
    createdAt: serverTimestamp(),
  });

  return { code, cooldownRemainingMs: OTP_RESEND_COOLDOWN_MS };
}

export type VerifyOutcome =
  | { ok: true }
  | { ok: false; reason: 'not-found' | 'expired' | 'too-many-attempts' | 'invalid'; attemptsLeft?: number };

export async function verifyOtp(email: string, code: string): Promise<VerifyOutcome> {
  const record = await getOtp(email);
  if (!record) return { ok: false, reason: 'not-found' };

  if (record.verified) return { ok: true };

  if (Date.now() > record.expiresAt.toMillis()) {
    return { ok: false, reason: 'expired' };
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, reason: 'too-many-attempts' };
  }

  const candidateHash = hashCode(code, record.salt);
  if (candidateHash !== record.codeHash) {
    const attempts = record.attempts + 1;
    await updateDoc(doc(serverDb, OTPS, record.id), { attempts });
    if (attempts >= OTP_MAX_ATTEMPTS) {
      return { ok: false, reason: 'too-many-attempts' };
    }
    return { ok: false, reason: 'invalid', attemptsLeft: OTP_MAX_ATTEMPTS - attempts };
  }

  await updateDoc(doc(serverDb, OTPS, record.id), { verified: true });
  return { ok: true };
}

/** Whether this email has a currently-verified, unexpired OTP record. */
export async function isOtpVerified(email: string): Promise<boolean> {
  const record = await getOtp(email);
  if (!record || !record.verified) return false;
  return Date.now() <= record.expiresAt.toMillis();
}
