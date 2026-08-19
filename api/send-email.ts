import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdmin, AdminAuthError } from './_lib/admin-auth';
import { sendMail } from './_lib/mailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const startedAt = Date.now();

  try {
    await verifyAdmin(req);

    const body = req.body || {};
    const { smtp, to, subject, html, text } = body;

    if (!to || typeof to !== 'string') {
      res.status(400).json({ error: 'A recipient email address is required.' });
      return;
    }
    if (!subject || typeof subject !== 'string') {
      res.status(400).json({ error: 'A subject line is required.' });
      return;
    }
    if (!html || typeof html !== 'string') {
      res.status(400).json({ error: 'Message content is required.' });
      return;
    }

    const info = await sendMail({ smtp, to, subject, html, text });

    res.status(200).json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Failed to send email.';
    res.status(502).json({ success: false, error: message, durationMs: Date.now() - startedAt });
  }
}
