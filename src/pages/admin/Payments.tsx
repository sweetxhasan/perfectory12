import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SiteShell } from '@/components/site-shell';
import { AdminGuard } from '@/components/admin-guard';
import { Icon } from '@/components/icon';
import { OverlayShell } from '@/components/overlay-shell';
import type { Timestamp } from 'firebase/firestore';
import { Link } from 'wouter';
import {
  subscribeAllPayments,
  subscribeConfiguredMethods,
  approvePayment,
  rejectPayment,
  type PaymentRequest,
  type PaymentStatus,
  type ConfiguredMethod,
} from '@/lib/payments';

/* ── Brand colors ───────────────────────────────────── */
const METHOD_COLORS: Record<string, string> = {
  bkash:  '#E2136E',
  nagad:  '#F7961C',
  rocket: '#7B2D8B',
};

const STATUS_CONFIG: Record<PaymentStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending:  { label: 'Pending',  bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  approved: { label: 'Approved', bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-400'   },
};

const CONFIG_COL = 'perfectory_config';

/* ── Firestore helpers ──────────────────────────────── */
interface StoredMethod { id: string; name: string; number: string; logoUrl?: string; }

const IMGBB_KEY = '3ee56b707e39804a444bf7dbb08599ee';

async function uploadToImgbb(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const fd = new FormData();
        fd.append('image', base64);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd });
        const json = await res.json();
        if (!json.success) reject(new Error(json.error?.message || 'Upload failed'));
        else resolve(json.data.url as string);
      } catch (e) { reject(e); }
    };
    reader.readAsDataURL(file);
  });
}

async function loadMethods(): Promise<StoredMethod[]> {
  try {
    const snap = await getDoc(doc(db, CONFIG_COL, 'payment_methods'));
    if (snap.exists()) {
      const data = snap.data() as { methods?: StoredMethod[] };
      return data.methods ?? [];
    }
  } catch { /* ignore */ }
  return [];
}

async function saveMethods(methods: StoredMethod[]): Promise<void> {
  await setDoc(doc(db, CONFIG_COL, 'payment_methods'), { methods });
}

