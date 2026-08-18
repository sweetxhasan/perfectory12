import { useEffect, useRef, useState, useCallback, type CSSProperties, type ChangeEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { SiteShell } from '@/components/site-shell';
import { AdminGuard } from '@/components/admin-guard';
import { Icon } from '@/components/icon';
import { VerifiedBadge } from '@/components/verified-badge';
import { useAuth } from '@/lib/auth-context';
import { isMainAdmin } from '@/lib/admin';
import { notifyUserNotice } from '@/lib/notifications';
import {
  getProfileByUsername,
  adminSetAdmin,
  adminSetDisabled,
  adminSetPlan,
  adminAddCredits,
  adminSetCredits,
  adminUpdateProfile,
  adminDeleteUserData,
  isUsernameAvailable,
  getProfile,
  subscribeUserProfile,
  type UserProfile,
  type PlanId,
} from '@/lib/user-store';

/* ── Send Notice Overlay ────────────────────────────── */
function SendNoticeOverlay({ targetName, targetUid, onClose }: { targetName: string; targetUid: string; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSend() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    try {
      await notifyUserNotice(targetUid, title.trim(), body.trim());
      setDone(true);
      setTimeout(onClose, 1200);
    } catch {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--card, #1a1a2e)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Gradient top accent */}
        <div style={{ height: 4, background: 'linear-gradient(-45deg,#ec5252,#6e1a52)' }} />

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Bell icon */}
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg"
                style={{ background: 'linear-gradient(-45deg,#ec5252,#6e1a52)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  <circle cx="12" cy="3" r="1" fill="white" stroke="none"/>
                </svg>
              </div>
              <div>
                <h2
                  className="text-base font-bold leading-tight"
                  style={{ background: 'linear-gradient(-45deg,#ec5252,#6e1a52)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                >
                  Send Notice
                </h2>
                <p className="text-xs text-muted-foreground">to {targetName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div
              className="rounded-2xl px-4 py-3 transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: '#ec5252' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
                Notice Title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={60}
                placeholder="e.g. Important update from Admin"
                className="w-full bg-transparent text-sm outline-none placeholder:opacity-30"
              />
            </div>

            <div
              className="rounded-2xl px-4 py-3 transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: '#ec5252' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Notice Text
              </label>
              <textarea
                rows={4}
                value={body}
                onChange={e => setBody(e.target.value)}
                maxLength={400}
                placeholder="Write your notice here…"
                className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:opacity-30"
              />
              <p className="mt-1 text-right text-xs tabular-nums opacity-40">{body.length}/400</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl py-2.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || done || !title.trim() || !body.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(-45deg,#ec5252,#6e1a52)', boxShadow: '0 4px 18px rgba(236,82,82,0.35)' }}
            >
              {done ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Sent!
                </>
              ) : sending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  Send Notice
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Shimmer helper ─────────────────────────────────── */
const Sk = ({ className = '', style }: { className?: string; style?: CSSProperties }) => (
  <div className={`animate-shimmer rounded-2xl ${className}`} style={style} />
);

/* ── Camera icon ────────────────────────────────────── */
function CameraIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}

/* ── ImgBB upload ────────────────────────────────────── */
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

/* ── Photo overlay ──────────────────────────────────── */
function PhotoOverlay({ current, onUpdate, onClose }: { current: string; onUpdate: (url: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState<'upload' | 'link'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(current);
  const [linkVal, setLinkVal] = useState('');
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<'idle' | 'reading' | 'sending' | 'done'>('idle');
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function accept(f: File) { setFile(f); setPreview(URL.createObjectURL(f)); setErr(''); }
  function onDrop(e: React.DragEvent) { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) accept(f); }

  async function handleUpdate() {
    setErr('');
    if (tab === 'upload') {
      if (!file) { setErr('Please select an image first.'); return; }
      setUploading(true); setStep('reading');
      try {
        setTimeout(() => setStep('sending'), 600);
        const url = await uploadToImgbb(file);
        setStep('done');
        setTimeout(() => { onUpdate(url); onClose(); }, 500);
      } catch (e: unknown) {
        setErr((e instanceof Error ? e.message : 'Upload failed') + ' — try again.');
        setUploading(false); setStep('idle');
      }
    } else {
      try { const u = new URL(linkVal); if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error(); }
      catch { setErr('Enter a valid image URL (https://…).'); return; }
      onUpdate(linkVal); onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-lg" onClick={!uploading ? onClose : undefined} />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-[2rem] border border-border bg-background shadow-[0_32px_64px_rgba(0,0,0,0.25)] float-up">
        <div className="h-1 w-full bg-gradient-brand" />
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-md"><CameraIcon /></span>
            <div><h3 className="text-sm font-semibold leading-none">Update Profile Photo</h3><p className="mt-0.5 text-xs text-muted-foreground">PNG, JPG, WEBP · max 10 MB</p></div>
          </div>
          {!uploading && <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-destructive hover:text-destructive"><Icon name="x" size={14} /></button>}
        </div>
        <div className="px-5 pb-5 space-y-4">
          <div className="flex justify-center">
            <div className={`relative rounded-full p-1 transition-all duration-500 ${uploading ? 'ring-4 ring-brand/40 ring-offset-2 ring-offset-background' : ''}`}>
              {preview ? <img src={preview} alt="Preview" className={`h-24 w-24 rounded-full object-cover shadow-xl transition-all duration-500 ${uploading ? 'opacity-60 scale-95' : ''}`} crossOrigin="anonymous" onError={() => setPreview('')} />
                : <span className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-soft text-brand shadow-xl"><Icon name="user" size={36} /></span>}
              {uploading && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70 backdrop-blur-sm">
                {step === 'done' ? <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white shadow-lg"><Icon name="check" size={20} /></span>
                  : <svg className="h-10 w-10 animate-spin text-brand" viewBox="0 0 50 50" fill="none"><circle cx="25" cy="25" r="20" stroke="currentColor" strokeOpacity=".15" strokeWidth="5"/><path d="M25 5a20 20 0 0 1 20 20" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/></svg>}
              </span>}
            </div>
          </div>
          {uploading && <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">{{ idle: '', reading: 'Reading file…', sending: 'Uploading…', done: 'Done! ✓' }[step]}</span><span className="text-brand">{{ idle: '0%', reading: '20%', sending: '60%', done: '100%' }[step]}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full bg-gradient-brand transition-all duration-700 ${{ idle: 'w-0', reading: 'w-1/5', sending: 'w-3/5', done: 'w-full' }[step]}`} /></div>
          </div>}
          {!uploading && <>
            <div className="flex rounded-2xl border border-border bg-secondary p-1">
              {(['upload', 'link'] as const).map(t => (
                <button key={t} type="button" onClick={() => { setTab(t); setErr(''); }} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold uppercase tracking-wide transition ${tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t === 'upload' ? <><Icon name="upload" size={12} /> Upload</> : <><Icon name="link" size={12} /> Link</>}
                </button>
              ))}
            </div>
            {tab === 'upload' ? (
              <><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) accept(f); }} />
                <button type="button" onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
                  className={`group w-full overflow-hidden rounded-2xl border-2 border-dashed py-7 transition-all ${drag ? 'border-brand bg-brand/8 scale-[1.01]' : file ? 'border-green-400/60 bg-green-50/30' : 'border-border bg-secondary/40 hover:border-brand hover:bg-brand/5'}`}>
                  <div className="flex flex-col items-center gap-2.5">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${drag ? 'bg-brand text-primary-foreground scale-110' : file ? 'bg-green-500/10 text-green-500' : 'bg-gradient-soft text-brand group-hover:scale-110'}`}><Icon name={file ? 'check' : 'upload'} size={22} /></span>
                    <div className="text-center"><p className="text-sm font-medium">{drag ? 'Drop it here!' : file ? file.name : 'Click or drag & drop'}</p><p className="mt-0.5 text-xs text-muted-foreground">{file ? `${(file.size / 1024).toFixed(0)} KB` : 'PNG, JPG, WEBP'}</p></div>
                  </div>
                </button></>
            ) : (
              <div className="relative"><Icon name="link" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="url" placeholder="https://example.com/photo.jpg" value={linkVal} onChange={e => { setLinkVal(e.target.value); if (e.target.value.startsWith('http')) setPreview(e.target.value); setErr(''); }} className="w-full rounded-2xl border border-border bg-secondary py-3 pl-9 pr-4 text-sm outline-none focus:border-brand transition" /></div>
            )}
          </>}
          {err && <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/8 px-3 py-2.5"><Icon name="x" size={13} className="mt-0.5 shrink-0 text-destructive" /><p className="text-xs text-destructive">{err}</p></div>}
          {!uploading && <button type="button" onClick={handleUpdate} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-3 text-sm font-medium text-primary-foreground shadow-[0_2px_14px_rgba(99,102,241,0.4)] transition hover:opacity-90 active:scale-[0.98]"><Icon name="check" size={16} />Update Photo</button>}
        </div>
      </div>
    </div>
  );
}

/* ── Section card wrapper ────────────────────────────── */
function SectionCard({ title, icon, badge, children }: { title: string; icon: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-soft text-brand">
          <Icon name={icon as never} size={16} />
        </span>
        <h2 className="flex-1 text-sm font-semibold">{title}</h2>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ── Toast ──────────────────────────────────────────── */
function Toast({ message, type, onDone }: { message: string; type: 'success' | 'error'; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border px-4 py-3 shadow-xl float-up text-sm font-medium ${type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-600' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}>
      <Icon name={type === 'success' ? 'check' : 'x'} size={15} />
      {message}
    </div>
  );
}

/* ── Confirm overlay ─────────────────────────────────── */
function ConfirmOverlay({ title, body, confirmLabel, confirmClass, onConfirm, onCancel, requireTyping }: {
  title: string; body: string; confirmLabel: string; confirmClass: string;
  onConfirm: () => void; onCancel: () => void; requireTyping?: string;
}) {
  const [typed, setTyped] = useState('');
  const canConfirm = requireTyping ? typed === requireTyping : true;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-lg" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-[2rem] border border-border bg-background shadow-[0_32px_64px_rgba(0,0,0,0.25)] float-up">
        <div className="h-1 w-full bg-gradient-brand" />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <Icon name="info" size={22} />
            </span>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          </div>
          {requireTyping && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-muted-foreground">Type <span className="font-mono font-semibold text-foreground">{requireTyping}</span> to confirm:</p>
              <input autoFocus value={typed} onChange={e => setTyped(e.target.value)} placeholder={requireTyping}
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-destructive transition font-mono" />
            </div>
          )}
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={onCancel} className="flex-1 rounded-2xl border border-border bg-secondary py-2.5 text-sm font-medium transition hover:bg-secondary/80">Cancel</button>
            <button type="button" onClick={onConfirm} disabled={!canConfirm} className={`flex-1 rounded-2xl py-2.5 text-sm font-medium text-white transition disabled:opacity-40 ${confirmClass}`}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Plan button ─────────────────────────────────────── */
const planMeta: Record<PlanId, { label: string; sub: string; icon: string; color: string }> = {
  free:    { label: 'Free',        sub: '0 cr/day',  icon: 'star',  color: 'border-border text-muted-foreground' },
  monthly: { label: 'Monthly Pro', sub: '5 cr/day',  icon: 'crown', color: 'border-brand/50 text-brand' },
  yearly:  { label: 'Yearly Pro',  sub: '15 cr/day', icon: 'crown', color: 'border-brand-2/50 text-brand-2' },
};

/* ══ Main content ════════════════════════════════════════════════════════════ */
function AdminEditProfileContent({ username }: { username: string }) {
  const { profile: myProfile } = useAuth();
  const [, setLocation] = useLocation();

  const [target, setTarget] = useState<UserProfile | null>(null);
  const [pageStatus, setPageStatus] = useState<'loading' | 'ready' | 'notfound'>('loading');
  const [showPhoto, setShowPhoto] = useState(false);

  /* Toast */
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  function showToast(message: string, type: 'success' | 'error' = 'success') { setToast({ message, type }); }

  /* Profile form */
  const [form, setForm] = useState({ name: '', username: '', bio: '', location: '', website: '', photoURL: '', phone: '', phonePublic: true });
  const [saving, setSaving] = useState(false);
  const [usnStatus, setUsnStatus] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'short'>('idle');
  const usnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Plan */
  const [planSaving, setPlanSaving] = useState(false);

  /* Admin toggle */
  const [adminSaving, setAdminSaving] = useState(false);

  /* Credits */
  const [creditInput, setCreditInput] = useState('');
  const [creditSaving, setCreditSaving] = useState(false);
  const [creditRefreshing, setCreditRefreshing] = useState(false);

  /* Overlays */
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [showEnableConfirm, setShowEnableConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNoticeOverlay, setShowNoticeOverlay] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);

  /* Derived flags */
  const iAmMainAdmin = isMainAdmin(myProfile?.email);
  const targetIsMainAdmin = isMainAdmin(target?.email);
  const targetIsDisabled = target?.isDisabled === true;
  const targetIsAdmin = target?.isAdmin === true;

  /* Load target */
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    setPageStatus('loading');
    getProfileByUsername(username)
      .then(p => {
        if (!p) { setPageStatus('notfound'); return; }
        setTarget(p);
        setForm({ name: p.name || '', username: p.username || '', bio: p.bio || '', location: p.location || '', website: p.website || '', photoURL: p.photoURL || '', phone: p.phone?.startsWith('+880') ? p.phone.slice(4) : (p.phone || ''), phonePublic: p.phonePublic ?? true });
        setPageStatus('ready');
        // Keep the admin view live while another admin or the user changes
        // plan, credits, status, or profile fields.
        unsubscribe = subscribeUserProfile(p.uid, (next) => {
          if (!next) {
            setTarget(null);
            setPageStatus('notfound');
            return;
          }
          setTarget(next);
        });
      })
      .catch(() => setPageStatus('notfound'));
    return () => unsubscribe?.();
  }, [username]);

  /* Username live check */
  const checkUsername = useCallback((val: string) => {
    if (usnTimer.current) clearTimeout(usnTimer.current);
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setForm(f => ({ ...f, username: clean }));
    if (!target) return;
    if (clean === target.username) { setUsnStatus('idle'); return; }
    if (clean.length < 3) { setUsnStatus('short'); return; }
    setUsnStatus('checking');
    usnTimer.current = setTimeout(async () => {
      const ok = await isUsernameAvailable(clean, target.uid);
      setUsnStatus(ok ? 'ok' : 'taken');
    }, 500);
  }, [target]);

  /* Save profile */
  async function saveProfile() {
    if (!target || usnStatus === 'taken' || usnStatus === 'short') return;
    setSaving(true);
    try {
      await adminUpdateProfile(target.uid, {
        name: form.name,
        username: form.username,
        bio: form.bio,
        location: form.location,
        website: form.website,
        photoURL: form.photoURL,
        phone: form.phone.replace(/\D/g, '') ? `+880${form.phone.replace(/\D/g, '')}` : '',
        phonePublic: form.phonePublic,
      });
      setTarget(t => t ? { ...t, name: form.name, username: form.username, bio: form.bio, location: form.location, website: form.website, photoURL: form.photoURL, phone: form.phone.replace(/\D/g, '') ? `+880${form.phone.replace(/\D/g, '')}` : '', phonePublic: form.phonePublic } : t);
      showToast('Profile updated successfully');
    } catch { showToast('Failed to update profile', 'error'); }
    finally { setSaving(false); }
  }

  /* Change plan */
  async function changePlan(planId: PlanId) {
    if (!target || planSaving) return;
    setPlanSaving(true);
    try {
      await adminSetPlan(target.uid, planId);
      setTarget(t => t ? { ...t, plan: planId } : t);
      showToast(`Plan changed to ${planMeta[planId].label}`);
    } catch { showToast('Failed to change plan', 'error'); }
    finally { setPlanSaving(false); }
  }

  /* Toggle admin */
  async function toggleAdmin(value: boolean) {
    if (!target || adminSaving || !iAmMainAdmin || targetIsMainAdmin) return;
    setAdminSaving(true);
    try {
      await adminSetAdmin(target.uid, value);
      setTarget(t => t ? { ...t, isAdmin: value } : t);
      showToast(value ? 'Admin access granted' : 'Admin access revoked');
    } catch { showToast('Failed to update admin status', 'error'); }
    finally { setAdminSaving(false); }
  }

  /* Add credits */
  async function addCredits() {
    const amount = parseInt(creditInput, 10);
    if (!target || isNaN(amount) || amount === 0) return;
    setCreditSaving(true);
    try {
      await adminAddCredits(target.uid, amount);
      setTarget(t => t ? { ...t, credits: t.credits + amount } : t);
      setCreditInput('');
      showToast(`${amount > 0 ? '+' : ''}${amount} credits applied`);
    } catch { showToast('Failed to update credits', 'error'); }
    finally { setCreditSaving(false); }
  }

  /* Refresh credits */
  async function refreshCredits() {
    if (!target) return;
    setCreditRefreshing(true);
    try {
      const fresh = await getProfile(target.uid);
      if (fresh) setTarget(t => t ? { ...t, credits: fresh.credits } : t);
    } catch {}
    finally { setCreditRefreshing(false); }
  }

  /* Disable / enable */
  async function toggleDisabled(disable: boolean) {
    if (!target) return;
    setActionSaving(true);
    try {
      await adminSetDisabled(target.uid, disable);
      setTarget(t => t ? { ...t, isDisabled: disable } : t);
      showToast(disable ? 'Account disabled' : 'Account re-enabled');
    } catch { showToast('Action failed', 'error'); }
    finally { setActionSaving(false); setShowDisableConfirm(false); setShowEnableConfirm(false); }
  }

  /* Delete account */
  async function deleteAccount() {
    if (!target) return;
    setActionSaving(true);
    try {
      await adminDeleteUserData(target.uid);
      showToast('Account deleted');
      setTimeout(() => setLocation('/admin/users'), 1200);
    } catch { showToast('Deletion failed', 'error'); setActionSaving(false); setShowDeleteConfirm(false); }
  }

  /* ── Loading skeleton ── */
  if (pageStatus === 'loading') return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3"><Sk className="h-9 w-9 rounded-xl" /><div className="space-y-2"><Sk className="h-5 w-40 rounded-full" /><Sk className="h-3.5 w-24 rounded-full" /></div></div>
      {[240, 180, 140, 160, 220].map((h, i) => <Sk key={i} className="w-full rounded-3xl" style={{ height: h }} />)}
    </div>
  );

  /* ── Not found ── */
  if (pageStatus === 'notfound' || !target) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-soft text-brand"><Icon name="user" size={34} /></span>
        <div><h1 className="text-2xl">User not found</h1><p className="mt-1 text-sm text-muted-foreground">No user with username @{username}</p></div>
        <Link href="/admin/users" className="rounded-xl border border-border bg-card px-4 py-2 text-sm transition hover:border-brand-2 hover:text-brand-2">← Back to Users</Link>
      </div>
    </div>
  );

  const usnHint = { idle: null, short: { text: 'Min 3 characters', color: 'text-muted-foreground' }, checking: { text: 'Checking…', color: 'text-muted-foreground' }, ok: { text: '✓ Available', color: 'text-green-500' }, taken: { text: '✗ Already taken', color: 'text-destructive' } };

  return (
    <>
      {/* Overlays */}
      {showPhoto && <PhotoOverlay current={form.photoURL} onUpdate={url => { setForm(f => ({ ...f, photoURL: url })); }} onClose={() => setShowPhoto(false)} />}
      {showDisableConfirm && <ConfirmOverlay title="Disable Account?" body={`@${target.username}'s account will be suspended. They will lose access to the entire site.`} confirmLabel="Yes, Disable" confirmClass="bg-orange-500 hover:bg-orange-600" onConfirm={() => toggleDisabled(true)} onCancel={() => setShowDisableConfirm(false)} />}
      {showEnableConfirm && <ConfirmOverlay title="Re-enable Account?" body={`@${target.username}'s account will be restored. They will regain full access.`} confirmLabel="Yes, Enable" confirmClass="bg-green-600 hover:bg-green-700" onConfirm={() => toggleDisabled(false)} onCancel={() => setShowEnableConfirm(false)} />}
      {showDeleteConfirm && <ConfirmOverlay title="Delete Account?" body={`This will permanently delete @${target.username}'s profile, all voice generations, and all data. This cannot be undone.`} confirmLabel={actionSaving ? 'Deleting…' : 'Delete Forever'} confirmClass="bg-destructive hover:bg-destructive/90" onConfirm={deleteAccount} onCancel={() => setShowDeleteConfirm(false)} requireTyping={target.username} />}
      {showNoticeOverlay && <SendNoticeOverlay targetName={target.name || target.username} targetUid={target.uid} onClose={() => setShowNoticeOverlay(false)} />}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      <div className="mx-auto max-w-2xl space-y-4">

        {/* ── Page header ── */}
        <div className="flex items-center gap-3">
          <Link href={`/profile/${target.username}`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-brand-2 hover:text-brand-2">
            <Icon name="arrow-left" size={17} />
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {target.photoURL
              ? <img src={target.photoURL} alt={target.name} crossOrigin="anonymous" className="h-10 w-10 rounded-full object-cover ring-2 ring-border" />
              : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-sm font-semibold text-primary-foreground">{target.name?.charAt(0)}</span>}
            <div className="min-w-0">
              <h1 className="flex items-center gap-1.5 truncate text-base font-semibold">
                {target.name}
                {targetIsMainAdmin && <VerifiedBadge size={14} />}
              </h1>
              <p className="text-xs text-muted-foreground">@{target.username}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {targetIsMainAdmin && <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">Main Admin</span>}
            {targetIsAdmin && !targetIsMainAdmin && <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-500">Admin</span>}
            {targetIsDisabled && <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">Disabled</span>}
            {/* Send Notice button */}
            <button
              type="button"
              onClick={() => setShowNoticeOverlay(true)}
              title="Send Notice"
              className="group relative flex items-center gap-1.5 overflow-hidden rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
              style={{ background: 'linear-gradient(-45deg,#ec5252,#6e1a52)', boxShadow: '0 3px 14px rgba(236,82,82,0.4)' }}
            >
              {/* shimmer sweep */}
              <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              Send Notice
            </button>
          </div>
        </div>

        {/* ── Profile info ── */}
        <SectionCard title="Profile Info" icon="user">
          <div className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {form.photoURL
                  ? <img src={form.photoURL} alt="Avatar" crossOrigin="anonymous" className="h-20 w-20 rounded-full border-2 border-border object-cover shadow-lg" />
                  : <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-border bg-gradient-brand text-2xl font-semibold text-primary-foreground shadow-lg">{form.name.charAt(0).toUpperCase() || 'U'}</span>}
                <button type="button" onClick={() => setShowPhoto(true)} className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-gradient-brand text-primary-foreground shadow transition hover:scale-110 active:scale-95"><CameraIcon /></button>
              </div>
              <div>
                <p className="text-sm font-medium">Profile Photo</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Click the camera to update</p>
              </div>
            </div>

            {/* Grid fields */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Name */}
              <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 transition focus-within:border-brand">
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon name="user" size={11} /> Full Name</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={30} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" placeholder="Display name" />
              </div>

              {/* Username */}
              <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 transition focus-within:border-brand">
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon name="link" size={11} /> Username</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground">@</span>
                  <input type="text" value={form.username} onChange={e => checkUsername(e.target.value)} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" placeholder="username" />
                  {usnStatus === 'checking' && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />}
                  {usnStatus === 'ok' && <Icon name="check" size={13} className="shrink-0 text-green-500" />}
                  {usnStatus === 'taken' && <Icon name="x" size={13} className="shrink-0 text-destructive" />}
                </div>
                {usnHint[usnStatus] && <p className={`mt-1 text-xs ${usnHint[usnStatus]!.color}`}>{usnHint[usnStatus]!.text}</p>}
              </div>

              {/* Location */}
              <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 transition focus-within:border-brand">
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon name="globe" size={11} /> Location</label>
                <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" placeholder="Dhaka, Bangladesh" />
              </div>

              {/* Website */}
              <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 transition focus-within:border-brand">
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon name="link" size={11} /> Website</label>
                <input type="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" placeholder="https://…" />
              </div>

              {/* Phone number — full width */}
              <div className="col-span-full rounded-2xl border border-border bg-secondary/40 px-4 py-3 transition focus-within:border-brand">
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon name="phone" size={11} /> Phone Number</label>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 select-none text-sm font-semibold text-muted-foreground">+880</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setForm(f => ({ ...f, phone: digits }));
                    }}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    placeholder="01XXXXXXXX"
                  />
                  {form.phone.length > 0 && (
                    <span className={`shrink-0 text-xs tabular-nums ${form.phone.length === 10 ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {form.phone.length}/10
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-border/50 pt-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Show on public profile</span>
                    {form.phonePublic
                      ? <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-600">Public</span>
                      : <span className="rounded-full bg-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Private</span>}
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.phonePublic}
                    onClick={() => setForm(f => ({ ...f, phonePublic: !f.phonePublic }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors
                      ${form.phonePublic ? 'bg-green-500' : 'bg-border'}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform
                      ${form.phonePublic ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 transition focus-within:border-brand">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon name="pencil" size={11} /> Bio</label>
              <textarea rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} maxLength={200} className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50" placeholder="Tell people about this user…" />
              <p className={`mt-1 text-right text-xs tabular-nums ${form.bio.length >= 185 ? 'text-destructive' : 'text-muted-foreground'}`}>{form.bio.length}/200</p>
            </div>

            <button type="button" onClick={saveProfile} disabled={saving || usnStatus === 'taken' || usnStatus === 'short'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-3 text-sm font-medium text-primary-foreground shadow-[0_2px_14px_rgba(236,82,82,0.35)] transition hover:opacity-90 disabled:opacity-60 active:scale-[0.98]">
              {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Icon name="check" size={16} />}
              Save Profile Changes
            </button>
          </div>
        </SectionCard>

        {/* ── Subscription Plan ── */}
        <SectionCard title="Subscription Plan" icon="crown"
          badge={planSaving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand" /> : undefined}>
          <div className="grid grid-cols-3 gap-3">
            {(Object.entries(planMeta) as [PlanId, typeof planMeta[PlanId]][]).map(([id, meta]) => {
              const active = target.plan === id;
              return (
                <button key={id} type="button" disabled={planSaving} onClick={() => changePlan(id)}
                  className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 ${active ? `${meta.color} bg-gradient-soft shadow-sm ring-1 ring-inset ring-current/20` : 'border-border bg-secondary/40 text-muted-foreground hover:border-brand/40'}`}>
                  {active && <span className="absolute -top-2 right-3 rounded-full bg-gradient-brand px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">Active</span>}
                  <Icon name={meta.icon as never} size={20} className={active ? '' : 'text-muted-foreground'} />
                  <div>
                    <p className="text-xs font-semibold leading-tight">{meta.label}</p>
                    <p className={`mt-0.5 text-[10px] ${active ? 'opacity-70' : 'text-muted-foreground'}`}>{meta.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* ── Admin Access ── */}
        <SectionCard title="Admin Access" icon="shield"
          badge={targetIsMainAdmin ? <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-xs text-brand">Main Admin</span> : undefined}>
          <div className="space-y-3">
            {targetIsMainAdmin ? (
              <div className="flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3.5">
                <VerifiedBadge size={18} />
                <p className="text-sm text-muted-foreground">This is the main admin account and cannot be modified.</p>
              </div>
            ) : !iAmMainAdmin ? (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3.5">
                <Icon name="lock" size={16} className="text-amber-500" />
                <p className="text-sm text-muted-foreground">Only the main admin can grant or revoke admin access.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Grant full admin panel access to this user. They can manage all users, plans, credits and site settings.</p>
                <div className="flex gap-3">
                  {/* No button */}
                  <button type="button" disabled={adminSaving || !targetIsAdmin} onClick={() => toggleAdmin(false)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 py-3 text-sm font-semibold transition disabled:opacity-50 ${!targetIsAdmin ? 'border-border bg-secondary text-foreground' : 'border-border bg-background text-muted-foreground hover:border-brand/30'}`}>
                    <span className={`h-2 w-2 rounded-full ${!targetIsAdmin ? 'bg-foreground' : 'bg-muted-foreground/30'}`} />
                    No Admin
                  </button>
                  {/* Yes button */}
                  <button type="button" disabled={adminSaving || targetIsAdmin} onClick={() => toggleAdmin(true)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 py-3 text-sm font-semibold transition disabled:opacity-50 ${targetIsAdmin ? 'border-brand/50 bg-brand/10 text-brand' : 'border-border bg-background text-muted-foreground hover:border-brand/40'}`}>
                    {adminSaving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand" /> : <VerifiedBadge size={14} />}
                    Admin
                  </button>
                </div>
                {targetIsAdmin && <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-600">⚠️ This user has admin privileges. They can manage all platform data.</p>}
              </>
            )}
          </div>
        </SectionCard>

        {/* ── Credits ── */}
        <SectionCard title="Credits" icon="bolt"
          badge={<span className="rounded-full border border-border bg-gradient-soft px-3 py-1 text-xs font-semibold">{target.credits} credits</span>}>
          <div className="space-y-4">
            {/* Current balance */}
            <div className="flex items-center justify-between rounded-2xl border border-border bg-gradient-soft px-5 py-4">
              <div>
                <p className="text-xs text-muted-foreground">Current Balance</p>
                <p className="mt-0.5 text-3xl font-semibold text-gradient">{target.credits}</p>
              </div>
              <button type="button" onClick={refreshCredits} disabled={creditRefreshing} title="Refresh balance"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-brand-2 hover:text-brand-2 disabled:opacity-60">
                <Icon name="refresh" size={16} className={creditRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Add / subtract credits */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Add / Subtract Credits</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type="number" value={creditInput} onChange={e => setCreditInput(e.target.value)} placeholder="e.g. 50 or -10"
                    className="w-full rounded-2xl border border-border bg-secondary px-4 py-2.5 text-sm outline-none focus:border-brand transition placeholder:text-muted-foreground/50" />
                </div>
                <button type="button" onClick={addCredits} disabled={creditSaving || creditInput === '' || creditInput === '0'}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-brand px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_2px_12px_rgba(236,82,82,0.35)] transition hover:opacity-90 disabled:opacity-60 active:scale-[0.98]">
                  {creditSaving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Icon name="plus" size={15} />}
                  Apply
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Use positive numbers to add credits, negative to subtract.</p>
            </div>
          </div>
        </SectionCard>

        {/* ── Danger Zone ── */}
        <div className="overflow-hidden rounded-3xl border border-destructive/30 bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-destructive/20 bg-destructive/5 px-5 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Icon name="info" size={16} />
            </span>
            <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
          </div>
          <div className="divide-y divide-border">
            {/* Disable / Enable */}
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium">{targetIsDisabled ? 'Re-enable Account' : 'Disable Account'}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {targetIsDisabled ? 'Restore access. The user will be able to log in again.' : 'Block all access. The user cannot log in or use any page.'}
                </p>
              </div>
              {targetIsDisabled ? (
                <button type="button" disabled={actionSaving || targetIsMainAdmin} onClick={() => setShowEnableConfirm(true)}
                  className="shrink-0 rounded-2xl border border-green-500/40 bg-green-500/10 px-4 py-2 text-xs font-semibold text-green-600 transition hover:bg-green-500/20 disabled:opacity-50">
                  Enable
                </button>
              ) : (
                <button type="button" disabled={actionSaving || targetIsMainAdmin} onClick={() => setShowDisableConfirm(true)}
                  className="shrink-0 rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-600 transition hover:bg-orange-500/20 disabled:opacity-50">
                  Disable
                </button>
              )}
            </div>

            {/* Delete */}
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium">Delete Account</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Permanently delete the profile, all voice generations and all data. Irreversible.</p>
              </div>
              <button type="button" disabled={actionSaving || targetIsMainAdmin} onClick={() => setShowDeleteConfirm(true)}
                className="shrink-0 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-50">
                Delete
              </button>
            </div>

            {targetIsMainAdmin && (
              <div className="flex items-center gap-2 px-5 py-3 text-xs text-muted-foreground">
                <Icon name="lock" size={13} />
                Main admin account cannot be disabled or deleted.
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}

export default function AdminEditProfilePage({ params }: { params: { username: string } }) {
  return (
    <AdminGuard>
      <SiteShell>
        <AdminEditProfileContent username={params.username} />
      </SiteShell>
    </AdminGuard>
  );
}
