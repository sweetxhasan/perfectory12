import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { initializeApp, getApps, getApp, cert, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

/**
 * Firebase Admin SDK, used ONLY for the one thing the public client SDK
 * genuinely cannot do: setting a brand-new password for a signed-out user
 * during the "forgot password" OTP flow. Everything else in this project
 * (OTP storage, duplicate checks, admin-token verification) deliberately
 * avoids the Admin SDK — see api/_lib/admin-auth.ts and
 * api/_lib/firebase-server.ts for why. This file is the single exception.
 *
 * Credentials are loaded from a local, git-ignored JSON file
 * (api/_lib/firebase-service-account.json — the exact file downloaded from
 * Firebase Console → Project settings → Service accounts → Generate new
 * private key). That file is listed in .gitignore so it is never pushed to
 * GitHub or committed anywhere. As a fallback (e.g. for deployments where
 * the file isn't present), the FIREBASE_SERVICE_ACCOUNT_KEY environment
 * variable is also supported. If neither is available or valid,
 * `isAdminConfigured()` reports false and every caller degrades
 * gracefully (503) instead of throwing.
 */

const APP_NAME = 'firebase-admin';
const SERVICE_ACCOUNT_FILE = join(__dirname, 'firebase-service-account.json');

function isValidServiceAccount(value: unknown): value is ServiceAccount {
  return (
    !!value &&
    typeof value === 'object' &&
    !!(value as Record<string, unknown>).project_id &&
    !!(value as Record<string, unknown>).client_email &&
    !!(value as Record<string, unknown>).private_key
  );
}

function readServiceAccountFile(): ServiceAccount | null {
  try {
    const raw = readFileSync(SERVICE_ACCOUNT_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return isValidServiceAccount(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readServiceAccountEnv(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    return isValidServiceAccount(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseServiceAccount(): ServiceAccount | null {
  return readServiceAccountFile() ?? readServiceAccountEnv();
}

let cachedApp: App | null | undefined;

function getAdminApp(): App | null {
  if (cachedApp !== undefined) return cachedApp;
  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) {
    cachedApp = null;
    return null;
  }
  cachedApp = getApps().some((a) => a.name === APP_NAME)
    ? getApp(APP_NAME)
    : initializeApp({ credential: cert(serviceAccount) }, APP_NAME);
  return cachedApp;
}

/** Whether FIREBASE_SERVICE_ACCOUNT_KEY is set and parses into a usable service account. */
export function isAdminConfigured(): boolean {
  return getAdminApp() !== null;
}

/** Throws if the Admin SDK isn't configured — callers should check isAdminConfigured() first for a clean 503. */
export function getAdminAuth(): Auth {
  const app = getAdminApp();
  if (!app) {
    throw new Error('Firebase Admin SDK is not configured (missing FIREBASE_SERVICE_ACCOUNT_KEY).');
  }
  return getAuth(app);
}
