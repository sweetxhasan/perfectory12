import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

const CONFIG_DOC = doc(db, 'perfectory_config', 'smtp');
const LOGS = 'perfectory_smtp_logs';

/* ── Types ──────────────────────────────────────────── */

export type SmtpEncryption = 'none' | 'starttls' | 'ssl';

export interface SmtpConfig {
  host: string;
  port: number;
  encryption: SmtpEncryption;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  provider: string;
  dkimSelector: string;
  updatedByEmail?: string;
  updatedAt?: Timestamp | null;
}

export interface SmtpEmailLog {
  id: string;
  to: string;
  subject: string;
  status: 'success' | 'failed';
  error?: string;
  messageId?: string;
  durationMs?: number;
  testMode: boolean;
  sentBy: string;
  createdAt: Timestamp | null;
}

export interface SmtpProviderPreset {
  id: string;
  label: string;
  host: string;
  port: number;
  encryption: SmtpEncryption;
  note: string;
}

/* ── Provider presets ───────────────────────────────── */

export const SMTP_PROVIDER_PRESETS: SmtpProviderPreset[] = [
  { id: 'custom', label: 'Custom', host: '', port: 587, encryption: 'starttls', note: 'Enter your own SMTP details.' },
  { id: 'gmail', label: 'Gmail', host: 'smtp.gmail.com', port: 587, encryption: 'starttls', note: 'Use a Google App Password, not your normal password.' },
  { id: 'outlook365', label: 'Outlook / Microsoft 365', host: 'smtp.office365.com', port: 587, encryption: 'starttls', note: 'Requires SMTP AUTH enabled on the mailbox.' },
  { id: 'zoho', label: 'Zoho Mail', host: 'smtp.zoho.com', port: 465, encryption: 'ssl', note: 'Use a Zoho app-specific password.' },
  { id: 'sendgrid', label: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, encryption: 'starttls', note: 'Username is literally "apikey"; password is your API key.' },
  { id: 'mailgun', label: 'Mailgun', host: 'smtp.mailgun.org', port: 587, encryption: 'starttls', note: 'Use the SMTP credentials from your Mailgun domain.' },
  { id: 'ses', label: 'Amazon SES', host: 'email-smtp.us-east-1.amazonaws.com', port: 587, encryption: 'starttls', note: 'Use SES SMTP credentials, not your AWS IAM keys.' },
  { id: 'brevo', label: 'Brevo (Sendinblue)', host: 'smtp-relay.brevo.com', port: 587, encryption: 'starttls', note: 'Use your Brevo SMTP key as the password.' },
];

export const DEFAULT_SMTP_CONFIG: SmtpConfig = {
  host: '',
  port: 587,
  encryption: 'starttls',
  username: '',
  password: '',
  fromName: 'Perfectory Voice',
  fromEmail: '',
  replyTo: '',
  provider: 'custom',
  dkimSelector: 'default',
};

/* ── Firestore: settings ────────────────────────────── */

export async function getSmtpConfig(): Promise<SmtpConfig> {
  try {
    const snap = await getDoc(CONFIG_DOC);
    if (snap.exists()) return { ...DEFAULT_SMTP_CONFIG, ...(snap.data() as Partial<SmtpConfig>) };
  } catch { /* ignore — use defaults */ }
  return DEFAULT_SMTP_CONFIG;
}

export async function saveSmtpConfig(config: SmtpConfig, updatedByEmail: string): Promise<void> {
  await setDoc(CONFIG_DOC, {
    ...config,
    updatedByEmail,
    updatedAt: serverTimestamp(),
  });
}

/* ── Firestore: send logs ───────────────────────────── */

export async function logSmtpEmail(entry: Omit<SmtpEmailLog, 'id' | 'createdAt'>): Promise<void> {
  await addDoc(collection(db, LOGS), {
    ...entry,
    createdAt: serverTimestamp(),
  });
}

export function subscribeSmtpLogs(
  onData: (logs: SmtpEmailLog[]) => void,
  onError: (err: Error) => void,
  n = 50,
): Unsubscribe {
  const q = query(collection(db, LOGS), orderBy('createdAt', 'desc'), limit(n));
  return onSnapshot(
    q,
    (snap) => {
      const logs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SmtpEmailLog, 'id'>) }));
      onData(logs);
    },
    (err) => onError(err as Error),
  );
}

/* ── Server API calls ───────────────────────────────── */

export interface TestEmailPayload {
  smtp: SmtpConfig;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface TestEmailResult {
  success: boolean;
  messageId?: string;
  response?: string;
  durationMs: number;
  error?: string;
}

async function postJson<T>(path: string, idToken: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status}).`);
  }
  return data as T;
}

export async function sendTestEmail(idToken: string, payload: TestEmailPayload): Promise<TestEmailResult> {
  return postJson<TestEmailResult>('/api/send-email', idToken, payload);
}

export interface VerifyConnectionResult {
  success: boolean;
  durationMs: number;
  error?: string;
}

export async function verifySmtpConnection(idToken: string, smtp: SmtpConfig): Promise<VerifyConnectionResult> {
  return postJson<VerifyConnectionResult>('/api/verify-smtp', idToken, { smtp });
}

export interface DnsCheckEntry {
  found: boolean;
  record?: string | null;
  records?: string[];
}

export interface BimiCheckEntry extends DnsCheckEntry {
  logoUrl?: string | null;
}

export interface DnsCheckResult {
  domain: string;
  dkimSelector: string;
  spf: DnsCheckEntry;
  dmarc: DnsCheckEntry;
  mx: DnsCheckEntry;
  dkim: DnsCheckEntry;
  bimi: BimiCheckEntry;
  dmarcPolicy: 'none' | 'quarantine' | 'reject' | null;
}

export async function checkDomainDeliverability(
  idToken: string,
  domain: string,
  dkimSelector: string,
): Promise<DnsCheckResult> {
  return postJson<DnsCheckResult>('/api/check-dns', idToken, { domain, dkimSelector });
}

export function emailDomain(email: string): string {
  return email.split('@')[1]?.trim() || '';
}
