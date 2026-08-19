import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as dns } from 'dns';
import { verifyAdmin, AdminAuthError } from './_lib/admin-auth';

interface TxtCheckResult {
  found: boolean;
  record: string | null;
}

interface MxCheckResult {
  found: boolean;
  records: string[];
}

async function checkSpf(domain: string): Promise<TxtCheckResult> {
  try {
    const records = await dns.resolveTxt(domain);
    const flat = records.map((r) => r.join(''));
    const record = flat.find((r) => r.toLowerCase().startsWith('v=spf1')) || null;
    return { found: !!record, record };
  } catch {
    return { found: false, record: null };
  }
}

async function checkDmarc(domain: string): Promise<TxtCheckResult> {
  try {
    const records = await dns.resolveTxt(`_dmarc.${domain}`);
    const flat = records.map((r) => r.join(''));
    const record = flat.find((r) => r.toLowerCase().startsWith('v=dmarc1')) || null;
    return { found: !!record, record };
  } catch {
    return { found: false, record: null };
  }
}

async function checkMx(domain: string): Promise<MxCheckResult> {
  try {
    const records = await dns.resolveMx(domain);
    records.sort((a, b) => a.priority - b.priority);
    return { found: records.length > 0, records: records.map((r) => r.exchange) };
  } catch {
    return { found: false, records: [] };
  }
}

async function checkDkim(domain: string, selector: string): Promise<TxtCheckResult> {
  try {
    const records = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
    const flat = records.map((r) => r.join(''));
    const record = flat.find((r) => /v=dkim1/i.test(r) || /p=/i.test(r)) || null;
    return { found: !!record, record };
  } catch {
    return { found: false, record: null };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    await verifyAdmin(req);

    const { domain, dkimSelector } = req.body || {};
    if (!domain || typeof domain !== 'string') {
      res.status(400).json({ error: 'A domain is required, e.g. yourdomain.com' });
      return;
    }

    const clean = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^mailto:/, '')
      .split('/')[0]
      .split('@')
      .pop() as string;

    const selector = typeof dkimSelector === 'string' && dkimSelector.trim() ? dkimSelector.trim() : 'default';

    const [spf, dmarc, mx, dkim] = await Promise.all([
      checkSpf(clean),
      checkDmarc(clean),
      checkMx(clean),
      checkDkim(clean, selector),
    ]);

    res.status(200).json({ domain: clean, spf, dmarc, mx, dkim, dkimSelector: selector });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err instanceof Error ? err.message : 'DNS lookup failed.' });
  }
}
