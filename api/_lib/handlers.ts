import { promises as dns } from 'dns';
import { doc, getDoc } from 'firebase/firestore';
import { verifyAdminToken, AdminAuthError } from './admin-auth';
import { sendMail, assertValidSmtpConfig, verifyConnection, type SmtpConfigInput } from './mailer';
import { serverDb } from './firebase-server';
import { issueOtp, verifyOtp, isOtpVerified, markWelcomeSent, wasWelcomeSent, cleanupExpiredOtps, OTP_EXPIRY_MS } from './otp-store';
import {
  issueResetOtp,
  verifyResetOtp,
  isResetOtpVerified,
  consumeResetOtp,
  cleanupExpiredResetOtps,
  RESET_OTP_EXPIRY_MS,
} from './reset-otp-store';
import { accountExistsForEmail } from './user-lookup';
import { isAdminConfigured, getAdminAuth } from './firebase-admin';
import {
  verificationEmailHtml,
  VERIFY_EMAIL_SUBJECT,
  welcomeEmailHtml,
  WELCOME_EMAIL_SUBJECT,
  resetCodeEmailHtml,
  RESET_CODE_EMAIL_SUBJECT,
} from './email-templates';

export interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function loadAdminSmtpConfig(): Promise<SmtpConfigInput | null> {
  const snap = await getDoc(doc(serverDb, 'perfectory_config', 'smtp'));
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<SmtpConfigInput>;
  if (!data.host || !data.fromEmail) return null;
  return {
    host: data.host,
    port: data.port ?? 587,
    encryption: data.encryption ?? 'starttls',
    username: data.username ?? '',
    password: data.password ?? '',
    fromName: data.fromName ?? 'Perfectory Voice',
    fromEmail: data.fromEmail,
    replyTo: data.replyTo,
  };
}

/* ── /api/send-verification-code ────────────────────── */

export async function handleSendVerificationCode(
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { email, name } = body || ({} as Record<string, unknown>);

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return { status: 400, body: { error: 'A valid email address is required.' } };
  }

  const smtp = await loadAdminSmtpConfig();
  if (!smtp) {
    return { status: 503, body: { error: 'Email service is not configured yet. Please try again later.' } };
  }

  // Resend is completely unlimited — no cooldown, no cap on how many times
  // a user can request a fresh code for the same email.
  const result = await issueOtp(email.trim());

  console.log('[v0] OTP code for', email.trim(), '=', result.code);
  try {
    await sendMail({
      smtp,
      to: email.trim(),
      subject: VERIFY_EMAIL_SUBJECT,
      html: verificationEmailHtml({ code: result.code, name: typeof name === 'string' ? name : undefined }),
    });
  } catch (err) {
    return {
      status: 502,
      body: { error: err instanceof Error ? err.message : 'Failed to send the verification email.' },
    };
  }

  return {
    status: 200,
    body: { success: true, expiresInSec: Math.round(OTP_EXPIRY_MS / 1000) },
  };
}

/* ── /api/verify-code ───────────────────────────────── */

export async function handleVerifyCode(
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { email, code, name } = body || ({} as Record<string, unknown>);

  if (!email || typeof email !== 'string') {
    return { status: 400, body: { error: 'An email address is required.' } };
  }
  if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return { status: 400, body: { error: 'Please enter the 6-digit code.' } };
  }

  const trimmedEmail = email.trim();
  const outcome = await verifyOtp(trimmedEmail, code);

  if (outcome.ok) {
    // Send the welcome email right here, server-side, as part of this same
    // request — instead of relying on a second, separate client fetch that
    // can get cut off by the redirect to /dashboard right after. Guarded
    // by welcomeSent so a retried/duplicate verify call never double-sends.
    if (outcome.justVerified && !(await wasWelcomeSent(trimmedEmail))) {
      try {
        const smtp = await loadAdminSmtpConfig();
        if (smtp) {
          await sendMail({
            smtp,
            to: trimmedEmail,
            subject: WELCOME_EMAIL_SUBJECT,
            html: welcomeEmailHtml({ name: typeof name === 'string' ? name : undefined }),
          });
          await markWelcomeSent(trimmedEmail);
        } else {
          console.log('[v0] Skipping welcome email for', trimmedEmail, '— SMTP not configured.');
        }
      } catch (err) {
        // Never fail verification because the welcome email had trouble —
        // the user is verified either way. Just log it for debugging.
        console.log('[v0] Failed to send welcome email to', trimmedEmail, ':', err instanceof Error ? err.message : err);
      }
    }
    return { status: 200, body: { success: true } };
  }

  switch (outcome.reason) {
    case 'not-found':
      return { status: 400, body: { error: 'No verification code found for this email. Please request a new one.' } };
    case 'expired':
      return { status: 400, body: { error: 'This code has expired. Please request a new one.' } };
    case 'too-many-attempts':
      return { status: 429, body: { error: 'Too many attempts. Please request a new code.' } };
    default:
      return {
        status: 400,
        body: {
          error: `Invalid code.${outcome.attemptsLeft ? ` ${outcome.attemptsLeft} attempt${outcome.attemptsLeft === 1 ? '' : 's'} left.` : ''}`,
          attemptsLeft: outcome.attemptsLeft,
        },
      };
  }
}

