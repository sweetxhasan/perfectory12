import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleSendEmail } from './_lib/handlers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const authHeader = (req.headers.authorization || req.headers.Authorization) as string | undefined;
  const { status, body } = await handleSendEmail(authHeader, req.body || {});
  res.status(status).json(body);
}
