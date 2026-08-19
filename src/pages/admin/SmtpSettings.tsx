import { useEffect, useMemo, useState } from 'react';
import { SiteShell } from '@/components/site-shell';
import { AdminGuard } from '@/components/admin-guard';
import { Icon } from '@/components/icon';
import { useAuth } from '@/lib/auth-context';
import {
  SMTP_PROVIDER_PRESETS,
  DEFAULT_SMTP_CONFIG,
  getSmtpConfig,
  saveSmtpConfig,
  sendTestEmail,
  verifySmtpConnection,
  checkDomainDeliverability,
  subscribeSmtpLogs,
  logSmtpEmail,
  emailDomain,
  type SmtpConfig,
  type SmtpEncryption,
  type SmtpEmailLog,
  type DnsCheckResult,
} from '@/lib/smtp-store';

const GRADIENT = 'linear-gradient(-45deg,#6e1a52,#ec5252)';

type AsyncStatus = 'idle' | 'busy' | 'success' | 'error';

/* ── Small shared bits ──────────────────────────────── */

function SectionCard({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
          <Icon name={icon} size={20} className={iconColor} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-brand focus:ring-2 focus:ring-brand/20 transition disabled:opacity-60';

function StatusBanner({ status, successText, errorText }: { status: AsyncStatus; successText: string; errorText: string }) {
  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-600">
        <Icon name="check" size={14} />
        {successText}
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <Icon name="x" size={14} />
        {errorText}
      </div>
    );
  }
  return null;
}

/* ── Stat card (matches AdminApiSettings style) ─────── */

function StatCard({ label, value, gradient }: { label: string; value: string | number; gradient: string }) {
  return (
    <div className="flex-1 min-w-0 rounded-2xl border border-border bg-card px-3 py-4 flex flex-col items-center text-center">
      <p
        className="text-xl sm:text-2xl font-bold leading-none tracking-tight mb-1.5 bg-clip-text text-transparent"
        style={{ backgroundImage: gradient }}
      >
        {value}
      </p>
      <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground leading-none truncate w-full text-center">
        {label}
      </p>
    </div>
  );
}

/* ── DNS check row ───────────────────────────────────── */

