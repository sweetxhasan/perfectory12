import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { Icon } from '@/components/icon';
import { VerifiedBadge } from '@/components/verified-badge';
import { useAuth } from '@/lib/auth-context';
import { ADMIN_EMAILS, isAdmin } from '@/lib/admin';
import {
  fetchAdminProfiles,
  getOrCreateConversation,
  sendChatMessage,
  subscribeMessages,
  subscribePresence,
  subscribeConversation,
  subscribeUserConversations,
  markConversationRead,
  setPresence,
  setTyping,
  subscribeTyping,
  type ChatMessage,
  type AdminPresence,
  type Conversation,
  type TypingUser,
} from '@/lib/chat';
import { SiteShell } from '@/components/site-shell';
import { Timestamp } from 'firebase/firestore';

/* ── Time helpers ─────────────────────────────────────────── */
function fmtMsgTime(ts: Timestamp | null): string {
  if (!ts) return '';
  return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtRelTime(ts: Timestamp | null): string {
  if (!ts) return '';
  const mins = Math.floor((Date.now() - ts.toDate().getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return ts.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ageMins(p: AdminPresence): number | null {
  return p.lastSeen
    ? Math.floor((Date.now() - p.lastSeen.toDate().getTime()) / 60000)
    : null;
}

/** True only when genuinely active (online flag + fresh heartbeat < 2 min) */
function presenceIsOnline(p: AdminPresence): boolean {
  if (!p.online) return false;
  const mins = ageMins(p);
  return mins === null || mins < 2;
}

function fmtPresence(p: AdminPresence): string {
  const mins = ageMins(p);
  if (p.online && (mins === null || mins < 2)) return 'Active now';
  if (!p.lastSeen) return 'Offline';
  if (mins !== null && mins < 1) return 'Active now';
  if (mins !== null && mins < 60) return `Offline · ${mins}m ago`;
  const h = mins !== null ? Math.floor(mins / 60) : 0;
  if (h < 24) return `Offline · ${h}h ago`;
  return `Offline · ${Math.floor(h / 24)}d ago`;
}

/* ── Types ───────────────────────────────────────────────── */
interface AdminProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  username: string;
}

type MyProfile = { uid: string; name: string; photoURL: string; username: string };

/* ── Shimmer helper ──────────────────────────────────────── */
const Sk = ({ className = '', style }: { className?: string; style?: CSSProperties }) => (
  <div className={`animate-shimmer rounded-2xl ${className}`} style={style} />
);

/* ── Skeleton for auth loading / conv loading ────────────── */
function LiveChatSkeleton() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-background/80 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Sk className="h-8 w-8 rounded-xl" />
          <Sk className="h-4 w-32 rounded-full" />
        </div>
        <Sk className="h-8 w-28 rounded-xl" />
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 space-y-8">
        {/* Heading */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Sk className="h-6 w-28 rounded-full" />
          <Sk className="h-9 w-72 rounded-xl" />
          <Sk className="h-4 w-64 rounded-full" />
        </div>

        {/* Agent cards */}
        {[0, 1].map((i) => (
          <div key={i} className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center gap-4">
              <Sk className="h-[72px] w-[72px] shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Sk className="h-5 w-36 rounded-full" />
                <Sk className="h-3.5 w-24 rounded-full" />
                <Sk className="h-3 w-48 rounded-full" />
              </div>
              <Sk className="h-10 w-24 shrink-0 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Typing indicator component ──────────────────────────── */
function TypingIndicator({ typers }: { typers: TypingUser[] }) {
  if (typers.length === 0) return null;
  const [typer] = typers;
  return (
    <div className="flex items-center gap-2 px-1 py-1">
      <div className="flex items-center gap-1.5 rounded-2xl border border-border/60 bg-card/80 px-3 py-1.5 shadow-sm">
        <span className="flex gap-0.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: '150ms' }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: '300ms' }} />
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{typer.displayName}</span>
          {typer.isAdmin && <VerifiedBadge size={11} />}
          <span>is typing…</span>
        </span>
      </div>
    </div>
  );
}

/* ── Page root ───────────────────────────────────────────── */
export default function LiveChatPage() {
  const { user, profile, loading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ chatId: string }>();
  const chatId = (params as { chatId?: string }).chatId;

  useEffect(() => {
    if (!loading && !user) setLocation('/login');
    if (!loading && profile && isAdmin(profile.email)) setLocation('/admin/chat');
  }, [loading, user, profile, setLocation]);

  if (loading || !user || !profile) {
    return (
      <SiteShell>
        <LiveChatSkeleton />
      </SiteShell>
    );
  }

  const myProfile: MyProfile = {
    uid: profile.uid,
    name: profile.name,
    photoURL: profile.photoURL,
    username: profile.username,
  };

  /* ── Deep-link: open a specific chat directly ── */
  if (chatId) {
    return (
      <SiteShell>
        <ConvLoader
          convId={chatId}
          myProfile={myProfile}
          onBack={() => setLocation('/live/chat')}
        />
      </SiteShell>
    );
  }

  /* ── Default: agent selection + messages list ── */
  return (
    <SiteShell>
      <SelectAdminView
        myProfile={myProfile}
        onStart={(cid) => setLocation(`/live/chat/${cid}`)}
      />
    </SiteShell>
  );
}

/* ── ConvLoader — loads conv then renders ChatView ────────── */
function ConvLoader({
  convId,
  myProfile,
  onBack,
}: {
  convId: string;
  myProfile: MyProfile;
  onBack: () => void;
}) {
  const [conv, setConv] = useState<Conversation | null | undefined>(undefined);

  useEffect(() => subscribeConversation(convId, (c) => setConv(c ?? null)), [convId]);

  if (conv === undefined) return <LiveChatSkeleton />;
  if (conv === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-muted-foreground">Chat not found.</p>
        <button onClick={onBack} className="text-sm text-brand underline">Go back</button>
      </div>
    );
  }

  return (
    <ChatView
      myProfile={myProfile}
      conv={conv}
      onBack={onBack}
    />
  );
}

/* ── Admin Selection + Messages List ─────────────────────── */
function SelectAdminView({
  myProfile,
  onStart,
}: {
  myProfile: MyProfile;
  onStart: (convId: string) => void;
}) {
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [presences, setPresences] = useState<Record<string, AdminPresence>>({});
  const [starting, setStarting] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [myConvs, setMyConvs] = useState<Conversation[]>([]);

  /* fetch admin profiles */
  useEffect(() => {
    fetchAdminProfiles(ADMIN_EMAILS).then((profiles) => {
      setAdmins(profiles as unknown as AdminProfile[]);
      setFetched(true);
    });
  }, []);

  /* subscribe to all presences (agents + convs) */
  useEffect(() => {
    const allUids = new Set<string>();
    admins.forEach((a) => allUids.add(a.uid));
    myConvs.forEach((c) => allUids.add(c.adminId));
    if (allUids.size === 0) return;
    const unsubs = [...allUids].map((uid) =>
      subscribePresence(uid, (p) => setPresences((prev) => ({ ...prev, [uid]: p }))),
    );
    return () => unsubs.forEach((u) => u());
  }, [admins, myConvs]);

  /* subscribe to user's existing conversations */
  useEffect(() => {
    return subscribeUserConversations(myProfile.uid, setMyConvs);
  }, [myProfile.uid]);

  async function handleStart(admin: AdminProfile) {
    setStarting(admin.uid);
    try {
      const cid = await getOrCreateConversation(
        myProfile.uid,
        admin.uid,
        myProfile,
        { uid: admin.uid, name: admin.name, photoURL: admin.photoURL, email: admin.email, username: admin.username },
      );
      onStart(cid);
    } finally {
      setStarting(null);
    }
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />

      <div className="relative z-10 mx-auto w-full max-w-2xl px-0 py-4 sm:px-0">
        {/* Heading */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-gradient-soft px-3.5 py-1.5 text-xs text-brand">
            <Icon name="chat" size={13} />
            Live Support
          </span>
          <h1 className="mt-4 text-3xl font-semibold">
            Choose your <span className="text-gradient">Support Agent</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Select an agent below and start a real-time conversation.
          </p>
        </div>

        {/* Agent cards */}
        {!fetched ? (
          <div className="flex flex-col gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-3xl border border-border bg-card p-5">
                <div className="flex items-center gap-4">
                  <Sk className="h-[72px] w-[72px] shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Sk className="h-5 w-36 rounded-full" />
                    <Sk className="h-3.5 w-24 rounded-full" />
                    <Sk className="h-3 w-48 rounded-full" />
                  </div>
                  <Sk className="h-10 w-24 shrink-0 rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        ) : admins.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
            No support agents available right now.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {admins.map((admin) => {
              const presence = presences[admin.uid] ?? { online: false, lastSeen: null };
              const isOnline = presenceIsOnline(presence);
              return (
                <div
                  key={admin.uid}
                  className="group relative overflow-hidden rounded-3xl border border-border bg-card p-5 transition hover:border-brand-2/50 hover:shadow-[0_4px_24px_rgba(99,102,241,0.1)]"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-soft opacity-0 transition-opacity group-hover:opacity-100" />

                  {/* Photo + name row */}
                  <div className="relative flex items-center gap-4">
                    <Link href={`/profile/${admin.username}`} className="flex-shrink-0">
                      <img
                        src={admin.photoURL || `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${admin.name}`}
                        alt={admin.name}
                        className="h-[72px] w-[72px] rounded-full object-cover ring-2 ring-border transition hover:ring-brand-2"
                        style={{ borderRadius: '50px' }}
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/profile/${admin.username}`}
                          className="text-base font-semibold leading-tight transition hover:text-brand-2"
                        >
                          {admin.name}
                        </Link>
                        <VerifiedBadge size={16} />
                        <span className="rounded-full border border-border/50 bg-gradient-soft px-2 py-0.5 text-[10px] font-medium text-brand">
                          Support
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-500'}`} />
                        <span className={`text-xs font-medium ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                          {fmtPresence(presence)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="relative mt-3.5 text-sm text-muted-foreground">
                    Here to help with any questions about Perfectory Voice.
                  </p>

                  <button
                    onClick={() => handleStart(admin)}
                    disabled={starting === admin.uid}
                    className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                  >
                    {starting === admin.uid ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                    ) : (
                      <Icon name="chat" size={15} />
                    )}
                    Start Chat
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Messages list ──────────────────────────────── */}
        {myConvs.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Icon name="chat" size={14} />
              Messages
            </h2>
            <div className="flex flex-col gap-2">
              {myConvs.map((conv) => {
                const presence = presences[conv.adminId] ?? { online: false, lastSeen: null };
                const isOnline = presenceIsOnline(presence);
                const unread = conv.userUnread ?? 0;
                return (
                  <Link key={conv.id} href={`/live/chat/${conv.id}`}>
                    <div className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition hover:border-brand-2/50 hover:bg-gradient-soft">
                      {/* Avatar + badge */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={conv.adminProfile.photoURL || `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${conv.adminProfile.name}`}
                          alt={conv.adminProfile.name}
                          className="h-11 w-11 rounded-full object-cover ring-1 ring-border"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${isOnline ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-500'}`}
                        />
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 truncate">
                            <span className="truncate text-sm font-medium">{conv.adminProfile.name}</span>
                            <VerifiedBadge size={13} />
                          </div>
                          <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                            {fmtRelTime(conv.lastMessageAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-muted-foreground">{conv.lastMessage || 'No messages yet'}</p>
                          {conv.closedAt ? (
                            <span className="flex-shrink-0 rounded-full border border-border/60 bg-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Closed
                            </span>
                          ) : unread > 0 ? (
                            <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-brand px-1 text-[10px] font-bold text-primary-foreground">
                              {unread > 99 ? '99+' : unread}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── Chat View ───────────────────────────────────────────── */
function ChatView({
  myProfile,
  conv,
  onBack,
}: {
  myProfile: MyProfile;
  conv: Conversation;
  onBack: () => void;
}) {
  const admin: AdminProfile = {
    uid: conv.adminProfile.uid,
    name: conv.adminProfile.name,
    email: conv.adminProfile.email,
    photoURL: conv.adminProfile.photoURL,
    username: conv.adminProfile.username,
  };
  const convId = conv.id;
  const isClosed = !!conv.closedAt;
  const closedBy = conv.closedBy ?? 'Admin';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [adminPresence, setAdminPresence] = useState<AdminPresence>({ online: false, lastSeen: null });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typers, setTypers] = useState<TypingUser[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  /* reset initial flag when conversation changes */
  useEffect(() => { isInitialLoadRef.current = true; }, [convId]);

  /* subscriptions */
  useEffect(() => subscribeMessages(convId, setMessages), [convId]);
  useEffect(() => subscribePresence(admin.uid, setAdminPresence), [admin.uid]);
  useEffect(() => subscribeTyping(convId, myProfile.uid, setTypers), [convId, myProfile.uid]);
  useEffect(() => { markConversationRead(convId, false); }, [convId]);

  /* heartbeat: announce user is online while this chat is open */
  useEffect(() => {
    setPresence(myProfile.uid, true);
    const timer = setInterval(() => setPresence(myProfile.uid, true), 60_000);
    return () => {
      clearInterval(timer);
      setPresence(myProfile.uid, false);
    };
  }, [myProfile.uid]);

  /* smart scroll: instant on load, only auto-scroll new msgs if already near bottom */
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || messages.length === 0) return;
    if (isInitialLoadRef.current) {
      el.scrollTop = el.scrollHeight;
      isInitialLoadRef.current = false;
    } else {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (nearBottom) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  /* clear typing on unmount / conv change */
  useEffect(() => {
    return () => {
      setTyping(convId, myProfile.uid, false, myProfile.name, false);
    };
  }, [myProfile.uid, myProfile.name, convId]);

  /* auto-grow textarea */
  const growTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  /* typing state management */
  function handleTypingStart() {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setTyping(convId, myProfile.uid, true, myProfile.name, false);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      setTyping(convId, myProfile.uid, false, myProfile.name, false);
    }, 3000);
  }

  function clearTyping() {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      setTyping(convId, myProfile.uid, false, myProfile.name, false);
    }
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || isClosed) return;
    clearTyping();
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setSending(true);
    try {
      await sendChatMessage(convId, myProfile.uid, myProfile.name, myProfile.photoURL, trimmed, false);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // On mobile (touch pointer) Enter inserts a newline — user taps the send button instead
    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) { e.preventDefault(); handleSend(); }
  }

  const isOnline = presenceIsOnline(adminPresence);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-sm"
      style={{ height: 'calc(100dvh - 9.5rem)' }}
    >
      {/* Chat header */}
      <header className="flex items-center gap-3 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-brand-2 hover:text-brand-2"
          aria-label="Back"
        >
          <Icon name="arrow-left" size={18} />
        </button>

        <Link href={`/profile/${admin.username}`} className="relative flex-shrink-0">
          <img
            src={admin.photoURL || `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${admin.name}`}
            alt={admin.name}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-border transition hover:ring-brand-2"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${isOnline ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-500'}`}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/profile/${admin.username}`}
              className="text-sm font-semibold transition hover:text-brand-2 truncate"
            >
              {admin.name}
            </Link>
            <VerifiedBadge size={14} />
            <span className="rounded-full border border-border/50 bg-gradient-soft px-2 py-0.5 text-[10px] text-brand">
              Support
            </span>
          </div>
          <p className={`text-xs font-medium ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
            {fmtPresence(adminPresence)}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} isMe={msg.senderId === myProfile.uid} />
          ))}
          {typers.length > 0 && <TypingIndicator typers={typers} />}
        </div>
      </div>

      {/* Footer */}
      {isClosed ? (
        <div className="border-t border-border/70 bg-background/90 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 rounded-2xl border border-border/60 bg-secondary/40 px-5 py-4 text-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="ban" size={15} className="shrink-0 text-muted-foreground/60" />
              Chat closed by <span className="font-semibold text-foreground">{closedBy}</span>
            </div>
            <p className="text-xs text-muted-foreground/70">
              Start a new chat from the{' '}
              <button onClick={onBack} className="font-medium text-brand-2 underline underline-offset-2 transition hover:opacity-80">
                agents page
              </button>
              .
            </p>
          </div>
        </div>
      ) : (
        <div className="border-t border-border/70 bg-background/90 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <div className="group relative flex flex-1 items-end rounded-2xl border border-input bg-card transition focus-within:border-brand-2 focus-within:ring-2 focus-within:ring-brand-2/20">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  growTextarea();
                  if (e.target.value.trim()) handleTypingStart();
                  else clearTyping();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type a message…"
                rows={1}
                className="min-h-[44px] max-h-[160px] flex-1 resize-none bg-transparent px-4 py-[11px] text-sm leading-[22px] outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-[0_2px_10px_rgba(99,102,241,0.35)] transition hover:opacity-90 active:scale-[0.96] disabled:opacity-50"
              aria-label="Send"
            >
              {sending
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                : <Icon name="send" size={17} />
              }
            </button>
          </div>
          <p className="mx-auto mt-1.5 max-w-2xl text-center text-[10px] text-muted-foreground/50">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Message Bubble ──────────────────────────────────────── */
function MessageBubble({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
  return (
    <div className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMe && (
        <img
          src={msg.senderPhoto || `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${msg.senderName}`}
          alt={msg.senderName}
          className="mb-4 h-7 w-7 flex-shrink-0 self-end rounded-full object-cover ring-1 ring-border"
        />
      )}
      <div className={`flex max-w-[80%] flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && (
          <span className="flex items-center gap-1 px-1 text-xs text-muted-foreground">
            {msg.senderName}
            <VerifiedBadge size={11} />
          </span>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isMe
              ? 'rounded-br-sm bg-gradient-brand text-primary-foreground'
              : 'rounded-bl-sm border border-border bg-card text-foreground'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
        </div>
        <div className={`flex items-center gap-1 px-1 text-[10px] text-muted-foreground/70 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          <span>{fmtMsgTime(msg.createdAt)}</span>
          {msg.edited && <span className="opacity-70">· edited</span>}
        </div>
      </div>
    </div>
  );
}
