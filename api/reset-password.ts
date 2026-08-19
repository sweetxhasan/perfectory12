import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleResetPassword } from './_lib/handlers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const { status, body } = await handleResetPassword(req.body || {});
  res.status(status).json(body);
}
