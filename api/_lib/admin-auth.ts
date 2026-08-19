import type { VercelRequest } from '@vercel/node';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Verifies a Firebase Auth ID token WITHOUT the Firebase Admin SDK
 * (no service account is configured for this project), by checking
 * the RS256 signature against Google's public certs for the
 * "securetoken" service account, then validating issuer/audience/expiry.
 *
 * This mirrors the officially documented pattern for verifying Firebase
 * ID tokens in environments where the Admin SDK isn't available
 * (e.g. edge/serverless runtimes without a service account).
 */

const FIREBASE_PROJECT_ID = 'banglaquiz-sgw69';

// Same hardcoded admin allowlist used client-side in src/lib/admin.ts —
// keep these two lists in sync.
const ADMIN_EMAILS = ['kinghasanbd1@gmail.com'];

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export class AdminAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface VerifiedAdmin {
  uid: string;
  email: string;
}

function extractBearerToken(header: string | null | undefined): string | null {
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

function getBearerToken(req: VercelRequest): string | null {
  const header = (req.headers.authorization || req.headers.Authorization) as string | undefined;
  return extractBearerToken(header);
}

/**
 * Core verification logic, usable both from Vercel's VercelRequest (production)
 * and from the plain Node `Authorization` header string (local Vite dev middleware).
 */
export async function verifyAdminToken(authHeader: string | null | undefined): Promise<VerifiedAdmin> {
  const token = extractBearerToken(authHeader);
  if (!token) {
    throw new AdminAuthError('Missing Authorization header. Please sign in again.', 401);
  }

  let payload;
  try {
    const result = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    payload = result.payload;
  } catch {
    throw new AdminAuthError('Your session token is invalid or expired. Please sign in again.', 401);
  }

  const email = typeof payload.email === 'string' ? payload.email.toLowerCase().trim() : '';
  const uid = typeof payload.user_id === 'string' ? payload.user_id : String(payload.sub || '');

  if (!email || !ADMIN_EMAILS.includes(email)) {
    throw new AdminAuthError('Admin access required for this action.', 403);
  }

  return { uid, email };
}

export async function verifyAdmin(req: VercelRequest): Promise<VerifiedAdmin> {
  return verifyAdminToken(getBearerToken(req));
}