/* ── /api/send-welcome-email ────────────────────────── */

/**
 * Sends the "Welcome to Perfectory Voice!" email. Public endpoint (no auth
 * token — the account may have only just been created), but gated on the
 * target address having a verified OTP record, so it can't be used to spam
 * arbitrary inboxes that never completed the code flow.
 */
export async function handleSendWelcomeEmail(
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { email, name } = body || ({} as Record<string, unknown>);

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return { status: 400, body: { error: 'A valid email address is required.' } };
  }

  const verified = await isOtpVerified(email.trim());
  if (!verified) {
    return { status: 403, body: { error: 'This email has not completed verification yet.' } };
  }

  const smtp = await loadAdminSmtpConfig();
  if (!smtp) {
    return { status: 503, body: { error: 'Email service is not configured yet.' } };
  }

  try {
    await sendMail({
      smtp,
      to: email.trim(),
      subject: WELCOME_EMAIL_SUBJECT,
      html: welcomeEmailHtml({ name: typeof name === 'string' ? name : undefined }),
    });
  } catch (err) {
    return {
      status: 502,
      body: { error: err instanceof Error ? err.message : 'Failed to send the welcome email.' },
    };
  }

  return { status: 200, body: { success: true } };
}

/* ── /api/send-reset-code ───────────────────────────── */

/** Mirrors Signup.tsx's passwordMeetsPolicy: at least 8 characters and 3 of the 4 character-class rules. */
function passwordMeetsPolicy(pw: string): boolean {
  if (pw.length < 8) return false;
  const checks = [/[A-Z]/.test(pw), /[a-z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  return checks >= 3;
}

export async function handleSendResetCode(
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { email, name } = body || ({} as Record<string, unknown>);

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return { status: 400, body: { error: 'A valid email address is required.' } };
  }

  const trimmedEmail = email.trim();

  // Never mail a reset code to an address with no account on file.
  const exists = await accountExistsForEmail(trimmedEmail);
  if (!exists) {
    return { status: 404, body: { error: 'No account found with this email address.' } };
  }

  const smtp = await loadAdminSmtpConfig();
  if (!smtp) {
    return { status: 503, body: { error: 'Email service is not configured yet. Please try again later.' } };
  }

  // Resend is unlimited, same policy as the signup OTP flow.
  const result = await issueResetOtp(trimmedEmail);

  console.log('[v0] Password reset code for', trimmedEmail, '=', result.code);
  try {
    await sendMail({
      smtp,
      to: trimmedEmail,
      subject: RESET_CODE_EMAIL_SUBJECT,
      html: resetCodeEmailHtml({ code: result.code, name: typeof name === 'string' ? name : undefined }),
    });
  } catch (err) {
    return {
      status: 502,
      body: { error: err instanceof Error ? err.message : 'Failed to send the reset code email.' },
    };
  }

  return {
    status: 200,
    body: { success: true, expiresInSec: Math.round(RESET_OTP_EXPIRY_MS / 1000) },
  };
}

/* ── /api/verify-reset-code ─────────────────────────── */

export async function handleVerifyResetCode(
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { email, code } = body || ({} as Record<string, unknown>);

  if (!email || typeof email !== 'string') {
    return { status: 400, body: { error: 'An email address is required.' } };
  }
  if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return { status: 400, body: { error: 'Please enter the 6-digit code.' } };
  }

  const outcome = await verifyResetOtp(email.trim(), code);
  if (outcome.ok) {
    return { status: 200, body: { success: true } };
  }

  switch (outcome.reason) {
    case 'not-found':
      return { status: 400, body: { error: 'No reset code found for this email. Please request a new one.' } };
    case 'expired':
      return { status: 400, body: { error: 'This code has expired. Please request a new one.' } };
    case 'too-many-attempts':
      return { status: 429, body: { error: 'Too many attempts. Please request a new code.' } };
    default:
      return {
        status: 400,
        body: {
          error: `Invalid code.${outcome.attemptsLeft ? ` ${outcome.attemptsLeft} attempt${outcome.attemptsLeft === 1 ? '' : 's'} left.` : ''}`,
          attemptsLeft: outcome.attemptsLeft,
        },
      };
  }
}

