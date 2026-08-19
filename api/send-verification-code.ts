import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleSendVerificationCode } from './_lib/handlers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const { status, body } = await handleSendVerificationCode(req.body || {});
  res.status(status).json(body);
}
