import crypto from 'crypto';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { serverDb } from './firebase-server';

const OTPS = 'perfectory_email_otps';

export const OTP_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes
export const OTP_MAX_ATTEMPTS = 5;

export interface OtpRecord {
  codeHash: string;
  salt: string;
  expiresAt: Timestamp;
  lastSentAt: Timestamp;
  attempts: number;
  verified: boolean;
  welcomeSent?: boolean;
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

/**
 * Creates/overwrites the OTP record with a brand-new code. Resend is
 * completely unlimited — no cooldown, no cap on how many times a user can
 * request a fresh code for the same email.
 */
export async function issueOtp(email: string): Promise<{ code: string }> {
  const code = generateCode();
  const salt = crypto.randomBytes(16).toString('hex');
  const id = otpDocId(email);
  const now = Date.now();

  await setDoc(doc(serverDb, OTPS, id), {
    codeHash: hashCode(code, salt),
    salt,
    expiresAt: Timestamp.fromMillis(now + OTP_EXPIRY_MS),
    lastSentAt: Timestamp.fromMillis(now),
    attempts: 0,
    verified: false,
    welcomeSent: false,
    createdAt: serverTimestamp(),
  });

  return { code };
}

export type VerifyOutcome =
  | { ok: true; justVerified: boolean }
  | { ok: false; reason: 'not-found' | 'expired' | 'too-many-attempts' | 'invalid'; attemptsLeft?: number };

export async function verifyOtp(email: string, code: string): Promise<VerifyOutcome> {
  const record = await getOtp(email);
  if (!record) return { ok: false, reason: 'not-found' };

  // Already verified in a previous call — report ok but justVerified: false
  // so callers know not to re-trigger one-time side effects like the
  // welcome email.
  if (record.verified) return { ok: true, justVerified: false };

  if (Date.now() > record.expiresAt.toMillis()) {
    // Expired codes are deleted immediately on the next touch, instead of
    // lingering in Firestore until something else overwrites them.
    await deleteDoc(doc(serverDb, OTPS, record.id)).catch(() => {});
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
  return { ok: true, justVerified: true };
}

/** Whether this email has a currently-verified, unexpired OTP record. */
export async function isOtpVerified(email: string): Promise<boolean> {
  const record = await getOtp(email);
  if (!record || !record.verified) return false;
  return Date.now() <= record.expiresAt.toMillis();
}

/**
 * Marks the OTP record's welcome email as sent, so a retried verify call
 * (or a duplicate request) never fires a second welcome email for the same
 * signup. Best-effort — if this write fails we still already sent the mail.
 */
export async function markWelcomeSent(email: string): Promise<void> {
  const record = await getOtp(email);
  if (!record) return;
  await updateDoc(doc(serverDb, OTPS, record.id), { welcomeSent: true }).catch(() => {});
}

/** Whether the welcome email has already gone out for this email's OTP record. */
export async function wasWelcomeSent(email: string): Promise<boolean> {
  const record = await getOtp(email);
  return !!record?.welcomeSent;
}

/**
 * Sweeps every OTP record whose `expiresAt` has passed and deletes it from
 * Firestore. `verifyOtp` already deletes a record the moment it's touched
 * past expiry, but nobody may ever re-touch an abandoned signup — so this
 * runs on a schedule (see /api/cleanup-expired-otps + vercel.json crons)
 * to guarantee expired codes don't linger in the database indefinitely.
 */
export async function cleanupExpiredOtps(): Promise<{ deleted: number }> {
  const now = Timestamp.fromMillis(Date.now());
  const q = query(collection(serverDb, OTPS), where('expiresAt', '<=', now));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref).catch(() => {})));
  return { deleted: snap.size };
}