/* ── /api/reset-password ────────────────────────────── */

/**
 * Final step of the forgot-password flow: sets a brand-new password for a
 * signed-out user. Requires a reset-OTP record that has already been
 * verified for this exact email (via /api/verify-reset-code) — the code
 * itself is re-checked here too, so a stale "verified" flag from a much
 * earlier request can't be replayed. Uses the Firebase Admin SDK, since
 * there is no other way to set a new password without the user being
 * signed in.
 */
export async function handleResetPassword(
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { email, code, newPassword } = body || ({} as Record<string, unknown>);

  if (!email || typeof email !== 'string') {
    return { status: 400, body: { error: 'An email address is required.' } };
  }
  if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return { status: 400, body: { error: 'Please enter the 6-digit code.' } };
  }
  if (!newPassword || typeof newPassword !== 'string' || !passwordMeetsPolicy(newPassword)) {
    return { status: 400, body: { error: 'Please choose a stronger password.' } };
  }

  const trimmedEmail = email.trim();

  const outcome = await verifyResetOtp(trimmedEmail, code);
  if (!outcome.ok) {
    return { status: 403, body: { error: 'Your reset code is no longer valid. Please start over.' } };
  }

  if (!isAdminConfigured()) {
    return {
      status: 503,
      body: { error: 'Password reset is not available yet. Please contact support.' },
    };
  }

  try {
    const adminAuth = getAdminAuth();
    const userRecord = await adminAuth.getUserByEmail(trimmedEmail);
    await adminAuth.updateUser(userRecord.uid, { password: newPassword });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/user-not-found') {
      return { status: 404, body: { error: 'No account found with this email address.' } };
    }
    return {
      status: 502,
      body: { error: err instanceof Error ? err.message : 'Failed to update the password.' },
    };
  }

  await consumeResetOtp(trimmedEmail);

  return { status: 200, body: { success: true } };
}

/* ── /api/cleanup-expired-otps ──────────────────────── */

/**
 * Deletes every expired email-OTP record from Firestore. Only ever removes
 * codes that have already expired, so it's safe to run unauthenticated on
 * a schedule (see vercel.json crons) — there's nothing sensitive to read
 * or any live code it could invalidate.
 */
export async function handleCleanupExpiredOtps(): Promise<HandlerResult> {
  try {
    const [{ deleted: signupDeleted }, { deleted: resetDeleted }] = await Promise.all([
      cleanupExpiredOtps(),
      cleanupExpiredResetOtps(),
    ]);
    return { status: 200, body: { success: true, deleted: signupDeleted + resetDeleted } };
  } catch (err) {
    return { status: 500, body: { error: err instanceof Error ? err.message : 'Cleanup failed.' } };
  }
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

    const [spf, dmarc, mx, dkim] = await Promise.all([
      checkSpf(clean),
      checkDmarc(clean),
      checkMx(clean),
      checkDkim(clean, selector),
    ]);

    return { status: 200, body: { domain: clean, spf, dmarc, mx, dkim, dkimSelector: selector } };
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return { status: err.status, body: { error: err.message } };
    }
    return { status: 500, body: { error: err instanceof Error ? err.message : 'DNS lookup failed.' } };
  }
}
