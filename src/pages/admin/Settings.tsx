import { useState } from 'react';
import { SiteShell } from '@/components/site-shell';
import { AdminGuard } from '@/components/admin-guard';
import { Icon } from '@/components/icon';
import { broadcastAdminNotice } from '@/lib/notifications';

export default function AdminSettings() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const d = description.trim();
    if (!t || !d) {
      setErrMsg('Both title and message are required.');
      return;
    }
    setStatus('loading');
    setErrMsg('');
    try {
      await broadcastAdminNotice(t, d);
      setStatus('success');
      setTitle('');
      setDescription('');
      setTimeout(() => setStatus('idle'), 4000);
    } catch (err) {
      console.error('[pv] broadcast error', err);
      setStatus('error');
      setErrMsg('Failed to send notice. Please try again.');
    }
  }

  return (
    <AdminGuard>
      <SiteShell>
        <div className="mx-auto max-w-2xl space-y-8 px-1">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Platform-wide configuration.</p>
          </div>

          {/* ── Broadcast notice panel ── */}
          <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10">
                <Icon name="bell" size={20} className="text-sky-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Send Notice to All Users</p>
                <p className="text-xs text-muted-foreground">
                  Appears as a real-time notification in every user's bell panel.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleBroadcast} className="space-y-4 p-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notice Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setErrMsg(''); setStatus('idle'); }}
                  placeholder="e.g. Scheduled maintenance on Sunday"
                  maxLength={80}
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Message
                </label>
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setErrMsg(''); setStatus('idle'); }}
                  rows={3}
                  placeholder="Write the full message that users will see in their notification panel…"
                  maxLength={300}
                  className="w-full resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
                />
                <p className="text-right text-[10px] text-muted-foreground">{description.length}/300</p>
              </div>

              {errMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <Icon name="x" size={14} />
                  {errMsg}
                </div>
              )}

              {status === 'success' && (
                <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-600">
                  <Icon name="check" size={14} />
                  Notice sent to all users successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              >
                {status === 'loading' ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Icon name="send" size={16} />
                    Broadcast to All Users
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </SiteShell>
    </AdminGuard>
  );
}
