import type { VercelRequest, VercelResponse } from '@vercel/node';

const TTS_API = 'https://littlevoiceapi.littleblog.online/text-to-voice';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const upstream = await fetch(TTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(120000),
    });
    const body = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(body);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : 'Text-to-voice API unavailable.' });
  }
}
