import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'wouter';
import { SiteShell } from '@/components/site-shell';
import { CutButton, CutFrame, CutPanel } from '@/components/cut-ui';
import { Icon } from '@/components/icon';
import { VerifiedBadge } from '@/components/verified-badge';
import { useAuth } from '@/lib/auth-context';
import { isAnyAdmin, isMainAdmin } from '@/lib/admin';
import { getProfileByUsername, subscribeUserProfile, subscribeGenerations, type UserProfile, type Generation } from '@/lib/user-store';
import { VoiceHistoryList } from '@/components/voice-history-list';
import { notifyUserNotice } from '@/lib/notifications';

/* ── Send Notice Overlay ────────────────────────────── */
function SendNoticeOverlay({ targetName, targetUid, onClose }: { targetName: string; targetUid: string; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [titleFocused, setTitleFocused] = useState(false);
  const [bodyFocused, setBodyFocused] = useState(false);

  async function handleSend() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    try {
      await notifyUserNotice(targetUid, title.trim(), body.trim());
      setDone(true);
      setTimeout(onClose, 1400);
    } catch {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>

        {/* Gradient top bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(-45deg,#ec5252,#6e1a52)' }} />

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-md"
              style={{ background: 'linear-gradient(-45deg,#ec5252,#6e1a52)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                <circle cx="12" cy="3" r="1" fill="white" stroke="none"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold leading-none" style={{ background: 'linear-gradient(-45deg,#ec5252,#6e1a52)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Send Notice
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">to <span className="font-medium text-foreground">{targetName}</span></p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-destructive hover:bg-destructive/10 hover:text-destructive">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 pb-5 pt-3 space-y-3">

          {/* Title field */}
          <div className={`relative rounded-2xl border transition-all duration-200 bg-secondary/50 ${titleFocused ? 'border-brand shadow-[0_0_0_3px_rgba(236,82,82,0.12)]' : 'border-border'}`}>
            <div className="px-4 pt-3 pb-2">
              <label className={`block text-[10px] font-semibold uppercase tracking-widest transition-colors ${titleFocused ? '' : 'text-muted-foreground'}`}
                style={titleFocused ? { color: '#ec5252' } : {}}>
                Notice Title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onFocus={() => setTitleFocused(true)}
                onBlur={() => setTitleFocused(false)}
                maxLength={60}
                placeholder="e.g. Important update from Admin"
                className="mt-1 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
              />
            </div>
            {title.length > 0 && (
              <span className="absolute right-3 top-3 text-[10px] tabular-nums text-muted-foreground/50">{title.length}/60</span>
            )}
          </div>

          {/* Body field */}
          <div className={`relative rounded-2xl border transition-all duration-200 bg-secondary/50 ${bodyFocused ? 'border-brand shadow-[0_0_0_3px_rgba(236,82,82,0.12)]' : 'border-border'}`}>
            <div className="px-4 pt-3 pb-2">
              <label className={`block text-[10px] font-semibold uppercase tracking-widest transition-colors ${bodyFocused ? '' : 'text-muted-foreground'}`}
                style={bodyFocused ? { color: '#ec5252' } : {}}>
                Notice Message
              </label>
              <textarea
                rows={4}
                value={body}
                onChange={e => setBody(e.target.value)}
                onFocus={() => setBodyFocused(true)}
                onBlur={() => setBodyFocused(false)}
                maxLength={400}
                placeholder="Write your notice here…"
                className="mt-1 w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/40"
              />
            </div>
            <div className="flex items-center justify-between border-t border-border/50 px-4 py-2">
              <span className="text-[10px] text-muted-foreground/50">Markdown not supported</span>
              <span className="text-[10px] tabular-nums text-muted-foreground/50">{body.length}/400</span>
            </div>
          </div>

          {/* Done state */}
          {done && (
            <div className="flex items-center gap-2 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-600">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              Notice sent successfully!
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-2xl border border-border bg-secondary py-2.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
              Cancel
            </button>
            <button type="button" onClick={handleSend}
              disabled={sending || done || !title.trim() || !body.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(-45deg,#ec5252,#6e1a52)', boxShadow: '0 4px 18px rgba(236,82,82,0.3)' }}>
              {sending
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
              {sending ? 'Sending…' : 'Send Notice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const planMeta: Record<string, { label: string; color: string; icon: 'crown' | 'bolt' | 'star' }> = {
  free:    { label: 'Free',        color: 'text-muted-foreground border-border bg-secondary',              icon: 'star'  },
  monthly: { label: 'Monthly Pro', color: 'text-brand border-brand/30 bg-brand/10',                        icon: 'crown' },
  yearly:  { label: 'Yearly Pro',  color: 'text-brand-2 border-brand-2/30 bg-brand-2/10',                  icon: 'crown' },
};

const langFlag: Record<string, string> = {
  Bangla: '🇧🇩', English: '🇬🇧', Hindi: '🇮🇳',
};

function formatTime(ts: unknown): string {
  if (!ts) return '';
  try {
    const d = (ts as { toDate(): Date }).toDate();
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

export default function PublicProfilePage({ params }: { params: { username: string } }) {
  const { username } = params;
  const { profile: myProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [gens, setGens] = useState<Generation[]>([]);
  const [status, setStatus] = useState<'loading' | 'found' | 'private' | 'missing'>('loading');

  const isOwner = !!myProfile && myProfile.username === username;
  const iAmAdmin = isAnyAdmin(myProfile?.email, myProfile?.isAdmin);
  const canAdminEdit = iAmAdmin && !isOwner && !isMainAdmin(profile?.email);
  const [showNoticeOverlay, setShowNoticeOverlay] = useState(false);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubGens: (() => void) | null = null;

    getProfileByUsername(username)
      .then((p) => {
        if (!p) { setStatus('missing'); return; }
        setProfile(p);
        setStatus(!p.isPublic && !isOwner ? 'private' : 'found');
        // Keep the profile card, plan badge, credits, and account data live
        // when the owner or an admin changes the document in Firestore.
        unsubProfile = subscribeUserProfile(p.uid, (nextProfile) => {
          if (!nextProfile) {
            setProfile(null);
            setStatus('missing');
            return;
          }
          setProfile(nextProfile);
          setStatus(!nextProfile.isPublic && !isOwner ? 'private' : 'found');
        });
        if (!p.isPublic && !isOwner) return;
        // Real-time listener — no composite index, picks up new generations instantly
        unsubGens = subscribeGenerations(p.uid, 20, setGens);
      })
      .catch(() => setStatus('missing'));

    return () => {
      unsubProfile?.();
      unsubGens?.();
    };
  }, [username, isOwner]);

  /* ── Shimmer helper ── */
  const Sk = ({ className = '', style }: { className?: string; style?: CSSProperties }) => (
    <div className={`animate-shimmer rounded-2xl ${className}`} style={style} />
  );

  /* ── Loading skeleton ── */
  if (status === 'loading') return (
    <SiteShell>
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Profile card skeleton */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          {/* Cover */}
          <Sk className="h-40 w-full rounded-none sm:h-52" />

          {/* Avatar + info */}
          <div className="flex flex-col items-center px-6 pb-8">
            {/* Avatar overlapping cover */}
            <div className="-mt-16 sm:-mt-20">
              <Sk className="h-28 w-28 rounded-full border-4 border-card sm:h-36 sm:w-36" />
            </div>

            {/* Name, username */}
            <div className="mt-5 flex flex-col items-center gap-2.5">
              <Sk className="h-7 w-48 rounded-xl" />
              <Sk className="h-3.5 w-28 rounded-full" />
            </div>

            {/* Plan badge */}
            <Sk className="mt-4 h-6 w-24 rounded-full" />

            {/* Bio lines */}
            <div className="mt-5 flex flex-col items-center gap-2 w-full max-w-xs">
              <Sk className="h-3.5 w-full rounded-full" />
              <Sk className="h-3.5 w-4/5 rounded-full" />
              <Sk className="h-3.5 w-3/5 rounded-full" />
            </div>

            {/* Action buttons */}
            <div className="mt-7 flex gap-3">
              <Sk className="h-10 w-32 rounded-2xl" />
              <Sk className="h-10 w-32 rounded-2xl" />
            </div>
          </div>
        </div>

        {/* Voices section skeleton */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2.5">
              <Sk className="h-8 w-8 rounded-xl" />
              <Sk className="h-4 w-24 rounded-full" />
            </div>
            <Sk className="h-7 w-16 rounded-xl" />
          </div>
          {/* Rows */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-border' : ''}`}>
              <Sk className="h-8 w-8 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Sk className="h-3 rounded-full" style={{ width: `${110 + i * 25}px` }} />
                <Sk className="h-3 w-20 rounded-full" />
              </div>
              <Sk className="h-3 w-10 shrink-0 rounded-full" />
              <Sk className="h-7 w-7 shrink-0 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );

  /* ── Missing ── */
  if (status === 'missing') return (
    <SiteShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-5 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-soft text-brand">
            <Icon name="user" size={34} />
          </span>
          <div>
            <h1 className="text-2xl">Profile not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">No user exists with the username <span className="font-medium text-foreground">@{username}</span>.</p>
          </div>
          <Link href="/"><OutlineButton icon="home">Back home</OutlineButton></Link>
        </div>
      </div>
    </SiteShell>
  );

  /* ── Private ── */
  if (status === 'private') return (
    <SiteShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-5 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-soft text-brand">
            <Icon name="lock" size={30} />
          </span>
          <div>
            <h1 className="text-2xl">Private profile</h1>
            <p className="mt-2 text-sm text-muted-foreground">{profile?.name} has chosen to keep their profile private.</p>
          </div>
        </div>
      </div>
    </SiteShell>
  );

  if (!profile) return null;

  const plan = planMeta[profile.plan] ?? planMeta.free;
  const bio = profile.bio?.trim() || "I'm a Perfectory voice user.";

  return (
    <SiteShell>
      {showNoticeOverlay && profile && (
        <SendNoticeOverlay targetName={profile.name || profile.username} targetUid={profile.uid} onClose={() => setShowNoticeOverlay(false)} />
      )}
      <div className="mx-auto max-w-2xl">

        {/* ── Profile card ── */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">

          {/* Cover */}
          <div className="relative h-40 sm:h-52">
            {/* Gradient cover — replace with real photo when available */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand via-brand-2/70 to-brand-3" />
            {/* subtle noise overlay */}
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
            {/* vignette at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card/80 to-transparent" />
          </div>

          {/* Avatar + info — centered */}
          <div className="relative flex flex-col items-center px-6 pb-8">
            {/* Avatar — overlapping cover */}
            <div className="-mt-16 sm:-mt-20">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.name}
                  crossOrigin="anonymous"
                  className="h-28 w-28 rounded-full border-4 border-card object-cover shadow-xl sm:h-36 sm:w-36"
                />
              ) : (
                <span className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-card bg-gradient-brand text-4xl font-semibold text-primary-foreground shadow-xl sm:h-36 sm:w-36 sm:text-5xl">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Name & username */}
            <div className="mt-4 text-center">
              <h1 className="inline-flex items-center justify-center gap-2 text-2xl font-semibold sm:text-3xl">
                {profile.name}
                {isMainAdmin(profile.email) && <VerifiedBadge size={24} />}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">@{profile.username}</p>
            </div>

            {/* Plan badge */}
            <div className="mt-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${plan.color}`}>
                <Icon name={plan.icon} size={12} />
                {plan.label}
              </span>
            </div>

            {/* Bio */}
            <p className="mt-4 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
              {bio}
            </p>

            {/* Location, website & phone */}
            {(profile.location || profile.website || ((profile.phonePublic || isOwner || iAmAdmin) && profile.phone)) && (
              <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                {profile.location && (
                  <span className="flex items-center gap-1.5">
                    <Icon name="globe" size={14} className="text-brand-2" />
                    {profile.location}
                  </span>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-brand-2 hover:underline">
                    <Icon name="link" size={14} /> Website
                  </a>
                )}
                {profile.phone && (profile.phonePublic || isOwner || iAmAdmin) && (
                  <a href={`tel:${profile.phone}`}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <Icon name="phone" size={14} className="text-brand-2" />
                    {profile.phone}
                    {(isOwner || iAmAdmin) && (
                      profile.phonePublic
                        ? <span className="ml-0.5 rounded-full border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-green-600">Public</span>
                        : <span className="ml-0.5 rounded-full bg-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Private</span>
                    )}
                  </a>
                )}
              </div>
            )}

            {/* Action buttons */}
            {(isOwner || canAdminEdit) && (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {isOwner && (
                  <>
                    <Link href="/profile/edit">
                      <button className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium text-white shadow-[0_2px_12px_rgba(236,82,82,0.4)] transition hover:opacity-90 hover:shadow-[0_4px_20px_rgba(236,82,82,0.5)] active:scale-95"
                        style={{ background: 'linear-gradient(-45deg,#ec5252,#6e1a52)' }}>
                        <Icon name="pencil" size={15} />
                        Edit Profile
                      </button>
                    </Link>
                    {profile.plan === 'free' && (
                      <Link href="/plans">
                        <button className="inline-flex items-center gap-2 rounded-2xl bg-gradient-brand px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_2px_12px_rgba(236,82,82,0.4)] transition hover:opacity-90 hover:shadow-[0_4px_20px_rgba(236,82,82,0.5)] active:scale-95">
                          <Icon name="crown" size={15} />
                          Update Plan
                        </button>
                      </Link>
                    )}
                  </>
                )}
                {canAdminEdit && (
                  <>
                    <Link href={`/profile/${profile.username}/edit`}>
                      <button className="inline-flex items-center gap-2 rounded-2xl bg-gradient-brand px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_2px_12px_rgba(236,82,82,0.4)] transition hover:opacity-90 active:scale-95">
                        <Icon name="shield" size={15} />
                        Edit Profile
                      </button>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowNoticeOverlay(true)}
                      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-105 hover:shadow-xl active:scale-95"
                      style={{ background: 'linear-gradient(-45deg,#ec5252,#6e1a52)', boxShadow: '0 3px 14px rgba(236,82,82,0.4)' }}
                    >
                      <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                      </svg>
                      Send Notice
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── My Voices ── */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-soft text-brand">
                <Icon name="soundwave" size={17} />
              </span>
              <h2 className="text-base font-semibold">
                {isOwner ? 'My Voices' : `${profile.name}'s Voices`}
              </h2>
              {gens.length > 0 && (
                <span className="rounded-full bg-gradient-soft px-2 py-0.5 text-xs text-muted-foreground">
                  {gens.length}
                </span>
              )}
            </div>
            {isOwner && (
              <Link href="/generator">
                <button className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-medium transition hover:border-brand-2 hover:text-brand-2 active:scale-95">
                  <Icon name="plus" size={13} />
                  New
                </button>
              </Link>
            )}
          </div>

          {/* List */}
          <VoiceHistoryList
            generations={gens}
            isOwner={isOwner}
            ownerName={profile.name}
          />
        </div>

        {/* ── CTA for visitors ── */}
        {!isOwner && (
          <div className="mt-5 flex flex-col items-center gap-3 rounded-3xl border border-border bg-gradient-soft p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-md">
              <Icon name="microphone" size={22} />
            </span>
            <p className="text-sm text-muted-foreground">
              {profile.name} creates voice with <span className="font-medium text-foreground">Perfectory Voice</span>. Try it yourself!
            </p>
            <Link href="/generator">
              <GradientButton icon="soundwave">Try the voice generator</GradientButton>
            </Link>
          </div>
        )}

      </div>
    </SiteShell>
  );
}
