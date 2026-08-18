import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation } from 'wouter';
import { AdminGuard } from '@/components/admin-guard';
import { SiteShell } from '@/components/site-shell';
import { OverlayShell } from '@/components/overlay-shell';
import { Icon } from '@/components/icon';
import { useAuth } from '@/lib/auth-context';
import { isMainAdmin } from '@/lib/admin';
import { subscribePresence, type AdminPresence } from '@/lib/chat';
import {
  adminSetAdmin,
  adminSetBlocked,
  adminSetDisabled,
  subscribeAllUserProfiles,
  type UserProfile,
} from '@/lib/user-store';
import { notifyUserNotice } from '@/lib/notifications';

type FilterId = 'all' | 'admins' | 'users' | 'active' | 'disabled' | 'blocked';
type SearchField = 'all' | 'name' | 'username' | 'email';

const FILTERS: Array<{ id: FilterId; label: string; icon: 'users' | 'shield' | 'user' | 'check' | 'ban' | 'pause' }> = [
  { id: 'all', label: 'All users', icon: 'users' },
  { id: 'admins', label: 'Admins', icon: 'shield' },
  { id: 'users', label: 'Users', icon: 'user' },
  { id: 'active', label: 'Active', icon: 'check' },
  { id: 'disabled', label: 'Disabled', icon: 'pause' },
  { id: 'blocked', label: 'Blocked', icon: 'ban' },
];

const PLAN_LABEL: Record<UserProfile['plan'], string> = {
  free: 'Free',
  monthly: 'Monthly Pro',
  yearly: 'Yearly Premium',
};

const PLAN_TONE: Record<UserProfile['plan'], string> = {
  free: 'border-slate-200/80 bg-slate-50/80 text-slate-600',
  monthly: 'border-fuchsia-200/80 bg-fuchsia-50/80 text-fuchsia-700',
  yearly: 'border-amber-200/80 bg-amber-50/80 text-amber-700',
};

function displayDate(value: unknown): string {
  const timestamp = value as { toDate?: () => Date; toMillis?: () => number } | null | undefined;
  const date = timestamp?.toDate?.() ?? (timestamp?.toMillis ? new Date(timestamp.toMillis()) : null);
  if (!date || Number.isNaN(date.getTime())) return 'Recently joined';
  return `Joined ${date.toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}

function initials(profile: UserProfile): string {
  return (profile.name || profile.username || profile.email || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function profileStatus(profile: UserProfile): 'active' | 'disabled' | 'blocked' {
  if (profile.isBlocked) return 'blocked';
  if (profile.isDisabled) return 'disabled';
  return 'active';
}

function presenceIsOnline(presence?: AdminPresence): boolean {
  if (!presence?.online) return false;
  if (!presence.lastSeen) return true;
  return Math.floor((Date.now() - presence.lastSeen.toDate().getTime()) / 60000) < 2;
}

function UserAvatar({ profile, large = false, presence }: { profile: UserProfile; large?: boolean; presence?: AdminPresence }) {
  const [failed, setFailed] = useState(false);
  const size = large ? 'h-20 w-20 text-2xl' : 'h-12 w-12 text-sm';
  const websiteActive = presenceIsOnline(presence);
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full border border-white/80 bg-gradient-to-br from-[#ffdbe5] via-[#f2d7ed] to-[#d8d8ff] shadow-sm ${size}`}>
      {profile.photoURL && !failed ? (
        <img
          src={profile.photoURL}
          alt={`${profile.name || profile.username} profile`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-semibold text-[#71104f]">
          {initials(profile)}
        </span>
      )}
      <span className={`absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white ${websiteActive ? 'bg-emerald-500' : 'bg-black'}`} aria-label={websiteActive ? 'Active on website' : 'Not active on website'} />
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-2" aria-label="Loading users">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="animate-shimmer rounded-[1.75rem] border border-border/70 bg-card/70 p-5">
          <div className="flex gap-4">
            <div className="h-12 w-12 shrink-0 rounded-[1.25rem] bg-secondary/70" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-4 w-36 rounded-full bg-secondary/70" />
              <div className="h-3 w-48 rounded-full bg-secondary/60" />
              <div className="h-3 w-28 rounded-full bg-secondary/50" />
            </div>
          </div>
          <div className="mt-5 h-10 rounded-xl bg-secondary/50" />
        </div>
      ))}
    </div>
  );
}

