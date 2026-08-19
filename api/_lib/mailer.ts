import nodemailer from 'nodemailer';
import type { SendMailOptions } from 'nodemailer';

export type SmtpEncryption = 'none' | 'starttls' | 'ssl';

export interface SmtpConfigInput {
  host: string;
  port: number;
  encryption: SmtpEncryption;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
}

export interface SendMailInput {
  smtp: SmtpConfigInput;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assertValidSmtpConfig(smtp: Partial<SmtpConfigInput> | undefined): SmtpConfigInput {
  if (!smtp) throw new Error('SMTP configuration is required.');
  if (!smtp.host || typeof smtp.host !== 'string') throw new Error('SMTP host is required.');
  if (!smtp.port || typeof smtp.port !== 'number' || smtp.port < 1 || smtp.port > 65535) {
    throw new Error('A valid SMTP port is required.');
  }
  if (!smtp.fromEmail || !EMAIL_RE.test(smtp.fromEmail)) {
    throw new Error('A valid "From" email address is required.');
  }
  const encryption: SmtpEncryption =
    smtp.encryption === 'ssl' || smtp.encryption === 'starttls' || smtp.encryption === 'none'
      ? smtp.encryption
      : 'starttls';
  return {
    host: smtp.host.trim(),
    port: smtp.port,
    encryption,
    username: smtp.username?.trim() || '',
    password: smtp.password || '',
    fromName: smtp.fromName?.trim() || 'Perfectory Voice',
    fromEmail: smtp.fromEmail.trim(),
    replyTo: smtp.replyTo?.trim() || undefined,
  };
}

export function buildTransport(smtp: SmtpConfigInput) {
  const secure = smtp.encryption === 'ssl';
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure,
    requireTLS: smtp.encryption === 'starttls',
    auth: smtp.username ? { user: smtp.username, pass: smtp.password } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { minVersion: 'TLSv1.2' },
  });
}

/** Very small HTML → text fallback, good enough for deliverability's multipart requirement. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function domainOf(email: string): string {
  return email.split('@')[1] || 'localhost';
}

export async function verifyConnection(smtp: SmtpConfigInput): Promise<void> {
  const transport = buildTransport(smtp);
  try {
    await transport.verify();
  } finally {
    transport.close();
  }
}

export async function sendMail(input: SendMailInput) {
  const smtp = assertValidSmtpConfig(input.smtp);
  const transport = buildTransport(smtp);

  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${domainOf(smtp.fromEmail)}>`;

  const mail: SendMailOptions = {
    from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text?.trim() || htmlToPlainText(input.html),
    replyTo: smtp.replyTo || smtp.fromEmail,
    messageId,
    headers: {
      'X-Mailer': 'PerfectoryVoice-SMTP/1.0',
    },
  };

  try {
    const info = await transport.sendMail(mail);
    return info;
  } finally {
    transport.close();
  }
}
