import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleVerifySmtp } from './_lib/handlers';

/** Checks that the SMTP server accepts a connection + login, without sending any mail. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const authHeader = (req.headers.authorization || req.headers.Authorization) as string | undefined;
  const { status, body } = await handleVerifySmtp(authHeader, req.body || {});
  res.status(status).json(body);
}
