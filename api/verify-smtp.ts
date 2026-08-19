import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdmin, AdminAuthError } from './_lib/admin-auth';
import { assertValidSmtpConfig, verifyConnection } from './_lib/mailer';

/** Checks that the SMTP server accepts a connection + login, without sending any mail. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const startedAt = Date.now();

  try {
    await verifyAdmin(req);

    const smtp = assertValidSmtpConfig(req.body?.smtp);
    await verifyConnection(smtp);

    res.status(200).json({ success: true, durationMs: Date.now() - startedAt });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Connection failed.';
    res.status(502).json({ success: false, error: message, durationMs: Date.now() - startedAt });
  }
}
