import { collection, getDocs } from 'firebase/firestore';
import { serverDb } from './firebase-server';

const USERS = 'perfectory_users';

/** Server-side mirror of src/lib/user-store.ts's normalizeGmailEmail. Keep these two in sync. */
export function normalizeGmailEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at === -1) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (domain !== 'gmail.com') return trimmed;
  return `${local.replace(/\./g, '')}@gmail.com`;
}

/**
 * Server-side mirror of src/lib/user-store.ts's isEmailUsed, used to gate
 * the password-reset OTP send so a code is never mailed to an address
 * with no account on file. Scans perfectory_users the same way the client
 * version does (Gmail dot-trick aware, legacy-doc safe).
 */
export async function accountExistsForEmail(email: string): Promise<boolean> {
  if (!email) return false;
  const canonical = normalizeGmailEmail(email);
  const snap = await getDocs(collection(serverDb, USERS));
  for (const d of snap.docs) {
    const data = d.data() as { canonicalEmail?: string; email?: string };
    const storedCanonical = data.canonicalEmail ?? (data.email ? normalizeGmailEmail(data.email) : '');
    if (storedCanonical && storedCanonical === canonical) return true;
  }
  return false;
}
