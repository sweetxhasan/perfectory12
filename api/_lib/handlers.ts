import { promises as dns } from 'dns';
import { verifyAdminToken, AdminAuthError } from './admin-auth';
import { sendMail, assertValidSmtpConfig, verifyConnection } from './mailer';

export interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

/* ── /api/send-email ────────────────────────────────── */

export async function handleSendEmail(
  authHeader: string | null | undefined,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const startedAt = Date.now();
  try {
    await verifyAdminToken(authHeader);

    const { smtp, to, subject, html, text } = body || ({} as Record<string, unknown>);

    if (!to || typeof to !== 'string') {
      return { status: 400, body: { error: 'A recipient email address is required.' } };
    }
    if (!subject || typeof subject !== 'string') {
      return { status: 400, body: { error: 'A subject line is required.' } };
    }
    if (!html || typeof html !== 'string') {
      return { status: 400, body: { error: 'Message content is required.' } };
    }

    const info = await sendMail({
      smtp: smtp as Parameters<typeof sendMail>[0]['smtp'],
      to,
      subject,
      html,
      text: typeof text === 'string' ? text : undefined,
    });

    return {
      status: 200,
      body: {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        durationMs: Date.now() - startedAt,
      },
    };
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return { status: err.status, body: { error: err.message } };
    }
    const message = err instanceof Error ? err.message : 'Failed to send email.';
    return { status: 502, body: { success: false, error: message, durationMs: Date.now() - startedAt } };
  }
}

/* ── /api/verify-smtp ───────────────────────────────── */

export async function handleVerifySmtp(
  authHeader: string | null | undefined,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const startedAt = Date.now();
  try {
    await verifyAdminToken(authHeader);

    const smtp = assertValidSmtpConfig(body?.smtp as Parameters<typeof assertValidSmtpConfig>[0]);
    await verifyConnection(smtp);

    return { status: 200, body: { success: true, durationMs: Date.now() - startedAt } };
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return { status: err.status, body: { error: err.message } };
    }
    const message = err instanceof Error ? err.message : 'Connection failed.';
    return { status: 502, body: { success: false, error: message, durationMs: Date.now() - startedAt } };
  }
}

/* ── /api/check-dns ─────────────────────────────────── */

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

interface BimiCheckResult {
  found: boolean;
  record: string | null;
  logoUrl: string | null;
}

async function checkBimi(domain: string, selector: string): Promise<BimiCheckResult> {
  try {
    const records = await dns.resolveTxt(`${selector}._bimi.${domain}`);
    const flat = records.map((r) => r.join(''));
    const record = flat.find((r) => /v=bimi1/i.test(r)) || null;
    const logoMatch = record ? record.match(/l=([^;]+)/i) : null;
    return { found: !!record, record, logoUrl: logoMatch ? logoMatch[1].trim() : null };
  } catch {
    return { found: false, record: null, logoUrl: null };
  }
}

/** Extracts the DMARC enforcement policy (p=) from a DMARC TXT record, e.g. "none" | "quarantine" | "reject". */
function parseDmarcPolicy(record: string | null): string | null {
  if (!record) return null;
  const match = record.match(/p=(none|quarantine|reject)/i);
  return match ? match[1].toLowerCase() : null;
}

export async function handleCheckDns(
  authHeader: string | null | undefined,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  try {
    await verifyAdminToken(authHeader);

    const { domain, dkimSelector } = body || ({} as Record<string, unknown>);
    if (!domain || typeof domain !== 'string') {
      return { status: 400, body: { error: 'A domain is required, e.g. yourdomain.com' } };
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

    const [spf, dmarc, mx, dkim, bimi] = await Promise.all([
      checkSpf(clean),
      checkDmarc(clean),
      checkMx(clean),
      checkDkim(clean, selector),
      checkBimi(clean, 'default'),
    ]);

    return {
      status: 200,
      body: {
        domain: clean,
        spf,
        dmarc,
        mx,
        dkim,
        bimi,
        dkimSelector: selector,
        dmarcPolicy: parseDmarcPolicy(dmarc.record),
      },
    };
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return { status: err.status, body: { error: err.message } };
    }
    return { status: 500, body: { error: err instanceof Error ? err.message : 'DNS lookup failed.' } };
  }
}
