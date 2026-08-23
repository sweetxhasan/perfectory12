import { useEffect, useRef, useState, useCallback, type FormEvent, type ChangeEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { updateProfile as fbUpdateProfile } from 'firebase/auth';
import { SiteShell } from '@/components/site-shell';
import { AuthGuard } from '@/components/auth-guard';
import { Icon } from '@/components/icon';
import { CutButton, CutPanel } from '@/components/cut-ui';
import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/firebase';
import { updateUserProfile, isUsernameAvailable } from '@/lib/user-store';
import { notifyProfileUpdate } from '@/lib/notifications';

const IMGBB_KEY = '3ee56b707e39804a444bf7dbb08599ee';

/* ── imgbb upload via base64 ── */
async function uploadToImgbb(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const fd = new FormData();
        fd.append('image', base64);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
          method: 'POST',
          body: fd,
        });
        const json = await res.json();
        if (!json.success) reject(new Error(json.error?.message || 'Upload failed'));
        else resolve(json.data.url as string);
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsDataURL(file);
  });
}

function isValidUrl(val: string): boolean {
  try { const u = new URL(val); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}

/* ══════════════════════════════════════════════ */
export default function EditProfilePage() {
  return <AuthGuard><SiteShell><EditProfileContent /></SiteShell></AuthGuard>;
}

/* ── Camera SVG (inline, no icon dependency) ── */
function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}