function UserProfilePanel({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const status = profileStatus(profile);
  return (
    <OverlayShell open onClose={onClose} title="User profile" fullScreenMobile>
      <div className="bg-gradient-to-br from-[#fff2f6] via-card to-[#f0efff] px-5 pb-7 pt-8 sm:px-7">
        <div className="flex items-center gap-4">
          <UserAvatar profile={profile} large />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-bold">{profile.name || 'Unnamed user'}</h2>
              {profile.isAdmin && <span className="rounded-full bg-[#781050]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#781050]">Admin</span>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">@{profile.username || 'username'}</p>
            <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'blocked' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {status}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-7">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoTile icon="mail" label="Email" value={profile.email || 'Not provided'} />
          <InfoTile icon="crown" label="Plan" value={PLAN_LABEL[profile.plan] ?? 'Free'} />
          <InfoTile icon="bolt" label="Credits" value={`${profile.credits ?? 0} available`} />
          <InfoTile icon="clock" label="Membership" value={displayDate(profile.createdAt)} />
        </div>
        {profile.bio && (
          <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Bio</p>
            <p className="text-sm leading-6 text-foreground/80">{profile.bio}</p>
          </div>
        )}
      </div>
    </OverlayShell>
  );
}

function InfoTile({ icon, label, value }: { icon: 'mail' | 'crown' | 'bolt' | 'clock'; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-3.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon name={icon} size={14} />
        <span className="text-[10px] font-bold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-foreground/85">{value}</p>
    </div>
  );
}

function NoticePanel({
  profile,
  onClose,
  onSent,
}: {
  profile: UserProfile;
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Add a title and message before sending.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await notifyUserNotice(profile.uid, title.trim(), message.trim());
      onSent(`Notice sent to @${profile.username || 'user'}`);
    } catch {
      setError('Could not send this notice. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <OverlayShell open onClose={onClose} title="Send notice" fullScreenMobile>
      <form onSubmit={submit} className="space-y-5 p-5 sm:p-7">
        <div className="flex items-center gap-3 rounded-2xl border border-violet-200/80 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-3.5">
          <UserAvatar profile={profile} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile.name || 'Unnamed user'}</p>
            <p className="truncate text-xs text-muted-foreground">@{profile.username || 'username'} · {profile.email}</p>
          </div>
        </div>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Subject</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A quick update for you" className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-[#b72072] focus:ring-4 focus:ring-[#b72072]/10" />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Message</span>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a helpful note for this user…" rows={6} className="w-full resize-none rounded-2xl border border-border bg-background p-4 text-sm leading-6 outline-none transition focus:border-[#b72072] focus:ring-4 focus:ring-[#b72072]/10" />
        </label>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
        <button type="submit" disabled={sending} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand text-sm font-semibold text-primary-foreground shadow-lg shadow-[#861252]/20 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60">
          <Icon name="send" size={16} />
          {sending ? 'Sending notice…' : 'Send notice'}
        </button>
      </form>
    </OverlayShell>
  );
}

function ConfirmPanel({
  profile,
  action,
  onClose,
  onConfirm,
  busy,
}: {
  profile: UserProfile;
  action: 'add-admin' | 'remove-admin' | 'block' | 'unblock';
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const adminAction = action === 'add-admin' || action === 'remove-admin';
  const positive = action === 'add-admin' || action === 'unblock';
  const title = action === 'add-admin' ? 'Make this user an admin?' : action === 'remove-admin' ? 'Remove admin access?' : action === 'block' ? 'Block this user?' : 'Unblock this user?';
  const description = adminAction
    ? positive ? 'They will be able to access the admin workspace and help manage Perfectory Voice.' : 'They will immediately lose admin access. Their account and content will stay intact.'
    : positive ? 'This user will be able to sign in and use the app again.' : 'This user will be unable to sign in until an admin unblocks the account.';
  return (
    <OverlayShell open onClose={onClose} title="Please confirm" fullScreenMobile>
      <div className="space-y-5 p-5 sm:p-7">
        <div className={`rounded-3xl p-5 ${positive ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70">
            <Icon name={adminAction ? 'shield' : 'ban'} size={22} />
          </div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-2 text-sm leading-6 opacity-80">{description}</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-secondary/25 p-3">
          <UserAvatar profile={profile} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile.name || 'Unnamed user'}</p>
            <p className="truncate text-xs text-muted-foreground">@{profile.username || 'username'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="h-11 flex-1 rounded-2xl border border-border bg-background text-sm font-semibold transition hover:bg-secondary">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={`h-11 flex-1 rounded-2xl text-sm font-semibold text-white transition disabled:opacity-60 ${positive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
            {busy ? 'Saving…' : positive ? 'Confirm' : 'Confirm change'}
          </button>
        </div>
      </div>
    </OverlayShell>
  );
}

export default function AdminUsers() {
  const { profile: adminProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userPresences, setUserPresences] = useState<Record<string, AdminPresence>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [searchField, setSearchField] = useState<SearchField>('all');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [noticeProfile, setNoticeProfile] = useState<UserProfile | null>(null);
  const [confirm, setConfirm] = useState<{ profile: UserProfile; action: 'add-admin' | 'remove-admin' | 'block' | 'unblock' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    return subscribeAllUserProfiles(
      (rows) => {
        setUsers(rows);
        setLoading(false);
        setLoadError('');
      },
      () => {
        setLoading(false);
        setLoadError('Could not load the user directory. Check your connection and try again.');
      },
    );
  }, []);

  useEffect(() => {
    if (users.length === 0) {
      setUserPresences({});
      return undefined;
    }
    const activeIds = new Set(users.map((user) => user.uid));
    const unsubs = users.map((user) =>
      subscribePresence(user.uid, (presence) => {
        setUserPresences((previous) => ({ ...previous, [user.uid]: presence }));
      }),
    );
    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
      setUserPresences((previous) => Object.fromEntries(Object.entries(previous).filter(([uid]) => activeIds.has(uid))));
    };
  }, [users]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const counts = useMemo(() => ({
    all: users.length,
    admins: users.filter((user) => user.isAdmin || isMainAdmin(user.email)).length,
    users: users.filter((user) => !user.isAdmin && !isMainAdmin(user.email)).length,
    active: users.filter((user) => profileStatus(user) === 'active').length,
    disabled: users.filter((user) => user.isDisabled).length,
    blocked: users.filter((user) => user.isBlocked).length,
  }), [users]);

  const visibleUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return users.filter((user) => {
      const status = profileStatus(user);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'admins' && (user.isAdmin || isMainAdmin(user.email))) ||
        (filter === 'users' && !user.isAdmin && !isMainAdmin(user.email)) ||
        (filter === 'active' && status === 'active') ||
        (filter === 'disabled' && status === 'disabled') ||
        (filter === 'blocked' && status === 'blocked');
      if (!matchesFilter || !normalized) return matchesFilter;
      const value = searchField === 'name' ? user.name : searchField === 'username' ? user.username : searchField === 'email' ? user.email : `${user.name} ${user.username} ${user.email}`;
      return value.toLowerCase().includes(normalized);
    });
  }, [filter, search, searchField, users]);

  function showToast(message: string) {
    setToast(message);
  }

  async function confirmAction() {
    if (!confirm) return;
    setBusy(true);
    try {
      const { profile: target, action } = confirm;
      if (action === 'add-admin' || action === 'remove-admin') {
        await adminSetAdmin(target.uid, action === 'add-admin');
        showToast(action === 'add-admin' ? `@${target.username} is now an admin` : `Admin access removed from @${target.username}`);
      } else {
        await adminSetBlocked(target.uid, action === 'block');
        showToast(action === 'block' ? `@${target.username} has been blocked` : `@${target.username} has been unblocked`);
      }
      setConfirm(null);
    } catch {
      showToast('The change could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setSearch(searchDraft);
  }

  function openUserProfile(user: UserProfile) {
    const identifier = user.username?.trim() || user.uid;
    setLocation(`/profile/${encodeURIComponent(identifier)}`);
  }

  return (
    <AdminGuard>
      <SiteShell>
        <div className="space-y-6 pb-8">
          <header className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-[#fff4f7] via-card to-[#f1efff] p-5 shadow-sm sm:p-7">
            <div className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full bg-[#e7b7db]/25 blur-3xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8c235f]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]" />
                  Admin workspace
                </p>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">User directory</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">See every account at a glance, keep access healthy, and reach the right user without leaving the workspace.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
                <Metric label="Total" value={counts.all} />
                <Metric label="Active" value={counts.active} tone="green" />
                <Metric label="Admins" value={counts.admins} tone="violet" />
              </div>
            </div>
          </header>

          <div className="space-y-4">
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2">
                {FILTERS.map((item) => (
                  <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`flex h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition ${filter === item.id ? 'border-[#771050] bg-gradient-brand text-white shadow-md shadow-[#771050]/15' : 'border-border/80 bg-card/80 text-muted-foreground hover:border-[#d69abd] hover:text-foreground'}`}>
                    <Icon name={item.icon} size={15} />
                    {item.label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filter === item.id ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground'}`}>{counts[item.id]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative z-50 rounded-[1.5rem] border border-border/80 bg-card/75 p-3 shadow-sm backdrop-blur sm:p-4">
              <form onSubmit={submitSearch} className="flex min-w-0 flex-nowrap items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Icon name="search" size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Search users by name, username or email…" className="h-12 w-full rounded-2xl border border-border bg-background/80 pl-11 pr-4 text-sm outline-none transition focus:border-[#b72072] focus:ring-4 focus:ring-[#b72072]/10" />
                </div>
                <div className="flex shrink-0 gap-2">
                  <div className="relative">
                    <button type="button" onClick={() => setFilterOpen((open) => !open)} className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-background/80 px-4 text-sm font-semibold transition hover:bg-secondary">
                      <Icon name="filter" size={16} />
                      <span className="hidden sm:inline">Search in</span>
                      {searchField === 'all' ? 'All fields' : searchField[0].toUpperCase() + searchField.slice(1)}
                      <Icon name={filterOpen ? 'chevron-up' : 'chevron-down'} size={15} />
                    </button>
                    {filterOpen && (
                      <div className="absolute right-0 top-14 z-[999] w-44 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl">
                        {(['all', 'name', 'username', 'email'] as SearchField[]).map((field) => (
                          <button key={field} type="button" onClick={() => { setSearchField(field); setFilterOpen(false); }} className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition ${searchField === field ? 'bg-[#771050]/10 font-semibold text-[#771050]' : 'hover:bg-secondary'}`}>
                            {field === 'all' ? 'All fields' : field[0].toUpperCase() + field.slice(1)}
                            {searchField === field && <Icon name="check" size={14} className="ml-auto" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="submit" style={{ background: 'linear-gradient(-45deg, #ec5252, #6e1a52)' }} className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white shadow-md shadow-[#6e1a52]/20 transition hover:brightness-105 sm:px-5">
                    <Icon name="search" size={16} />
                    <span className="hidden sm:inline">Search</span>
                  </button>
                </div>
              </form>
              {(search || filter !== 'all') && (
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span>Showing <strong className="text-foreground">{visibleUsers.length}</strong> of {users.length} accounts</span>
                  <button type="button" onClick={() => { setSearch(''); setSearchDraft(''); setFilter('all'); }} className="font-semibold text-[#8c235f] hover:underline">Clear filters</button>
                </div>
              )}
            </div>
          </div>

          {loadError && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{loadError}</div>}
          {loading ? <DirectorySkeleton /> : visibleUsers.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-border bg-card/60 px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f7e5ee] text-[#8c235f]"><Icon name="users" size={25} /></div>
              <h2 className="mt-4 text-lg font-bold">No users found</h2>
              <p className="mt-1 text-sm text-muted-foreground">Try another search or choose a different directory filter.</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {visibleUsers.map((user) => (
                <UserCard
                  key={user.uid}
                  user={user}
                  presence={userPresences[user.uid]}
                  currentAdmin={adminProfile}
                  onProfile={() => openUserProfile(user)}
                  onNotice={() => setNoticeProfile(user)}
                  onConfirm={(action) => setConfirm({ profile: user, action })}
                />
              ))}
            </div>
          )}
        </div>

        {noticeProfile && <NoticePanel profile={noticeProfile} onClose={() => setNoticeProfile(null)} onSent={(message) => { setNoticeProfile(null); showToast(message); }} />}
        {confirm && <ConfirmPanel profile={confirm.profile} action={confirm.action} onClose={() => setConfirm(null)} onConfirm={confirmAction} busy={busy} />}
        {toast && <div className="fixed bottom-5 left-1/2 z-[260] flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-2xl"><Icon name="check" size={16} className="text-emerald-400" />{toast}</div>}
      </SiteShell>
    </AdminGuard>
  );
}

function Metric({ label, value, tone = 'rose' }: { label: string; value: number; tone?: 'rose' | 'green' | 'violet' }) {
  return (
    <div className={`rounded-2xl border px-3 py-2.5 text-center ${tone === 'green' ? 'border-emerald-200/70 bg-emerald-50/70' : tone === 'violet' ? 'border-violet-200/70 bg-violet-50/70' : 'border-rose-200/70 bg-rose-50/70'}`}>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function UserCard({
  user,
  presence,
  currentAdmin,
  onProfile,
  onNotice,
  onConfirm,
}: {
  user: UserProfile;
  presence?: AdminPresence;
  currentAdmin: UserProfile | null;
  onProfile: () => void;
  onNotice: () => void;
  onConfirm: (action: 'add-admin' | 'remove-admin' | 'block' | 'unblock') => void;
}) {
  const status = profileStatus(user);
  const main = isMainAdmin(user.email);
  const assignedAdmin = user.isAdmin === true;
  const adminCanManage = isMainAdmin(currentAdmin?.email);
  const websiteActive = presenceIsOnline(presence);
  const cardTone = status === 'blocked' ? 'from-rose-50/90 via-card to-[#fff1f1]' : status === 'disabled' ? 'from-amber-50/90 via-card to-[#fff8eb]' : assignedAdmin || main ? 'from-violet-50/90 via-card to-[#f8f0ff]' : 'from-[#fff4f7] via-card to-[#f0f4ff]';
  return (
    <article className={`group relative overflow-hidden rounded-[1.75rem] border border-white/90 bg-gradient-to-br ${cardTone} p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#771050]/8 sm:p-5`}>
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/50 blur-2xl transition group-hover:scale-125" />
      <div className="relative flex min-w-0 items-start gap-3.5">
         <UserAvatar profile={user} presence={presence} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onProfile}
              className="truncate text-left text-base font-bold transition hover:text-[#771050] hover:underline"
              aria-label={`Open ${user.name || user.username || 'user'} profile`}
            >
              {user.name || 'Unnamed user'}
            </button>
            {main && <span className="rounded-full bg-[#771050]/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#771050]">Main admin</span>}
            {!main && assignedAdmin && <span className="rounded-full bg-violet-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-violet-700">Admin</span>}
          </div>
          <p className="mt-0.5 truncate text-xs font-medium text-[#8c235f]">@{user.username || 'username'}</p>
          <p className="mt-2 truncate text-xs text-muted-foreground">{user.email || 'No email available'}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${PLAN_TONE[user.plan] ?? PLAN_TONE.free}`}>{PLAN_LABEL[user.plan] ?? 'Free'}</span>
      </div>

      <div className="relative mt-4 flex items-center justify-between border-t border-white/80 pt-3 text-[11px] text-muted-foreground">
         <span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${status === 'blocked' ? 'bg-rose-500' : status === 'disabled' ? 'bg-amber-500' : websiteActive ? 'bg-emerald-500' : 'bg-black'}`} />{status === 'active' ? (websiteActive ? 'Active now' : 'Offline') : status === 'blocked' ? 'Blocked access' : 'Disabled access'}</span>
        <span>{user.credits ?? 0} credits · {displayDate(user.createdAt).replace('Joined ', '')}</span>
      </div>

       <div className="relative mt-3 overflow-x-auto pb-1">
         <div className="flex min-w-max gap-2">
        <ActionButton icon="eye" label="Profile" onClick={onProfile} />
        <ActionButton icon={main || assignedAdmin ? 'minus' : 'plus'} label={main ? 'Main admin' : assignedAdmin ? 'Remove admin' : 'Admin'} disabled={main || !adminCanManage} onClick={() => onConfirm(assignedAdmin ? 'remove-admin' : 'add-admin')} />
        <ActionButton icon="send" label="Notice" onClick={onNotice} />
        <ActionButton icon={status === 'blocked' ? 'check' : 'ban'} label={status === 'blocked' ? 'Unblock' : 'Block'} disabled={main || !adminCanManage} onClick={() => onConfirm(status === 'blocked' ? 'unblock' : 'block')} />
         </div>
      </div>
    </article>
  );
}

 function ActionButton({ icon, label, onClick, disabled = false }: { icon: 'eye' | 'minus' | 'plus' | 'send' | 'check' | 'ban'; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} style={{ background: 'linear-gradient(-45deg, #ec5252, #6e1a52)' }} className="flex h-10 w-auto shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-white/30 px-3 text-[11px] font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45">
      <Icon name={icon} size={14} />
      <span className="truncate">{label}</span>
    </button>
  );
}