/* ── Helpers ────────────────────────────────────────── */
function fmtDate(ts: unknown): string {
  const ms = (ts as Timestamp | null)?.toMillis?.();
  if (!ms) return '—';
  return new Date(ms).toLocaleString('en-BD', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function fmtPlan(plan: string) {
  return plan === 'monthly' ? 'Monthly Pro' : plan === 'yearly' ? 'Yearly Premium' : plan;
}

/* ── Status badge ───────────────────────────────────── */
function StatusBadge({ status }: { status: PaymentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ── Stat card ──────────────────────────────────────── */
function StatCard({ label, count, icon, color }: {
  label: string; count: number; icon: string; color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}18` }}>
        <Icon name={icon as never} size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-black text-foreground">{count}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/* ── Reject dialog ──────────────────────────────────── */
const QUICK_REASONS = [
  'Transaction ID not found',
  'Incorrect amount sent',
  'Wrong sender number',
  'Screenshot not matching',
  'Duplicate request',
  'Payment not received yet',
];

function RejectDialog({
  payment, onClose, onConfirm,
}: {
  payment: PaymentRequest;
  onClose: () => void;
  onConfirm: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  function pickQuick(reason: string) {
    setNote((prev) => {
      if (prev.includes(reason)) {
        // toggle off: remove this reason
        return prev
          .split(', ')
          .filter((r) => r.trim() !== reason)
          .join(', ')
          .trim();
      }
      return prev ? `${prev.trimEnd()}, ${reason}` : reason;
    });
  }

  async function submit(withNote: string) {
    setLoading(true);
    await onConfirm(withNote);
    setLoading(false);
  }

  const hasNote = note.trim().length > 0;

  return (
    <OverlayShell open={true} onClose={onClose} title="Reject Payment">
      <div className="p-5 space-y-4">

        {/* Header — user + payment summary */}
        <div className="overflow-hidden rounded-2xl border border-destructive/25 bg-destructive/5">
          {/* Top strip */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-destructive/15">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/15">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span className="absolute inset-0 rounded-full border-2 border-destructive/30 animate-ping" style={{ animationDuration: '1.8s' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground truncate">{payment.userName}</p>
              <p className="text-xs text-muted-foreground truncate">{payment.userEmail}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-base font-black text-destructive">৳{payment.amount.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{fmtPlan(payment.plan)}</p>
            </div>
          </div>
          {/* Payment detail row */}
          <div className="grid grid-cols-2 gap-x-4 px-4 py-2.5 text-xs">
            <div>
              <span className="text-muted-foreground">Method</span>
              <p className="font-semibold capitalize text-foreground">{payment.method}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Transaction ID</span>
              <p className="font-mono font-semibold text-foreground truncate">{payment.transactionId}</p>
            </div>
          </div>
        </div>

        {/* "Reason visible to user" callout — always shown */}
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/50 bg-amber-50 px-3.5 py-3">
          <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-bold">User will see your reason</span> in their notification. Choose a quick reason or write a custom note below. You can also skip without a reason.
          </p>
        </div>

        {/* Quick-reason chips */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Quick reasons <span className="normal-case font-normal text-muted-foreground/70">— tap to select</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((r) => {
              const active = note.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => pickQuick(r)}
                  className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
                    active
                      ? 'border-destructive/40 bg-destructive/10 text-destructive shadow-sm'
                      : 'border-border bg-card text-muted-foreground hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive'
                  }`}
                >
                  {active ? (
                    <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 shrink-0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 shrink-0 opacity-40" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="6" y1="2" x2="6" y2="10" /><line x1="2" y1="6" x2="10" y2="6" />
                    </svg>
                  )}
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom note textarea */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Custom note <span className="normal-case font-normal">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Write a specific reason for the user…"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none resize-none placeholder:text-muted-foreground/40 focus:border-destructive/50 focus:ring-2 focus:ring-destructive/15 transition"
          />
          {/* Live preview of what user will see */}
          {hasNote && (
            <div className="rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Preview — user's notification will say:
              </p>
              <p className="text-xs text-foreground leading-relaxed italic">
                "Your {fmtPlan(payment.plan)} payment was rejected: <span className="not-italic font-medium text-destructive">{note.trim()}</span>"
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-border bg-card py-3 text-sm font-medium hover:bg-muted transition"
          >
            Cancel
          </button>
          <button
            onClick={() => submit('')}
            disabled={loading}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground hover:border-destructive/30 hover:text-destructive hover:bg-destructive/5 transition disabled:opacity-40"
            title="Reject without sending a reason"
          >
            Skip reason
          </button>
          <button
            onClick={() => submit(note.trim())}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-destructive py-3 text-sm font-bold text-white shadow-[0_2px_12px_rgba(239,68,68,0.35)] hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Rejecting…
              </>
            ) : (
              <>
                <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
                </svg>
                {hasNote ? 'Reject & Notify' : 'Reject'}
              </>
            )}
          </button>
        </div>

      </div>
    </OverlayShell>
  );
}

/* ── Approve confirm dialog ─────────────────────────── */
function ApproveDialog({
  payment, onClose, onConfirm,
}: {
  payment: PaymentRequest;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  }

  return (
    <OverlayShell open={true} onClose={onClose} title="Approve Payment">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
            <Icon name="check" size={16} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{payment.userName}</p>
            <p className="text-xs text-muted-foreground">{fmtPlan(payment.plan)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2 text-sm">
          {[
            ['User',     payment.userName],
            ['Plan',     fmtPlan(payment.plan)],
            ['Amount',   `৳${payment.amount.toLocaleString()}`],
            ['Method',   payment.method],
            ['Sender #', payment.senderNumber],
            ['Tx ID',    payment.transactionId],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <span className="text-muted-foreground shrink-0">{label}</span>
              <span className="font-semibold font-mono text-xs text-right truncate max-w-[160px]">{value}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          This will immediately activate the <strong>{fmtPlan(payment.plan)}</strong> plan for this user.
        </p>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-2xl border border-border bg-card py-3 text-sm font-medium hover:bg-muted transition">
            Cancel
          </button>
          <button onClick={submit} disabled={loading}
            className="flex-1 rounded-2xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 active:scale-[0.98] transition disabled:opacity-50">
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Activating…
              </span>
            ) : 'Approve & Activate'}
          </button>
        </div>
      </div>
    </OverlayShell>
  );
}

/* ── Payment row card ───────────────────────────────── */
function PaymentRow({
  p, methods, onApprove, onReject,
}: {
  p: PaymentRequest;
  methods: ConfiguredMethod[];
  onApprove: () => void;
  onReject: () => void;
}) {
  const mc = METHOD_COLORS[p.method] ?? '#6366f1';
  // Find admin-configured method to get logo; fall back to colored badge
  const configuredMethod = methods.find((m) => m.id === p.method);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3 transition hover:shadow-md">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Method logo or colored pill */}
          {configuredMethod?.logoUrl ? (
            <img
              src={configuredMethod.logoUrl}
              alt={configuredMethod.name}
              className="h-11 w-11 shrink-0 rounded-xl object-cover border border-border shadow-sm"
            />
          ) : (
            <span
              className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl text-xs font-black text-white uppercase"
              style={{ background: mc }}
            >
              {p.method.slice(0, 2)}
            </span>
          )}
          <div className="min-w-0">
            {/* Name → clickable profile link if username available */}
            {p.username ? (
              <Link
                href={`/profile/${p.username}`}
                className="font-semibold text-foreground truncate text-sm hover:text-brand-2 hover:underline transition block"
              >
                {p.userName}
              </Link>
            ) : (
              <p className="font-semibold text-foreground truncate text-sm">{p.userName}</p>
            )}
            <p className="text-xs text-muted-foreground truncate">{p.userEmail}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={p.status} />
          <span className="text-lg font-black text-foreground">৳{p.amount.toLocaleString()}</span>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl bg-muted/40 px-3 py-2.5 text-xs">
        <div>
          <span className="text-muted-foreground">Plan</span>
          <p className="font-semibold text-foreground">{fmtPlan(p.plan)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Sender #</span>
          <p className="font-mono font-semibold text-foreground">{p.senderNumber}</p>
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground">Transaction ID</span>
          <p className="font-mono font-semibold text-foreground break-all">{p.transactionId}</p>
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground">Submitted</span>
          <p className="font-medium text-foreground">{fmtDate(p.createdAt)}</p>
        </div>
        {p.rejectionNote && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Rejection note</span>
            <p className="text-destructive font-medium">{p.rejectionNote}</p>
          </div>
        )}
      </div>

      {/* Actions — only for pending */}
      {p.status === 'pending' && (
        <div className="flex gap-2 pt-0.5">
          <button onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-green-600 py-2.5 text-xs font-bold text-white hover:bg-green-700 active:scale-[0.97] transition">
            <Icon name="check" size={13} />
            Approve
          </button>
          <button onClick={onReject}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/5 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/10 active:scale-[0.97] transition">
            <Icon name="x" size={13} />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Tab filter ─────────────────────────────────────── */
type FilterTab = 'all' | PaymentStatus;
const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'pending',  label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

/* ── Method form overlay (Add / Edit) ───────────────── */
interface MethodFormOverlayProps {
  initial?: StoredMethod;
  onSave: (m: StoredMethod) => Promise<void>;
  onClose: () => void;
}
function MethodFormOverlay({ initial, onSave, onClose }: MethodFormOverlayProps) {
  const isEdit = !!initial;
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    id:     initial?.id     ?? '',
    name:   initial?.name   ?? '',
    number: initial?.number ?? '',
    logoUrl: initial?.logoUrl ?? '',
  });
  const [logoPreview, setLogoPreview] = useState<string>(initial?.logoUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState('');

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr('');
    try {
      setLogoPreview(URL.createObjectURL(file));
      const url = await uploadToImgbb(file);
      setForm((f) => ({ ...f, logoUrl: url }));
      setLogoPreview(url);
    } catch {
      setErr('Logo upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    const id     = form.id.trim().toLowerCase().replace(/\s+/g, '-');
    const name   = form.name.trim();
    const number = form.number.trim();
    if (!id || !name || !number) { setErr('Please fill all fields.'); return; }
    setSaving(true);
    setErr('');
    try {
      await onSave({ id, name, number, logoUrl: form.logoUrl || undefined });
    } catch {
      setErr('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OverlayShell open={true} onClose={onClose} title={isEdit ? 'Edit Method' : 'Add Payment Method'}>
      <div className="p-5 space-y-4">
        {/* Logo upload */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider">Method Logo</label>
          <div className="flex items-center gap-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="relative flex h-[72px] w-[72px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-brand/40 bg-brand/5 hover:border-brand hover:bg-brand/10 transition group"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="logo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Icon name="image" size={22} className="text-brand/60 group-hover:text-brand transition" />
                  <span className="text-[9px] font-semibold text-brand/60 group-hover:text-brand transition">Upload</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                  <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                </div>
              )}
              {logoPreview && !uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition">
                  <Icon name="image" size={18} className="text-white" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand/5 px-3 py-2 text-xs font-semibold text-brand hover:bg-brand/10 active:scale-95 transition disabled:opacity-50"
              >
                <Icon name="upload" size={12} />
                {uploading ? 'Uploading…' : logoPreview ? 'Change Logo' : 'Upload Logo'}
              </button>
              <p className="text-[10px] text-muted-foreground">PNG, JPG · Max 5 MB · Recommended 128×128</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider">Method Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. bKash, Nagad, Rocket"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider">Account Number</label>
          <input
            value={form.number}
            onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
            placeholder="e.g. 01XXXXXXXXX"
            type="tel"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition placeholder:text-muted-foreground/50"
          />
        </div>

        {/* ID */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider">Method ID <span className="normal-case text-muted-foreground font-normal">(unique key)</span></label>
          <input
            value={form.id}
            onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
            placeholder="e.g. bkash"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition placeholder:text-muted-foreground/50"
          />
          <p className="text-[10px] text-muted-foreground">Lowercase, no spaces. Used as a unique identifier.</p>
        </div>

        {/* Error */}
        {err && (
          <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-3.5 py-3">
            <Icon name="info" size={14} className="text-destructive shrink-0" />
            <p className="text-xs text-destructive">{err}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 rounded-2xl border border-border bg-card py-3 text-sm font-semibold hover:bg-muted active:scale-[0.98] transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading || !form.name.trim() || !form.number.trim() || !form.id.trim()}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-brand-2 py-3 text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />{isEdit ? 'Saving…' : 'Creating…'}</>
            ) : (
              <><Icon name={isEdit ? 'check' : 'plus'} size={15} />{isEdit ? 'Save Changes' : 'Create Method'}</>
            )}
          </button>
        </div>
      </div>
    </OverlayShell>
  );
}

/* ── Delete confirmation overlay ─────────────────────── */
function DeleteMethodOverlay({ method, onConfirm, onClose }: {
  method: StoredMethod;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  async function confirm() {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  }
  return (
    <OverlayShell open={true} onClose={onClose} title="Delete Method">
      <div className="p-5 space-y-5">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </div>
          <div>
            <p className="text-base font-bold text-foreground">
              Remove <span className="text-destructive">{method.name}</span>?
            </p>
            <p className="text-sm text-muted-foreground mt-1">Users won't see this method anymore. This cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-2xl border border-border bg-card py-3 text-sm font-semibold hover:bg-muted active:scale-[0.98] transition">
            Keep It
          </button>
          <button onClick={confirm} disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-destructive py-3 text-sm font-bold text-white hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50">
            {deleting ? (
              <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Deleting…</>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </OverlayShell>
  );
}

/* ── Method management section ──────────────────────── */
function MethodManager() {
  const [methods,       setMethods]       = useState<StoredMethod[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [showAdd,       setShowAdd]       = useState(false);
  const [editTarget,    setEditTarget]    = useState<{ method: StoredMethod; idx: number } | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<{ method: StoredMethod; idx: number } | null>(null);

  function showToastMsg(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  }

  useEffect(() => {
    loadMethods().then((m) => { setMethods(m); setLoading(false); });
  }, []);

  async function handleSave(m: StoredMethod) {
    const updated = [...methods, m];
    await saveMethods(updated);
    setMethods(updated);
    setShowAdd(false);
    showToastMsg(`✓ ${m.name} added`);
  }

  async function handleEdit(m: StoredMethod) {
    if (!editTarget) return;
    const updated = [...methods];
    updated[editTarget.idx] = m;
    await saveMethods(updated);
    setMethods(updated);
    setEditTarget(null);
    showToastMsg(`✓ ${m.name} updated`);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const updated = methods.filter((_, i) => i !== deleteTarget.idx);
    await saveMethods(updated);
    setMethods(updated);
    setDeleteTarget(null);
    showToastMsg(`${deleteTarget.method.name} removed`);
  }

  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-brand/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-2 shadow-sm">
            <Icon name="credit-card" size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-foreground">Payment Methods</p>
            <p className="text-[11px] text-muted-foreground">
              {loading ? '…' : `${methods.length} method${methods.length !== 1 ? 's' : ''} configured`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand to-brand-2 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:opacity-90 active:scale-[0.97] transition"
        >
          <Icon name="plus" size={13} />
          Add Method
        </button>
      </div>

      {/* List */}
      <div className="p-4 space-y-2.5">
        {loading ? (
          <div className="space-y-2.5">
            {[0, 1].map((i) => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : methods.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
              <Icon name="credit-card" size={22} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">No methods yet</p>
            <p className="text-xs text-muted-foreground">Click "Add Method" to create the first payment option.</p>
          </div>
        ) : (
          methods.map((m, i) => {
            const fallbackColor = METHOD_COLORS[m.id] ?? '#6366f1';
            return (
              <div key={`${m.id}-${i}`}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 transition hover:border-brand/30 hover:shadow-sm">
                {/* Logo */}
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border shadow-sm">
                  {m.logoUrl ? (
                    <img src={m.logoUrl} alt={m.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-black text-white"
                      style={{ background: fallbackColor }}>
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{m.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{m.number}</p>
                </div>

                {/* ID chip */}
                <span className="hidden sm:inline-flex rounded-lg bg-muted px-2 py-1 text-[10px] font-mono font-semibold text-muted-foreground">
                  {m.id}
                </span>

                {/* Actions — always visible */}
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setEditTarget({ method: m, idx: i })}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-brand hover:border-brand/40 active:scale-95 transition"
                    title="Edit">
                    <Icon name="pencil" size={13} />
                  </button>
                  <button onClick={() => setDeleteTarget({ method: m, idx: i })}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive/40 active:scale-95 transition"
                    title="Delete">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Overlays */}
      {showAdd && (
        <MethodFormOverlay
          onSave={handleSave}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editTarget && (
        <MethodFormOverlay
          initial={editTarget.method}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteMethodOverlay
          method={deleteTarget.method}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 ${toast.ok ? 'bg-green-600' : 'bg-destructive'}`}>
          <Icon name={toast.ok ? 'check' : 'x'} size={15} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────── */
export default function AdminPayments() {
  return (
    <AdminGuard>
      <SiteShell>
        <PaymentsContent />
      </SiteShell>
    </AdminGuard>
  );
}

function PaymentsContent() {
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [configuredMethods, setConfiguredMethods] = useState<ConfiguredMethod[]>([]);
  const [tab, setTab] = useState<FilterTab>('pending');
  const [approvingPayment, setApprovingPayment] = useState<PaymentRequest | null>(null);
  const [rejectingPayment, setRejectingPayment] = useState<PaymentRequest | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    const unsub = subscribeAllPayments((rows) => {
      setPayments(rows);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Live-sync admin-configured payment methods for logo display
  useEffect(() => {
    const unsub = subscribeConfiguredMethods((methods) => {
      setConfiguredMethods(methods ?? []);
    });
    return unsub;
  }, []);

  const pending  = payments.filter((p) => p.status === 'pending');
  const approved = payments.filter((p) => p.status === 'approved');
  const rejected = payments.filter((p) => p.status === 'rejected');

  const filtered = tab === 'all'      ? payments
                 : tab === 'pending'  ? pending
                 : tab === 'approved' ? approved
                 : rejected;

  const tabCount: Record<FilterTab, number> = {
    all: payments.length, pending: pending.length,
    approved: approved.length, rejected: rejected.length,
  };

  async function handleApprove(p: PaymentRequest) {
    try {
      await approvePayment(p);
      setApprovingPayment(null);
      showToast(`✓ ${p.userName}'s ${p.plan} plan activated`);
    } catch {
      showToast('Failed to approve. Try again.', false);
    }
  }

  async function handleReject(p: PaymentRequest, note: string) {
    try {
      await rejectPayment(p, note);
      setRejectingPayment(null);
      showToast(`Rejected ${p.userName}'s request`);
    } catch {
      showToast('Failed to reject. Try again.', false);
    }
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">Payments</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review and approve user payment requests
        </p>
      </div>

      {/* Payment method management */}
      <MethodManager />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total"    count={payments.length} icon="credit-card" color="#6366f1" />
        <StatCard label="Pending"  count={pending.length}  icon="clock"       color="#f59e0b" />
        <StatCard label="Approved" count={approved.length} icon="check"       color="#22c55e" />
        <StatCard label="Rejected" count={rejected.length} icon="x"           color="#ef4444" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 rounded-2xl border border-border bg-muted/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
              tab === t.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {tabCount[t.id] > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                tab === t.id
                  ? t.id === 'pending' ? 'bg-amber-100 text-amber-700'
                  : t.id === 'approved' ? 'bg-green-100 text-green-700'
                  : t.id === 'rejected' ? 'bg-red-100 text-red-700'
                  : 'bg-brand/10 text-brand'
                  : 'bg-border text-muted-foreground'
              }`}>
                {tabCount[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Icon name="credit-card" size={24} className="text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No {tab === 'all' ? '' : tab} payments</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            {tab === 'pending'
              ? 'No pending payment requests right now.'
              : `No ${tab} payments to show.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <PaymentRow
              key={p.id}
              p={p}
              methods={configuredMethods}
              onApprove={() => setApprovingPayment(p)}
              onReject={() => setRejectingPayment(p)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {approvingPayment && (
        <ApproveDialog
          payment={approvingPayment}
          onClose={() => setApprovingPayment(null)}
          onConfirm={() => handleApprove(approvingPayment)}
        />
      )}
      {rejectingPayment && (
        <RejectDialog
          payment={rejectingPayment}
          onClose={() => setRejectingPayment(null)}
          onConfirm={(note) => handleReject(rejectingPayment, note)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 ${
          toast.ok ? 'bg-green-600' : 'bg-destructive'
        }`}>
          <Icon name={toast.ok ? 'check' : 'x'} size={15} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