/* ── Photo Overlay ── */
type OverlayTab = 'upload' | 'link';
interface PhotoOverlayProps {
  current: string;
  onUpdate: (url: string) => void;
  onClose: () => void;
}
function PhotoOverlay({ current, onUpdate, onClose }: PhotoOverlayProps) {
  const [tab, setTab] = useState<OverlayTab>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(current);
  const [linkVal, setLinkVal] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<'idle' | 'reading' | 'sending' | 'done'>('idle');
  const [err, setErr] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function acceptFile(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setErr('');
  }

  function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) acceptFile(f);
  }

  function onLinkChange(val: string) {
    setLinkVal(val);
    if (isValidUrl(val)) setPreview(val);
    setErr('');
  }

  async function handleUpdate() {
    setErr('');
    if (tab === 'upload') {
      if (!file) { setErr('Please select an image first.'); return; }
      setUploading(true);
      setUploadStep('reading');
      try {
        setTimeout(() => setUploadStep('sending'), 600);
        const url = await uploadToImgbb(file);
        setUploadStep('done');
        setTimeout(() => { onUpdate(url); onClose(); }, 500);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        setErr(`${msg} — please try again.`);
        setUploading(false);
        setUploadStep('idle');
      }
    } else {
      if (!isValidUrl(linkVal)) { setErr('Enter a valid image URL (https://…).'); return; }
      onUpdate(linkVal);
      onClose();
    }
  }

  const stepLabels = { idle: '', reading: 'Reading file…', sending: 'Uploading to ImgBB…', done: 'Done! ✓' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-lg" onClick={!uploading ? onClose : undefined} />

      {/* Card with external close control */}
      <div className="relative z-10 w-full max-w-sm float-up">
        {!uploading && (
          <CutButton
            variant="primary"
            type="button"
            onClick={onClose}
            aria-label="Close photo upload"
            className="absolute z-30 w-max px-3 py-2 text-xs font-semibold text-white shadow-lg"
            style={{ right: 0, top: 0 }}
          >
            Close
          </CutButton>
        )}
        <CutPanel
          tone="card"
          className="w-full overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.25)]"
          contentClassName="bg-background"
        >
        <div className="h-1 w-full bg-[linear-gradient(-45deg,#ec5252,#6e1a52)]" />

        {/* Header */}
        <div className="relative flex min-h-14 w-full items-center justify-center px-5 py-3.5">
          <h3 className="text-center text-base font-semibold text-foreground sm:text-lg">
            Upload Profile Photo
          </h3>
        </div>

        <div className="px-5 pb-5 space-y-4">

          {/* Preview ring */}
          <div className="flex justify-center">
            <div className={`relative rounded-full p-1 transition-all duration-500 ${uploading ? 'ring-4 ring-brand/40 ring-offset-2 ring-offset-background' : ''}`}>
              {preview ? (
                <img src={preview} alt="Preview"
                  className={`h-24 w-24 rounded-full object-cover shadow-xl transition-all duration-500 ${uploading ? 'opacity-60 scale-95' : ''}`}
                  crossOrigin="anonymous" onError={() => setPreview('')} />
              ) : (
                <span className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-soft text-brand shadow-xl">
                  <Icon name="user" size={36} />
                </span>
              )}
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70 backdrop-blur-sm">
                  {uploadStep === 'done'
                    ? <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white shadow-lg"><Icon name="check" size={20} /></span>
                    : <svg className="h-10 w-10 animate-spin text-brand" viewBox="0 0 50 50" fill="none">
                        <circle cx="25" cy="25" r="20" stroke="currentColor" strokeOpacity=".15" strokeWidth="5"/>
                        <path d="M25 5a20 20 0 0 1 20 20" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
                      </svg>
                  }
                </span>
              )}
            </div>
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{stepLabels[uploadStep]}</span>
                <span className="text-brand">{uploadStep === 'done' ? '100%' : uploadStep === 'sending' ? '60%' : '20%'}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className={`h-full rounded-full bg-gradient-brand transition-all duration-700 ${
                  uploadStep === 'reading' ? 'w-1/5' : uploadStep === 'sending' ? 'w-3/5' : 'w-full'
                }`} />
              </div>
            </div>
          )}

          {/* Tabs — hidden while uploading */}
          {!uploading && (
            <>
              <div className="flex rounded-2xl border border-border bg-secondary p-1">
                {(['upload', 'link'] as OverlayTab[]).map((t) => (
                  <button key={t} type="button"
                    onClick={() => { setTab(t); setErr(''); }}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold tracking-wide uppercase transition
                      ${tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    {t === 'upload' ? <><Icon name="upload" size={13} /> Upload</> : <><Icon name="link" size={13} /> Photo Link</>}
                  </button>
                ))}
              </div>

              <div>
                {tab === 'upload' ? (
                  <>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
                    <button type="button"
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={onDrop}
                      className={`group relative w-full overflow-hidden rounded-2xl border-2 border-dashed py-7 transition-all
                        ${dragOver ? 'border-brand bg-brand/8 scale-[1.01]' : file ? 'border-green-400/60 bg-green-50/30' : 'border-border bg-secondary/40 hover:border-brand hover:bg-brand/5'}`}>
                      <div className="flex flex-col items-center gap-2.5">
                        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300
                          ${dragOver ? 'bg-brand text-primary-foreground scale-110' : file ? 'bg-green-500/10 text-green-500' : 'bg-gradient-soft text-brand group-hover:scale-110'}`}>
                          <Icon name={file ? 'check' : 'upload'} size={22} />
                        </span>
                        <div className="text-center">
                          <p className="text-sm font-medium">
                            {dragOver ? 'Drop it here!' : file ? file.name : 'Click or drag & drop'}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {file ? `${(file.size / 1024).toFixed(0)} KB` : 'PNG, JPG, WEBP supported'}
                          </p>
                        </div>
                      </div>
                    </button>
                  </>
                ) : (
                  <div className="relative">
                    <Icon name="link" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type="url" placeholder="https://example.com/photo.jpg"
                      value={linkVal} onChange={(e) => onLinkChange(e.target.value)}
                      className="w-full rounded-2xl border border-border bg-secondary py-3 pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-brand transition" />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Error */}
          {err && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/8 px-3 py-2.5">
              <Icon name="x" size={13} className="mt-0.5 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{err}</p>
            </div>
          )}

          {/* CTA */}
          {!uploading && (
            <button type="button" onClick={handleUpdate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-3 text-sm font-medium text-primary-foreground shadow-[0_2px_14px_rgba(99,102,241,0.4)] transition hover:opacity-90 hover:shadow-[0_4px_20px_rgba(99,102,241,0.5)] active:scale-[0.98]">
              <Icon name="check" size={16} />
              Update Photo
            </button>
          )}
        </div>
        </CutPanel>
      </div>
    </div>
  );
}

/* ── Field card wrapper ── */
function FieldCard({ label, icon, hint, children }: {
  label: string; icon: React.ReactNode; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3.5 transition-colors focus-within:border-brand">
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon} {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ── Main edit content ── */
function EditProfileContent() {
  const { profile, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ name: '', bio: '', location: '', website: '', photoURL: '', username: '', phone: '', phonePublic: true });
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPhotoOverlay, setShowPhotoOverlay] = useState(false);

  /* username live check */
  const [usnStatus, setUsnStatus] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'short'>('idle');
  const usnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        photoURL: profile.photoURL || '',
        username: profile.username || '',
        phone: profile.phone?.startsWith('+880') ? profile.phone.slice(4) : (profile.phone || ''),
        phonePublic: profile.phonePublic ?? true,
      });
    }
  }, [profile]);

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setSaved(false);
  }

  const checkUsername = useCallback((val: string) => {
    if (usnTimer.current) clearTimeout(usnTimer.current);
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    update('username', clean);
    if (!profile) return;
    if (clean === profile.username) { setUsnStatus('idle'); return; }
    if (clean.length < 3) { setUsnStatus('short'); return; }
    setUsnStatus('checking');
    usnTimer.current = setTimeout(async () => {
      const available = await isUsernameAvailable(clean, profile.uid);
      setUsnStatus(available ? 'ok' : 'taken');
    }, 500);
  }, [profile]);

  if (!profile) return null;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!profile || usnStatus === 'taken' || usnStatus === 'short') return;
    setSaving(true);
    try {
      const phoneDigits = form.phone.replace(/\D/g, '');
      if (phoneDigits && phoneDigits.length !== 10) {
        setPhoneError('Please enter a valid 10-digit number (e.g. 01XXXXXXXX)');
        setSaving(false);
        return;
      }
      setPhoneError('');
      await updateUserProfile(profile.uid, {
        name: form.name,
        username: form.username,
        bio: form.bio,
        location: form.location,
        website: form.website,
        photoURL: form.photoURL,
        phone: phoneDigits ? `+880${phoneDigits}` : '',
        phonePublic: form.phonePublic,
        isPublic: true,
      });
      // Sync photoURL & displayName into Firebase Auth so that on the
      // next login upsertProfile sees matching URLs and does NOT revert
      // the photo back to the original sign-up avatar.
      if (auth.currentUser) {
        await fbUpdateProfile(auth.currentUser, {
          displayName: form.name,
          photoURL: form.photoURL || null,
        });
      }
      await refreshProfile();
      notifyProfileUpdate(profile.uid).catch(() => {});
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err) {
      console.log('[pv] save error', err);
    } finally {
      setSaving(false);
    }
  }

  const usnHint: Record<typeof usnStatus, { text: string; color: string } | null> = {
    idle: null,
    short: { text: 'Minimum 3 characters', color: 'text-muted-foreground' },
    checking: { text: 'Checking availability…', color: 'text-muted-foreground' },
    ok: { text: '✓ Username available', color: 'text-green-500' },
    taken: { text: '✗ Username already taken', color: 'text-destructive' },
  };

  return (
    <>
      {showPhotoOverlay && (
        <PhotoOverlay
          current={form.photoURL}
          onUpdate={(url) => update('photoURL', url)}
          onClose={() => setShowPhotoOverlay(false)}
        />
      )}

      <div className="mx-auto max-w-md">
        {/* Page header */}
        <div className="mb-7 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/profile/${profile.username}`}
              aria-label="Back to profile"
              className="flex size-9 shrink-0 items-center justify-center text-foreground transition hover:text-brand-2"
            >
              <Icon name="arrow-left" size={19} />
            </Link>
            <h1 className="truncate bg-[linear-gradient(-45deg,#ec5252,#6e1a52)] bg-clip-text text-xl font-semibold text-transparent sm:text-2xl">
              Edit Profile
            </h1>
          </div>
          <Link href={`/profile/${profile.username}`} className="shrink-0">
            <CutButton variant="primary" className="w-max px-3 py-2 text-xs font-semibold text-white sm:px-4 sm:py-2.5 sm:text-sm">
              <Icon name="eye" size={15} />
              View Profile
            </CutButton>
          </Link>
        </div>

        <CutPanel tone="card" className="overflow-hidden" contentClassName="bg-card p-4 sm:p-6">
        <form onSubmit={save} className="space-y-3">

          {/* ── Avatar ── */}
          <div className="mx-auto mb-1 flex w-full max-w-[19rem] flex-col items-center bg-card px-4 py-5">
            <div className="relative size-32">
              <CutPanel
                tone="card"
                stroke="url(#cut-brand-gradient)"
                className="size-full overflow-hidden p-1"
                contentClassName="flex items-center justify-center overflow-hidden bg-background"
              >
                {form.photoURL ? (
                  <img src={form.photoURL} alt="Avatar" crossOrigin="anonymous"
                    className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gradient-brand text-4xl font-semibold text-primary-foreground">
                    {form.name.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </CutPanel>
              <div className="absolute -bottom-2 -right-2 z-20 size-10">
                <CutPanel
                tone="brand"
                className="size-full"
                contentClassName="flex items-center justify-center"
              >
                <button type="button" onClick={() => setShowPhotoOverlay(true)}
                  className="flex size-full items-center justify-center text-primary-foreground transition hover:scale-110 active:scale-95"
                  aria-label="Change photo">
                  <CameraIcon />
                </button>
                </CutPanel>
              </div>
            </div>
            <button type="button" onClick={() => setShowPhotoOverlay(true) }
              className="mt-3 text-xs font-medium text-brand-2 transition hover:underline">
              Change photo
            </button>
          </div>

          {/* Full name */}
          <FieldCard label="Full Name" icon={<Icon name="user" size={13} />}>
            <div className="flex items-center justify-between gap-2">
              <input type="text" maxLength={20} value={form.name} required
                onChange={(e) => update('name', e.target.value)}
                placeholder="Your display name"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" />
              <span className={`shrink-0 text-xs tabular-nums ${form.name.length >= 18 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {form.name.length}/20
              </span>
            </div>
          </FieldCard>

          {/* Email — read only */}
          <FieldCard label="Email Address" icon={<Icon name="user" size={13} />}>
            <input
              type="email"
              value={profile.email ?? ''}
              disabled
              className="w-full bg-transparent text-sm text-muted-foreground outline-none cursor-not-allowed" />
            <p className="mt-1.5 text-xs text-muted-foreground leading-snug">
              Want to change your email?{' '}
              <Link href="/contact"
                className="font-medium text-brand-2 underline underline-offset-2 hover:opacity-80 transition">
                Contact our support team
              </Link>
            </p>
          </FieldCard>

          {/* Username */}
          <FieldCard label="Username" icon={<Icon name="link" size={13} />}
            hint={usnHint[usnStatus] ? undefined : undefined}>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">@</span>
              <input type="text" value={form.username}
                onChange={(e) => checkUsername(e.target.value)}
                placeholder="your_username"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" />
              {usnStatus === 'checking' && (
                <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-2/30 border-t-brand-2" />
              )}
              {usnStatus === 'ok' && <Icon name="check" size={15} className="shrink-0 text-green-500" />}
              {usnStatus === 'taken' && <Icon name="x" size={15} className="shrink-0 text-destructive" />}
            </div>
            {usnHint[usnStatus] && (
              <p className={`mt-1 text-xs ${usnHint[usnStatus]!.color}`}>{usnHint[usnStatus]!.text}</p>
            )}
          </FieldCard>

          {/* Location */}
          <FieldCard label="Location" icon={<Icon name="globe" size={13} />}>
            <input type="text" value={form.location}
              onChange={(e) => update('location', e.target.value)}
              placeholder="Dhaka, Bangladesh"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" />
          </FieldCard>

          {/* Website */}
          <FieldCard label="Website" icon={<Icon name="link" size={13} />}>
            <input type="url" value={form.website}
              onChange={(e) => update('website', e.target.value)}
              placeholder="https://your-site.com"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" />
          </FieldCard>

          {/* Phone number */}
          <FieldCard label="Phone Number" icon={<Icon name="phone" size={13} />}>
            <div className="flex items-center gap-2">
              <span className="shrink-0 select-none text-sm font-semibold text-muted-foreground">+880</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={form.phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  update('phone', digits);
                  setPhoneError('');
                }}
                placeholder="01XXXXXXXX"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
              {form.phone.length > 0 && (
                <span className={`shrink-0 text-xs tabular-nums ${form.phone.length === 10 ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {form.phone.length}/10
                </span>
              )}
            </div>
            {phoneError && (
              <p className="mt-1 text-xs text-destructive">{phoneError}</p>
            )}
            {/* Public toggle */}
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
                onClick={() => update('phonePublic', !form.phonePublic)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none
                  ${form.phonePublic ? 'bg-green-500' : 'bg-border'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform
                  ${form.phonePublic ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </FieldCard>

          {/* Bio */}
          <FieldCard label="Bio" icon={<Icon name="pencil" size={13} />}>
            <textarea rows={3} maxLength={180} value={form.bio}
              onChange={(e) => update('bio', e.target.value)}
              placeholder="Tell people about yourself"
              className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50" />
            <p className={`mt-1 text-right text-xs tabular-nums ${form.bio.length >= 165 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {form.bio.length}/180
            </p>
          </FieldCard>

          {/* Save */}
          <CutButton
            type="submit"
            variant="primary"
            disabled={saving || usnStatus === 'taken' || usnStatus === 'short'}
            className="w-full bg-[linear-gradient(-45deg,#ec5252,#6e1a52)] py-3.5 text-sm font-medium text-white"
          >
            {saving
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              : <Icon name="check" size={17} />}
            {saved ? 'Profile Updated!' : 'Update Profile'}
          </CutButton>

        </form>
        </CutPanel>
      </div>
    </>
  );
}