function DnsRow({ label, ok, detail, fixHint }: { label: string; ok: boolean; detail: string; fixHint: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-background px-4 py-3">
      <div
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          ok ? 'bg-green-500/15 text-green-600' : 'bg-amber-500/15 text-amber-600'
        }`}
      >
        <Icon name={ok ? 'check' : 'info'} size={13} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground" title={detail}>
          {detail}
        </p>
        {!ok && <p className="mt-1 text-[11px] text-amber-600">{fixHint}</p>}
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────── */

export default function AdminSmtpSettings() {
  const { user, profile } = useAuth();

  const [config, setConfig] = useState<SmtpConfig>(DEFAULT_SMTP_CONFIG);
  const [configLoading, setConfigLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [saveStatus, setSaveStatus] = useState<AsyncStatus>('idle');
  const [saveError, setSaveError] = useState('');

  const [verifyStatus, setVerifyStatus] = useState<AsyncStatus>('idle');
  const [verifyMessage, setVerifyMessage] = useState('');
  const [verifyMs, setVerifyMs] = useState<number | null>(null);

  const [testTo, setTestTo] = useState('');
  const [testSubject, setTestSubject] = useState('Test email from Perfectory Voice SMTP');
  const [testHtml, setTestHtml] = useState(
    '<p>Hi there,</p><p>This is a test email sent from the Perfectory Voice SMTP server to confirm everything is configured correctly.</p><p>— Perfectory Voice</p>',
  );
  const [testStatus, setTestStatus] = useState<AsyncStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [testMs, setTestMs] = useState<number | null>(null);

  const [dnsDomain, setDnsDomain] = useState('');
  const [dnsSelector, setDnsSelector] = useState('default');
  const [dnsStatus, setDnsStatus] = useState<AsyncStatus>('idle');
  const [dnsResult, setDnsResult] = useState<DnsCheckResult | null>(null);
  const [dnsError, setDnsError] = useState('');

  const [logs, setLogs] = useState<SmtpEmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  /* Load config once */
  useEffect(() => {
    getSmtpConfig()
      .then((c) => {
        setConfig(c);
        if (c.fromEmail) setDnsDomain(emailDomain(c.fromEmail));
        if (c.dkimSelector) setDnsSelector(c.dkimSelector);
      })
      .finally(() => setConfigLoading(false));
  }, []);

  /* Live send logs */
  useEffect(() => {
    const unsub = subscribeSmtpLogs(
      (l) => {
        setLogs(l);
        setLogsLoading(false);
      },
      () => setLogsLoading(false),
    );
    return unsub;
  }, []);

  const stats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((l) => l.status === 'success').length;
    const failed = total - success;
    const rate = total > 0 ? Math.round((success / total) * 100) : 0;
    return { total, success, failed, rate };
  }, [logs]);

  function updateField<K extends keyof SmtpConfig>(key: K, value: SmtpConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  function applyPreset(presetId: string) {
    const preset = SMTP_PROVIDER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setConfig((c) => ({
      ...c,
      provider: preset.id,
      host: preset.host || c.host,
      port: preset.port,
      encryption: preset.encryption,
    }));
  }

  async function getToken(): Promise<string> {
    if (!user) throw new Error('Not signed in.');
    return user.getIdToken();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus('busy');
    setSaveError('');
    try {
      if (!config.host.trim()) throw new Error('SMTP host is required.');
      if (!config.fromEmail.trim()) throw new Error('"From" email address is required.');
      await saveSmtpConfig(config, profile?.email || user?.email || 'unknown');
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 4000);
    } catch (err) {
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings.');
    }
  }

  async function handleVerify() {
    setVerifyStatus('busy');
    setVerifyMessage('');
    setVerifyMs(null);
    try {
      const token = await getToken();
      const result = await verifySmtpConnection(token, config);
      setVerifyMs(result.durationMs);
      if (result.success) {
        setVerifyStatus('success');
        setVerifyMessage('Connection & authentication succeeded.');
      } else {
        setVerifyStatus('error');
        setVerifyMessage(result.error || 'Connection failed.');
      }
    } catch (err) {
      setVerifyStatus('error');
      setVerifyMessage(err instanceof Error ? err.message : 'Connection failed.');
    }
  }

  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    if (!testTo.trim()) {
      setTestStatus('error');
      setTestMessage('Enter a recipient email address.');
      return;
    }
    setTestStatus('busy');
    setTestMessage('');
    setTestMs(null);
    try {
      const token = await getToken();
      const result = await sendTestEmail(token, {
        smtp: config,
        to: testTo.trim(),
        subject: testSubject.trim() || 'Test email',
        html: testHtml,
      });
      setTestMs(result.durationMs);
      await logSmtpEmail({
        to: testTo.trim(),
        subject: testSubject.trim() || 'Test email',
        status: 'success',
        messageId: result.messageId,
        durationMs: result.durationMs,
        testMode: true,
        sentBy: profile?.email || user?.email || 'unknown',
      });
      setTestStatus('success');
      setTestMessage(`Delivered to mail server. Message ID: ${result.messageId ?? 'n/a'}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send test email.';
      setTestStatus('error');
      setTestMessage(message);
      await logSmtpEmail({
        to: testTo.trim(),
        subject: testSubject.trim() || 'Test email',
        status: 'failed',
        error: message,
        testMode: true,
        sentBy: profile?.email || user?.email || 'unknown',
      }).catch(() => {});
    }
  }

  async function handleCheckDns(e: React.FormEvent) {
    e.preventDefault();
    if (!dnsDomain.trim()) {
      setDnsStatus('error');
      setDnsError('Enter a domain, e.g. yourdomain.com');
      return;
    }
    setDnsStatus('busy');
    setDnsError('');
    try {
      const token = await getToken();
      const result = await checkDomainDeliverability(token, dnsDomain.trim(), dnsSelector.trim() || 'default');
      setDnsResult(result);
      setDnsStatus('success');
    } catch (err) {
      setDnsStatus('error');
      setDnsError(err instanceof Error ? err.message : 'DNS lookup failed.');
    }
  }

  return (
    <AdminGuard>
      <SiteShell>
        <div className="mx-auto max-w-3xl space-y-6 px-1">
          {/* ── Header ── */}
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: GRADIENT }}>
              SMTP Email Server
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure your outgoing mail server, verify deliverability, and send test emails.
            </p>
          </div>

          {/* ── Stats ── */}
          <div className="flex gap-2 sm:gap-3">
            <StatCard label="Total Sent" value={logsLoading ? '…' : stats.total} gradient="linear-gradient(135deg, #6366f1, #8b5cf6)" />
            <StatCard label="Success" value={logsLoading ? '…' : stats.success} gradient="linear-gradient(135deg, #22c55e, #16a34a)" />
            <StatCard label="Failed" value={logsLoading ? '…' : stats.failed} gradient="linear-gradient(135deg, #f43f5e, #e11d48)" />
            <StatCard label="Success Rate" value={logsLoading ? '…' : `${stats.rate}%`} gradient="linear-gradient(135deg, #f59e0b, #f97316)" />
          </div>

          {/* ── Server configuration ── */}
          <SectionCard
            icon="sliders"
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-600"
            title="Server Configuration"
            subtitle="Host, port, credentials, and sender identity."
          >
            {/* Provider presets */}
            <div className="flex flex-wrap gap-2">
              {SMTP_PROVIDER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  disabled={configLoading}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    config.provider === preset.id
                      ? 'border-transparent bg-gradient-brand text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {config.provider !== 'custom' && (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Icon name="info" size={13} className="mt-0.5 shrink-0" />
                {SMTP_PROVIDER_PRESETS.find((p) => p.id === config.provider)?.note}
              </p>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Field label="SMTP Host">
                    <input
                      type="text"
                      value={config.host}
                      onChange={(e) => updateField('host', e.target.value)}
                      placeholder="smtp.yourdomain.com"
                      disabled={configLoading}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field label="Port">
                  <input
                    type="number"
                    value={config.port}
                    onChange={(e) => updateField('port', Number(e.target.value) || 0)}
                    disabled={configLoading}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Encryption">
                <select
                  value={config.encryption}
                  onChange={(e) => updateField('encryption', e.target.value as SmtpEncryption)}
                  disabled={configLoading}
                  className={inputClass}
                >
                  <option value="starttls">STARTTLS (recommended · port 587)</option>
                  <option value="ssl">SSL/TLS (port 465)</option>
                  <option value="none">None (unencrypted, not recommended)</option>
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="SMTP Username">
                  <input
                    type="text"
                    value={config.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    placeholder="user@yourdomain.com"
                    disabled={configLoading}
                    className={inputClass}
                  />
                </Field>
                <Field label="SMTP Password">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={config.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      placeholder="••••••••••••"
                      disabled={configLoading}
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} />
                    </button>
                  </div>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="From Name">
                  <input
                    type="text"
                    value={config.fromName}
                    onChange={(e) => updateField('fromName', e.target.value)}
                    placeholder="Perfectory Voice"
                    disabled={configLoading}
                    className={inputClass}
                  />
                </Field>
                <Field label="From Email">
                  <input
                    type="email"
                    value={config.fromEmail}
                    onChange={(e) => updateField('fromEmail', e.target.value)}
                    placeholder="noreply@yourdomain.com"
                    disabled={configLoading}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Reply-To" hint="Optional — where replies from recipients should land.">
                <input
                  type="email"
                  value={config.replyTo}
                  onChange={(e) => updateField('replyTo', e.target.value)}
                  placeholder="support@yourdomain.com"
                  disabled={configLoading}
                  className={inputClass}
                />
              </Field>

              {saveStatus === 'error' && (
                <StatusBanner status="error" successText="" errorText={saveError} />
              )}
              {saveStatus === 'success' && (
                <StatusBanner status="success" successText="SMTP settings saved." errorText="" />
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={saveStatus === 'busy' || configLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                >
                  {saveStatus === 'busy' ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Icon name="check" size={16} />
                      Save Settings
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifyStatus === 'busy' || configLoading || !config.host}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 text-sm font-semibold transition hover:bg-muted disabled:opacity-60"
                >
                  {verifyStatus === 'busy' ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
                      Testing Connection…
                    </>
                  ) : (
                    <>
                      <Icon name="bolt" size={16} />
                      Test Connection
                    </>
                  )}
                </button>
              </div>

              {verifyStatus === 'success' && (
                <StatusBanner
                  status="success"
                  successText={`${verifyMessage}${verifyMs != null ? ` (${verifyMs}ms)` : ''}`}
                  errorText=""
                />
              )}
              {verifyStatus === 'error' && (
                <StatusBanner status="error" successText="" errorText={verifyMessage} />
              )}
            </form>
          </SectionCard>

          {/* ── Deliverability checklist ── */}
          <SectionCard
            icon="shield"
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-600"
            title="Inbox Deliverability Checklist"
            subtitle="Real DNS checks for the settings that keep mail out of spam."
          >
            <div className="flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
              <Icon name="info" size={14} className="mt-0.5 shrink-0" />
              No software can guarantee 100% inbox placement — that depends on your domain's DNS records and sending
              reputation. Fixing every item below is the single biggest lever you control.
            </div>

            <form onSubmit={handleCheckDns} className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Field label="Your sending domain">
                  <input
                    type="text"
                    value={dnsDomain}
                    onChange={(e) => setDnsDomain(e.target.value)}
                    placeholder="yourdomain.com"
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="DKIM selector">
                <input
                  type="text"
                  value={dnsSelector}
                  onChange={(e) => setDnsSelector(e.target.value)}
                  placeholder="default"
                  className={inputClass}
                />
              </Field>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={dnsStatus === 'busy'}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 text-sm font-semibold transition hover:bg-muted disabled:opacity-60"
                >
                  {dnsStatus === 'busy' ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
                      Checking DNS…
                    </>
                  ) : (
                    <>
                      <Icon name="globe" size={16} />
                      Run Deliverability Check
                    </>
                  )}
                </button>
              </div>
            </form>

            {dnsStatus === 'error' && <StatusBanner status="error" successText="" errorText={dnsError} />}

            {dnsResult && (
              <div className="space-y-2.5">
                <DnsRow
                  label="SPF record"
                  ok={dnsResult.spf.found}
                  detail={dnsResult.spf.record || 'No SPF (v=spf1) TXT record found.'}
                  fixHint={`Add a TXT record on ${dnsResult.domain}: "v=spf1 include:${config.host || 'your-smtp-provider'} ~all"`}
                />
                <DnsRow
                  label="DKIM record"
                  ok={dnsResult.dkim.found}
                  detail={dnsResult.dkim.record || `No DKIM TXT record found at ${dnsResult.dkimSelector}._domainkey.${dnsResult.domain}`}
                  fixHint="Generate a DKIM key from your SMTP/email provider and publish it as a TXT record at that selector."
                />
                <DnsRow
                  label="DMARC record"
                  ok={dnsResult.dmarc.found}
                  detail={dnsResult.dmarc.record || `No DMARC TXT record found at _dmarc.${dnsResult.domain}`}
                  fixHint={`Add a TXT record on _dmarc.${dnsResult.domain}: "v=DMARC1; p=quarantine; rua=mailto:${config.replyTo || config.fromEmail || 'you@yourdomain.com'}"`}
                />
                <DnsRow
                  label="MX records"
                  ok={dnsResult.mx.found}
                  detail={dnsResult.mx.records?.length ? dnsResult.mx.records.join(', ') : 'No MX records found for this domain.'}
                  fixHint="Point MX records to a real mailbox provider so bounces and replies can be received."
                />
              </div>
            )}
          </SectionCard>

          {/* ── Test email sender ── */}
          <SectionCard
            icon="send"
            iconBg="bg-sky-500/10"
            iconColor="text-sky-600"
            title="Advanced Test Email Sender"
            subtitle="Send a real email through the configured SMTP server right now."
          >
            <form onSubmit={handleSendTest} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Send To">
                  <input
                    type="email"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </Field>
                <Field label="Subject">
                  <input
                    type="text"
                    value={testSubject}
                    onChange={(e) => setTestSubject(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Message (HTML)" hint="A plain-text fallback is generated automatically for better deliverability.">
                <textarea
                  value={testHtml}
                  onChange={(e) => setTestHtml(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm font-mono outline-none placeholder:text-muted-foreground/50 focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
                />
              </Field>

              {testStatus === 'success' && <StatusBanner status="success" successText={`${testMessage}${testMs != null ? ` · ${testMs}ms` : ''}`} errorText="" />}
              {testStatus === 'error' && <StatusBanner status="error" successText="" errorText={testMessage} />}

              <button
                type="submit"
                disabled={testStatus === 'busy'}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              >
                {testStatus === 'busy' ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Icon name="send" size={16} />
                    Send Test Email
                  </>
                )}
              </button>
            </form>
          </SectionCard>

          {/* ── Recent activity ── */}
          <div className="rounded-3xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-500/10">
                  <Icon name="clock" size={20} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Recent Send Activity</p>
                  <p className="text-xs text-muted-foreground">Latest emails sent through this SMTP server.</p>
                </div>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {logsLoading ? '…' : logs.length}
              </span>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {logsLoading && (
                <div className="flex flex-col divide-y divide-border/40">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <div className="h-4 w-4 rounded-full bg-muted/60 animate-pulse" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-32 rounded-full bg-muted/70 animate-pulse" />
                        <div className="h-2.5 w-48 rounded-full bg-muted/40 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!logsLoading && logs.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-14 text-muted-foreground">
                  <Icon name="mail" size={36} className="opacity-30" />
                  <p className="text-sm font-medium">No emails sent yet</p>
                  <p className="text-xs">Send a test email above to see activity here.</p>
                </div>
              )}

              {!logsLoading && logs.length > 0 && (
                <div className="flex flex-col divide-y divide-border/40">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          log.status === 'success' ? 'bg-green-500/15 text-green-600' : 'bg-rose-500/15 text-rose-600'
                        }`}
                      >
                        <Icon name={log.status === 'success' ? 'check' : 'x'} size={12} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{log.subject}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          To {log.to}
                          {log.testMode ? ' · test' : ''}
                          {log.error ? ` · ${log.error}` : ''}
                        </p>
                      </div>
                      {typeof log.durationMs === 'number' && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">{log.durationMs}ms</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </SiteShell>
    </AdminGuard>
  );
}
