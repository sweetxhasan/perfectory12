import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCleanupExpiredOtps } from './_lib/handlers';

/**
 * Scheduled by vercel.json's `crons` entry to sweep expired signup OTP
 * records out of Firestore. Also safe to call manually (GET or POST) —
 * it only ever deletes documents whose `expiresAt` has already passed.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { status, body } = await handleCleanupExpiredOtps();
  res.status(status).json(body);
}
