import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { AdminGuard } from '@/components/admin-guard';
import { SiteShell } from '@/components/site-shell';
import { Icon } from '@/components/icon';
import { VerifiedBadge } from '@/components/verified-badge';
import { useAuth } from '@/lib/auth-context';
import { Timestamp } from 'firebase/firestore';
import {
  subscribeAdminConversations,
  subscribeMessages,
  subscribePresence,
  subscribeTyping,
  sendChatMessage,
  markConversationRead,
  setPresence,
  setTyping,
  closeChat,
  type ChatMessage,
  type AdminPresence,
  type Conversation,
  type TypingUser,
} from '@/lib/chat';

/* ── Time helpers ──────────────────────────────────────────── */
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
  return p.lastSeen ? Math.floor((Date.now() - p.lastSeen.toDate().getTime()) / 60000) : null;
}

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

/* ── Shimmer ───────────────────────────────────────────────── */
const Sk = ({ className = '' }: { className?: string }) => (
  <div className={`animate-shimmer rounded-xl ${className}`} />
);

/* ── Typing indicator ──────────────────────────────────────── */
function TypingIndicator({ typers }: { typers: TypingUser[] }) {
  if (typers.length === 0) return null;
  const [t] = typers;
  return (
    <div className="flex items-center gap-2 px-1 py-1">
      <div className="flex items-center gap-1.5 rounded-2xl border border-border/60 bg-card/80 px-3 py-1.5 shadow-sm">
        <span className="flex gap-0.5">
          {[0, 150, 300].map((d) => (
            <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${d}ms` }} />
          ))}
        </span>
        <span className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{t.displayName}</span> is typing…
        </span>
      </div>
    </div>
  );
}

/* ── Message bubble ────────────────────────────────────────── */
function MsgBubble({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
  return (
    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMe && (
        <img
          src={msg.senderPhoto || `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${msg.senderName}`}
          alt={msg.senderName}
          className="mb-4 h-6 w-6 flex-shrink-0 self-end rounded-full object-cover ring-1 ring-border"
        />
      )}
      <div className={`flex max-w-[78%] flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && (
          <span className="px-1 text-[10px] text-muted-foreground">{msg.senderName}</span>
        )}
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
            isMe
              ? 'bg-gradient-brand text-primary-foreground'
              : 'border border-border/60 bg-card text-foreground'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
        </div>
        <span className="px-1 text-[10px] text-muted-foreground/60">
          {fmtMsgTime(msg.createdAt)}
          {msg.edited && <span className="ml-1 opacity-60">(edited)</span>}
        </span>
      </div>
    </div>
  );
}

/* ── Conversation row in the list ──────────────────────────── */
function ConvRow({
  conv,
  selected,
  userPresence,
  onClick,
}: {
  conv: Conversation;
  selected: boolean;
  userPresence: AdminPresence;
  onClick: () => void;
}) {
  const isOnline = presenceIsOnline(userPresence);
  const unread = conv.adminUnread ?? 0;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
        selected
          ? 'bg-gradient-soft border-r-2 border-brand-2'
          : 'hover:bg-muted/40'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <img
          src={
            conv.userProfile.photoURL ||
            `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${conv.userProfile.name}`
          }
          alt={conv.userProfile.name}
          className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
        />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
            isOnline ? 'bg-emerald-500' : 'bg-zinc-400'
          }`}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-sm font-medium">{conv.userProfile.name}</span>
          <span className="flex-shrink-0 text-[10px] text-muted-foreground">
            {fmtRelTime(conv.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="truncate text-xs text-muted-foreground">{conv.lastMessage || '—'}</p>
          <div className="flex-shrink-0 flex items-center gap-1">
            {conv.closedAt && (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Closed
              </span>
            )}
            {!conv.closedAt && unread > 0 && (
              <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-gradient-brand px-1 text-[9px] font-bold text-primary-foreground">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ── Chat panel (right side) ───────────────────────────────── */
function ChatPanel({
  conv,
  adminProfile,
  onBack,
}: {
  conv: Conversation;
  adminProfile: { uid: string; name: string; photoURL: string };
  onBack: () => void;
}) {
  const convId = conv.id;
  const isClosed = !!conv.closedAt;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userPresence, setUserPresence] = useState<AdminPresence>({ online: false, lastSeen: null });
  const [typers, setTypers] = useState<TypingUser[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitialRef = useRef(true);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  /* reset on conv change */
  useEffect(() => { isInitialRef.current = true; }, [convId]);

  /* subscriptions */
  useEffect(() => subscribeMessages(convId, setMessages), [convId]);
  useEffect(() => subscribePresence(conv.userId, setUserPresence), [conv.userId]);
  useEffect(() => subscribeTyping(convId, adminProfile.uid, setTypers), [convId, adminProfile.uid]);
  useEffect(() => { markConversationRead(convId, true); }, [convId]);

  /* admin heartbeat */
  useEffect(() => {
    setPresence(adminProfile.uid, true);
    const t = setInterval(() => setPresence(adminProfile.uid, true), 60_000);
    return () => {
      clearInterval(t);
      setPresence(adminProfile.uid, false);
    };
  }, [adminProfile.uid]);

  /* smart scroll */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || messages.length === 0) return;
    if (isInitialRef.current) {
      el.scrollTop = el.scrollHeight;
      isInitialRef.current = false;
    } else {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (nearBottom) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  /* cleanup typing on unmount */
  useEffect(() => {
    return () => {
      setTyping(convId, adminProfile.uid, false, adminProfile.name, true);
    };
  }, [convId, adminProfile.uid, adminProfile.name]);

  const growTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, []);

  function handleTypingStart() {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setTyping(convId, adminProfile.uid, true, adminProfile.name, true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      setTyping(convId, adminProfile.uid, false, adminProfile.name, true);
    }, 3000);
  }

  function clearTyping() {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      setTyping(convId, adminProfile.uid, false, adminProfile.name, true);
    }
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || isClosed) return;
    clearTyping();
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setSending(true);
    try {
      await sendChatMessage(convId, adminProfile.uid, adminProfile.name, adminProfile.photoURL, trimmed, true);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) { e.preventDefault(); handleSend(); }
  }

  async function handleClose() {
    if (!window.confirm('Close this conversation? The user won\'t be able to reply.')) return;
    setClosing(true);
    try {
      await closeChat(convId, adminProfile.name);
    } finally {
      setClosing(false);
    }
  }

  const isOnline = presenceIsOnline(userPresence);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-brand-2 hover:text-brand-2 md:hidden"
          aria-label="Back"
        >
          <Icon name="arrow-left" size={16} />
        </button>

        <div className="relative flex-shrink-0">
          <img
            src={
              conv.userProfile.photoURL ||
              `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${conv.userProfile.name}`
            }
            alt={conv.userProfile.name}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-border"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
              isOnline ? 'bg-emerald-500' : 'bg-zinc-400'
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{conv.userProfile.name}</p>
          <p className={`text-xs font-medium ${isOnline ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            {fmtPresence(userPresence)}
          </p>
        </div>

        {!isClosed && (
          <button
            onClick={handleClose}
            disabled={closing}
            className="flex-shrink-0 flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
          >
            {closing
              ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-destructive/40 border-t-destructive" />
              : <Icon name="ban" size={13} />
            }
            Close
          </button>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No messages yet. Say hello!
            </div>
          )}
          {messages.map((msg) => (
            <MsgBubble key={msg.id} msg={msg} isMe={msg.senderId === adminProfile.uid} />
          ))}
          {typers.length > 0 && <TypingIndicator typers={typers} />}
        </div>
      </div>

      {/* Footer */}
      {isClosed ? (
        <div className="border-t border-border/70 bg-background/90 px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 rounded-2xl border border-border/60 bg-secondary/40 px-5 py-3 text-sm text-muted-foreground">
            <Icon name="ban" size={14} className="shrink-0" />
            Chat closed by <span className="font-semibold text-foreground">{conv.closedBy ?? 'Admin'}</span>
          </div>
        </div>
      ) : (
        <div className="border-t border-border/70 bg-background/90 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <div className="relative flex flex-1 items-end rounded-2xl border border-input bg-card transition focus-within:border-brand-2 focus-within:ring-2 focus-within:ring-brand-2/20">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  growTextarea();
                  if (e.target.value.trim()) handleTypingStart(); else clearTyping();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Reply to user…"
                rows={1}
                className="min-h-[44px] max-h-[140px] flex-1 resize-none bg-transparent px-4 py-[11px] text-sm leading-[22px] outline-none placeholder:text-muted-foreground/50"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-[0_2px_10px_oklch(0.60_0.18_22/0.35)] transition hover:opacity-90 active:scale-[0.96] disabled:opacity-50"
              aria-label="Send"
            >
              {sending
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                : <Icon name="send" size={16} />}
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

/* ── Empty state (no conv selected) ───────────────────────── */
function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-gradient-soft">
        <Icon name="chat" size={24} className="text-brand-2" />
      </div>
      <p className="text-sm font-medium text-foreground">Select a conversation</p>
      <p className="text-xs text-muted-foreground">Choose a user from the left to view and reply to their messages.</p>
    </div>
  );
}

/* ── Admin Chat inner (after auth guard resolves) ─────────── */
function AdminChatInner() {
  const { profile } = useAuth();
  const params = useParams<{ chatId: string }>();
  const routeChatId = (params as { chatId?: string }).chatId;
  const [, setLocation] = useLocation();

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [userPresences, setUserPresences] = useState<Record<string, AdminPresence>>({});
  const [selectedId, setSelectedId] = useState<string | null>(routeChatId ?? null);
  const [loaded, setLoaded] = useState(false);

  const adminProfile = {
    uid: profile!.uid,
    name: profile!.name,
    photoURL: profile!.photoURL,
  };

  /* subscribe to all conversations for this admin */
  useEffect(() => {
    return subscribeAdminConversations(adminProfile.uid, (cs) => {
      setConvs(cs);
      setLoaded(true);
    });
  }, [adminProfile.uid]);

  /* subscribe to all user presences */
  useEffect(() => {
    if (convs.length === 0) return;
    const unsubs = convs.map((c) =>
      subscribePresence(c.userId, (p) =>
        setUserPresences((prev) => ({ ...prev, [c.userId]: p }))
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [convs]);

  /* sync URL chatId → selectedId */
  useEffect(() => {
    if (routeChatId) setSelectedId(routeChatId);
  }, [routeChatId]);

  function selectConv(id: string) {
    setSelectedId(id);
    setLocation(`/admin/chat/${id}`);
  }

  const selectedConv = convs.find((c) => c.id === selectedId) ?? null;

  /* total unread badge */
  const totalUnread = convs.reduce((sum, c) => sum + (c.adminUnread ?? 0), 0);

  return (
    <div
      className="flex overflow-hidden rounded-2xl border border-border bg-background shadow-sm"
      style={{ height: 'calc(100dvh - 8rem)' }}
    >
      {/* ── Left: conversation list ── */}
      <aside
        className={`flex flex-col border-r border-border/70 bg-background ${
          selectedConv ? 'hidden md:flex md:w-72 lg:w-80' : 'flex w-full md:w-72 lg:w-80'
        }`}
      >
        {/* List header */}
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <Icon name="chat" size={16} className="text-brand-2" />
            <span className="text-sm font-semibold">Conversations</span>
            {totalUnread > 0 && (
              <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-gradient-brand px-1 text-[9px] font-bold text-primary-foreground">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
        </div>

        {/* List body */}
        <div className="flex-1 overflow-y-auto">
          {!loaded ? (
            <div className="flex flex-col gap-0">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Sk className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Sk className="h-3 w-28 rounded-full" />
                    <Sk className="h-2.5 w-40 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : convs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center">
              <Icon name="chat" size={24} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground/60">Users who start a chat will appear here.</p>
            </div>
          ) : (
            <div>
              {convs.map((conv) => (
                <ConvRow
                  key={conv.id}
                  conv={conv}
                  selected={conv.id === selectedId}
                  userPresence={userPresences[conv.userId] ?? { online: false, lastSeen: null }}
                  onClick={() => selectConv(conv.id)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ── Right: chat panel ── */}
      <main className={`flex-1 flex flex-col ${!selectedConv && 'hidden md:flex'}`}>
        {selectedConv ? (
          <ChatPanel
            key={selectedConv.id}
            conv={selectedConv}
            adminProfile={adminProfile}
            onBack={() => {
              setSelectedId(null);
              setLocation('/admin/chat');
            }}
          />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

/* ── Page export ────────────────────────────────────────────── */
export default function AdminChat() {
  return (
    <AdminGuard>
      <SiteShell>
        <AdminChatInner />
      </SiteShell>
    </AdminGuard>
  );
}
