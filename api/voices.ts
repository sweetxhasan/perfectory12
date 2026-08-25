import type { VercelRequest, VercelResponse } from '@vercel/node';

const VOICES_API = 'https://littlevoiceapi.littleblog.online/api/voices';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  try {
    const language = typeof req.query.language === 'string' ? req.query.language : 'bn';
    const upstream = await fetch(`${VOICES_API}?language=${encodeURIComponent(language)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    const body = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(body);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : 'Voice API unavailable.' });
  }
}
