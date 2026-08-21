import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { isAnyAdmin } from '@/lib/admin';
import { VerifiedBadge } from './verified-badge';
import { BrandLogo } from './brand-logo';
import { Icon, type IconName } from './icon';
import { CutButton, CutFrame, CutPanel, cutClipPath } from './cut-ui';
import { isNewsletterSubscribed } from '@/lib/user-store';
import { subscribeUserConversations, subscribeAdminConversations, setPresence } from '@/lib/chat';
import {
  subscribeNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  formatNotificationTime,
  type AppNotification,
  type NotificationTone,
} from '@/lib/notifications';

interface NavItem { label: string; href: string; icon: IconName; badge?: number }


const guestNav: NavItem[] = [
  { label: 'Home', href: '/', icon: 'home' },
  { label: 'Generate Voice', href: '/generator', icon: 'microphone' },
  { label: 'Plans', href: '/plans', icon: 'crown' },
];

const userNavBase: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { label: 'Generate Voice', href: '/generator', icon: 'microphone' },
  { label: 'Plans', href: '/plans', icon: 'crown' },
];

const adminNavBase: NavItem[] = [
  { label: 'Admin Dashboard', href: '/admin/dashboard', icon: 'dashboard' },
  { label: 'Live Chat', href: '/admin/chat', icon: 'chat' },
  { label: 'Users', href: '/admin/users', icon: 'users' },
  { label: 'Plans', href: '/admin/plans', icon: 'crown' },
  { label: 'Credits', href: '/admin/credits', icon: 'bolt' },
  { label: 'Voices', href: '/admin/voices', icon: 'soundwave' },
  { label: 'API Setting', href: '/admin/api', icon: 'code' },
  { label: 'Payments', href: '/admin/payments', icon: 'credit-card' },
  { label: 'SMTP Server', href: '/admin/smtp', icon: 'mail' },
  { label: 'Settings', href: '/admin/settings', icon: 'settings' },
];

/* ── Shimmer helper (local) ─────────────────────────── */
function Sk({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <div className={`animate-shimmer rounded-2xl ${className}`} style={style} />;
}

export function SiteShell({ children }: { children: ReactNode }) {
  const { user, profile, logout, loading, accountDisabled } = useAuth();
  const [pathname] = useLocation();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  /* ── Unread counts ─────────────────────────────────────── */
  const [userUnread, setUserUnread] = useState(0);
  const [adminUnread, setAdminUnread] = useState(0);

  const admin = isAnyAdmin(profile?.email, profile?.isAdmin);

  /* ── Disabled account redirect ──────────────────────────── */
  useEffect(() => {
    if (accountDisabled && pathname !== '/account-disabled') {
      setLocation('/account-disabled');
    }
  }, [accountDisabled, pathname, setLocation]);
  const isPremium = profile?.plan === 'monthly' || profile?.plan === 'yearly';

  useEffect(() => {
    if (!user || !profile) return undefined;
    if (admin) {
      return subscribeAdminConversations(user.uid, (convs) => {
        setAdminUnread(convs.reduce((a, c) => a + (c.adminUnread ?? 0), 0));
      });
    }
    if (isPremium) {
      return subscribeUserConversations(user.uid, (convs) => {
        setUserUnread(convs.reduce((a, c) => a + (c.userUnread ?? 0), 0));
      });
    }
    return undefined;
  }, [user?.uid, admin, isPremium]);

  // Track unique visitor once per session
  useEffect(() => {
    import('@/lib/visitor-tracker').then(m => m.trackVisit()).catch(() => {});
  }, []);

  // Global presence: mark user online whenever the browser tab is open
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const goOnline  = () => setPresence(uid, true);
    const goOffline = () => setPresence(uid, false);
    const onVisibility = () =>
      document.visibilityState === 'visible' ? goOnline() : goOffline();

    goOnline();
    // Heartbeat every 30s so lastSeen stays fresh while tab is open
    const hb = setInterval(() => {
      if (document.visibilityState === 'visible') goOnline();
    }, 30_000);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', goOffline);

    return () => {
      clearInterval(hb);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', goOffline);
      goOffline();
    };
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time Firestore notification subscription
  useEffect(() => {
    if (!user?.uid) return undefined;
    return subscribeNotifications(user.uid, setNotifications, () => {});
  }, [user?.uid]);

  useEffect(() => {
    if (!menuOpen && !notificationOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen, notificationOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Auto-mark unread notifications as read 2s after panel opens
  useEffect(() => {
    if (!notificationOpen || !user?.uid || unreadCount === 0) return;
    const timer = setTimeout(() => {
      markAllNotificationsRead(user.uid).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [notificationOpen, user?.uid, unreadCount]);

  function handleDeleteNotification(id: string) {
    deleteNotification(id).catch(() => {});
  }

  function handleDeleteAll() {
    if (!user?.uid) return;
    deleteAllNotifications(user.uid).catch(() => {});
    setConfirmDeleteAll(false);
  }

  /* Build nav arrays with live badge counts */
  const nav: NavItem[] = user
    ? [
        ...userNavBase,
        ...(isPremium
          ? [{ label: 'Live Chat', href: '/live/chat', icon: 'chat' as const, badge: userUnread || undefined }]
          : []),
      ]
    : guestNav;

  const adminNav: NavItem[] = adminNavBase.map((item) =>
    item.href === '/admin/chat' && adminUnread > 0
      ? { ...item, badge: adminUnread }
      : item,
  );

  async function handleLogout() {
    await logout();
    setMenuOpen(false);
    setLocation('/');
  }

  return (
    <div className="relative min-h-dvh">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="group relative flex h-10 w-10 items-center justify-center text-foreground transition hover:text-brand-2 lg:hidden"
              aria-label="Open menu"
            >
              <CutFrame variant="outline" cut={9} />
              <Icon name="menu" size={19} className="relative z-10" />
            </button>
            <BrandLogo />
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {loading ? (
              /* Skeleton nav pills while Firebase resolves */
              [92, 128, 72, 88].map((w, i) => (
                <Sk key={i} className="h-9 rounded-xl" style={{ width: w }} />
              ))
            ) : (
              nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`group relative flex items-center gap-2 px-3.5 py-2 text-sm font-medium transition ${active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    <CutFrame variant={active ? 'primary' : 'ghost'} cut={9} />
                    <span className="relative z-10">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="relative z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-brand px-1 text-[10px] font-bold text-primary-foreground">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </nav>

          <div className="flex shrink-0 flex-nowrap items-center gap-2.5">
            {loading ? (
              /* Skeleton right-side while Firebase resolves */
              <>
                {/* Notification loader: bell-sized on mobile, labelled pill on tablet/desktop */}
                <Sk className="h-10 w-10 shrink-0 rounded-full md:hidden" />
                <Sk className="hidden h-8 w-32 shrink-0 rounded-full md:block" />
                {/* Credits loader */}
                <Sk className="hidden h-8 w-28 shrink-0 rounded-full sm:block" />
                <Sk className="h-7 w-16 shrink-0 rounded-full sm:hidden" />
                {/* Profile loader */}
                <Sk className="h-10 w-10 shrink-0 rounded-full" />
              </>
            ) : user && profile ? (
              <>
                {/* Notifications — icon only on mobile, labelled pill from tablet up */}
                <div className="relative" ref={notificationRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationOpen((value) => !value);
                      setMenuOpen(false);
                    }}
                    aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                    aria-expanded={notificationOpen}
                    className="group relative flex h-10 w-10 items-center justify-center text-muted-foreground transition hover:text-brand-2 md:w-auto md:gap-2 md:px-3"
                  >
                    <CutFrame variant="outline" cut={9} />
                    <Icon name="bell" size={18} className={`relative z-10 ${unreadCount > 0 ? 'text-brand-2' : ''}`} />
                    <span className="relative z-10 hidden text-sm md:inline">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-gradient-brand px-1 text-[9px] font-bold leading-none text-primary-foreground shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notificationOpen && (
                    <div className="fixed left-4 right-4 top-[4.5rem] z-30 w-auto float-up md:absolute md:left-auto md:right-0 md:top-12 md:w-[min(22rem,calc(100vw-2rem))]">
                    <CutPanel cut={16} tone="popover" className="shadow-xl" contentClassName="max-h-[calc(100dvh-6rem)] overflow-hidden md:max-h-none">

                      {/* ── Header ── */}
                      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold">Notifications</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {unreadCount > 0 ? `${unreadCount} new • auto-read in 2s` : 'You are all caught up'}
                          </p>
                        </div>
                        {notifications.length > 0 && (
                          confirmDeleteAll ? (
                            /* Inline compact confirm — replaces the button */
                            <CutPanel tone="soft" className="shrink-0" contentClassName="flex items-center gap-0.5 px-1.5 py-0.5">
                              <span className="mr-0.5 text-[10px] font-medium text-destructive/80">Sure?</span>
                              <CutButton
                                type="button"
                                onClick={handleDeleteAll}
                                variant="primary"
                                className="h-7 min-h-7 px-1.5 py-0 text-[10px] text-primary-foreground [background:linear-gradient(-45deg,#ec5252,#6e1a52)]"
                              >
                                Yes
                              </CutButton>
                              <CutButton
                                type="button"
                                onClick={() => setConfirmDeleteAll(false)}
                                variant="ghost"
                                className="h-7 min-h-7 px-1.5 py-0 text-[10px] text-muted-foreground"
                              >
                                No
                              </CutButton>
                            </CutPanel>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteAll(true)}
                              title="Delete all notifications"
                              className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                              </svg>
                              Delete all
                            </button>
                          )
                        )}
                      </div>

                      {/* ── List ── */}
                      <div className="max-h-[22rem] overflow-y-auto overscroll-contain">
                        {notifications.length > 0 ? (
                          <div className="divide-y divide-border/70">
                            {notifications.map((notification) => (
                              <NotificationRow
                                key={notification.id}
                                notification={notification}
                                onDelete={() => handleDeleteNotification(notification.id)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center px-6 py-10 text-center">
                            <div className="relative mb-4">
                              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-soft shadow-inner">
                                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-2">
                                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                                </svg>
                              </div>
                              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[9px] font-bold text-white shadow">✓</span>
                            </div>
                            <p className="text-sm font-semibold text-foreground">You're all caught up!</p>
                            <p className="mt-1.5 max-w-[13rem] text-[11px] leading-relaxed text-muted-foreground">
                              No new notifications right now. We'll ping you when something important happens — plan updates, credits, and more.
                            </p>
                            <div className="mt-4 flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/5 px-3 py-1.5 text-[10px] font-medium text-brand-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="7" height="7" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                              Live — updates appear instantly
                            </div>
                          </div>
                        )}
                      </div>
                    </CutPanel>
                    </div>
                  )}
                </div>

                {/* Credits pill */}
                <Link href="/credits" className="group relative hidden items-center gap-1.5 px-3 py-1.5 text-sm transition sm:flex">
                  <CutFrame variant="outline" cut={9} />
                  <Icon name="bolt" size={15} className="relative z-10 text-brand-2" />
                  <span className="relative z-10 font-medium">{profile.credits}</span>
                  <span className="relative z-10 text-muted-foreground">credits</span>
                </Link>
                <Link href="/credits" className="group relative flex items-center gap-1 px-2.5 py-1.5 text-sm transition sm:hidden">
                  <CutFrame variant="outline" cut={9} />
                  <Icon name="bolt" size={14} className="relative z-10 text-brand-2" />
                  <span className="relative z-10 font-medium leading-none">{profile.credits}</span>
                </Link>

                {/* Avatar / menu button */}
                <div className="relative" ref={menuRef}>
                  <button type="button" onClick={() => {
                    setMenuOpen((v) => !v);
                    setNotificationOpen(false);
                  }}
                    className="group relative flex h-10 w-10 items-center justify-center transition sm:w-auto sm:gap-2 sm:pl-1.5 sm:pr-2.5">
                    <CutFrame variant="outline" cut={9} />
                    <span className="relative z-10"><Avatar profile={profile} size="sm" /></span>
                    <span className="relative z-10 hidden max-w-24 truncate text-sm sm:inline">{profile.name}</span>
                    {admin && <span className="relative z-10 hidden lg:inline-block"><VerifiedBadge size={14} /></span>}
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-12 z-20 w-60 float-up">
                    <CutPanel cut={16} tone="popover" className="shadow-xl">
                      {/* User card */}
                      <div className="flex items-center gap-2.5 border-b border-border px-3 py-3">
                        <Avatar profile={profile} size="sm" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 truncate text-sm font-medium">
                            {profile.name}
                            {admin && <VerifiedBadge size={13} />}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                        </div>
                      </div>
                      <div className="p-1.5">
                        <MenuLink href={`/profile/${profile.username}`} icon="user" onClick={() => setMenuOpen(false)}>My Profile</MenuLink>
                        <MenuLink href="/dashboard" icon="dashboard" onClick={() => setMenuOpen(false)}>Dashboard</MenuLink>
                        <MenuLink href="/profile/edit" icon="pencil" onClick={() => setMenuOpen(false)}>Edit Profile</MenuLink>
                        {admin && (
                          <>
                            <div className="my-1 border-t border-border" />
                            <MenuLink href="/admin/dashboard" icon="shield" onClick={() => setMenuOpen(false)}>
                              <span className="flex items-center gap-1.5">
                                Admin Panel <VerifiedBadge size={12} />
                              </span>
                            </MenuLink>
                          </>
                        )}
                        <div className="my-1 border-t border-border" />
                        <button type="button" onClick={handleLogout}
                          className="flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-sm text-destructive transition hover:bg-destructive/10">
                          <span className="flex-1 text-left">Sign out</span>
                          <Icon name="logout" size={18} className="shrink-0" />
                        </button>
                      </div>
                    </CutPanel>
                    </div>
                  )}
                </div>
              </>
            ) : !loading && (
              <>
                <Link href="/login" className="group relative hidden px-4 py-2 text-sm font-medium transition sm:inline-flex">
                  <CutFrame variant="outline" cut={10} />
                  <span className="relative z-10">Login</span>
                </Link>
                <Link href="/signup" className="group relative inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-foreground transition active:scale-[0.97]">
                  <CutFrame variant="primary" cut={10} />
                  <span className="relative z-10 flex items-center gap-1.5">
                    Get Started <Icon name="arrow-right" size={16} />
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
                <button type="button" onClick={() => setSidebarOpen(false)}
                  className="group absolute left-72 top-4 z-10 flex h-9 items-center gap-1.5 px-3 text-foreground shadow-lg transition hover:text-brand-2" aria-label="Close menu">
                  <CutFrame variant="outline" />
                  <Icon name="close" size={14} className="relative z-10" />
                  <span className="relative z-10 text-xs font-semibold">Close</span>
                </button>
  <aside className="absolute left-0 top-0 h-full w-72 border-r border-border bg-background shadow-2xl overflow-y-auto">
  <div className="p-4">
  <div className="mb-5 flex items-center justify-between">
  <BrandLogo />
  </div>
              <SidebarNav nav={nav} pathname={pathname} onNavigate={() => setSidebarOpen(false)} />
              {admin && (
                <AdminMenuDropdown adminNav={adminNav} pathname={pathname} onNavigate={() => setSidebarOpen(false)} />
              )}
              <SidebarQuickLinks pathname={pathname} onNavigate={() => setSidebarOpen(false)} />
              <SidebarUserCard
                user={user} profile={profile} admin={admin} loading={loading}
                onNavigate={() => setSidebarOpen(false)}
                className="mt-4"
              />
            </div>
          </aside>
        </div>
      )}

      {/* Body */}
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {/* Desktop sidebar */}
        <aside className="sticky top-20 hidden h-[calc(100dvh-6rem)] w-60 shrink-0 overflow-y-auto lg:block">
          <CutPanel cut={22} tone="card" className="h-full" contentClassName="flex h-full flex-col p-3">
            {loading ? (
              /* Skeleton sidebar nav rows */
              <div className="flex flex-col gap-1.5 p-1">
                {[90, 128, 72, 104].map((w, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                    <Sk className="h-5 w-5 shrink-0 rounded-lg" />
                    <Sk className="h-3.5 rounded-full" style={{ width: w }} />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <SidebarNav nav={nav} pathname={pathname} />
                {admin && (
                  <div className="mt-2">
                    <AdminMenuDropdown adminNav={adminNav} pathname={pathname} />
                  </div>
                )}
                <SidebarUserCard user={user} profile={profile} admin={admin} loading={loading} className="mt-4" />
                <SidebarQuickLinks pathname={pathname} />
              </>
            )}
          </CutPanel>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <SiteFooter />
    </div>
  );
}

/* ── Admin dropdown menu (sidebar) ──────────────────── */
function AdminMenuDropdown({
  adminNav,
  pathname,
  onNavigate,
}: {
  adminNav: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(() => adminNav.some(item => pathname.startsWith(item.href)));

  // Auto-open when on admin route
  useEffect(() => {
    if (adminNav.some(item => pathname.startsWith(item.href))) setOpen(true);
  }, [pathname, adminNav]);

  const totalAdminBadge = adminNav.reduce((a, item) => a + (item.badge ?? 0), 0);

  return (
    <div className="mt-2">
      {/* Section separator */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Admin</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`group relative flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium transition ${
          adminNav.some(item => pathname.startsWith(item.href))
            ? 'text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <CutFrame variant={adminNav.some(item => pathname.startsWith(item.href)) ? 'primary' : 'ghost'} cut={9} />
        <Icon name="shield" size={18} className="relative z-10" />
        <span className="relative z-10 flex-1 text-left">Admin Menu</span>
        <span className="relative z-10"><VerifiedBadge size={14} className="mr-0.5" /></span>
        {totalAdminBadge > 0 && (
          <span className="relative z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {totalAdminBadge > 99 ? '99+' : totalAdminBadge}
          </span>
        )}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={15} className="relative z-10" />
      </button>

      {/* Dropdown items */}
      {open && (
        <div className="ml-3 mt-1.5 space-y-1 border-l-2 border-brand/30 pl-3">
          {adminNav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`group relative flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition ${
                  active ? 'text-brand' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CutFrame variant={active ? 'outline' : 'ghost'} cut={7} />
                <span className="relative z-10 flex-1">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="relative z-10 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-gradient-brand px-1 text-[9px] font-bold text-primary-foreground">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
                <Icon name={item.icon} size={15} className="relative z-10 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Sidebar user / guest card ───────────────────────── */
function SidebarUserCard({
  user, profile, admin, loading, onNavigate, className = 'mt-auto',
}: {
  user: ReturnType<typeof useAuth>['user'];
  profile: ReturnType<typeof useAuth>['profile'];
  admin: boolean;
  loading: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <CutPanel cut={18} tone="soft" contentClassName="p-4 text-center">
        {loading ? (
          <div className="flex flex-col items-center gap-2.5">
            <Sk className="h-14 w-14 rounded-full" />
            <Sk className="h-3.5 w-24 rounded-full" />
            <Sk className="h-3 w-16 rounded-full" />
            <Sk className="h-8 w-12 rounded-xl" />
            <Sk className="h-3 w-20 rounded-full" />
          </div>
        ) : user && profile ? (
          <>
            <Avatar profile={profile} size="lg" className="mx-auto mb-2" />
            <p className="flex items-center justify-center gap-1 truncate text-sm font-medium">
              {profile.name}
              {admin && <VerifiedBadge size={14} />}
            </p>
            <div className="mt-2.5 flex items-center justify-between gap-2 text-left">
              <p className="text-xs text-muted-foreground">
                Available credits <span className="ml-1 text-base font-semibold text-gradient">{profile.credits}</span>
              </p>
              <Link href="/plans" onClick={onNavigate} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-2 hover:underline">
                Get more <Icon name="arrow-right" size={13} />
              </Link>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Icon name="crown" size={16} className="shrink-0 text-brand-2" />
            <p className="flex-1 text-left text-[11px] leading-tight text-muted-foreground">Sign up and get 10 free credits</p>
            <Link href="/signup" onClick={onNavigate} className="group relative inline-flex shrink-0 items-center px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition active:scale-[0.97]">
              <CutFrame variant="primary" cut={6} />
              <span className="relative z-10 whitespace-nowrap">Get started</span>
            </Link>
          </div>
        )}
      </CutPanel>
    </div>
  );
}

/* ����─ Bottom quick-links: About · Contact · Privacy ───�������─ */
const quickLinks: NavItem[] = [
  { label: 'About',   href: '/about',   icon: 'users'  },
  { label: 'Contact', href: '/contact', icon: 'chat'   },
  { label: 'Privacy', href: '/privacy', icon: 'shield' },
];

function SidebarQuickLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="mt-2">
      {/* Divider */}
      <div className="mb-1.5 flex items-center gap-2 px-1">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/40">
          More
        </span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* Compact vertical list — all screen sizes */}
      <div className="flex flex-col gap-1">
        {quickLinks.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={onNavigate}
              className={`group relative flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition
                ${active ? 'text-brand' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <CutFrame variant={active ? 'outline' : 'ghost'} cut={7} />
              <span className="relative z-10 flex-1">{l.label}</span>
              <span className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center">
                <Icon name={l.icon} size={13} />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ── Regular sidebar nav ─────────────────────────────── */
function SidebarNav({ nav, pathname, onNavigate }: { nav: NavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1.5">
      {nav.map((item) => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate}
            className={`group relative flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition ${active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <CutFrame variant={active ? 'primary' : 'ghost'} cut={9} />
            <span className="relative z-10 flex-1">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="relative z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-brand px-1 text-[10px] font-bold text-primary-foreground">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
            <Icon name={item.icon} size={19} className="relative z-10 shrink-0" />
          </Link>
        );
      })}
    </nav>
  );
}

function MenuLink({ href, icon, children, onClick }: { href: string; icon: IconName; children: ReactNode; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-sm transition hover:bg-secondary">
      <span className="flex-1">{children}</span>
      <Icon name={icon} size={18} className="shrink-0 text-muted-foreground" />
    </Link>
  );
}

function NotificationRow({ notification, onDelete }: { notification: AppNotification; onDelete: () => void }) {
  const toneClasses: Record<NotificationTone, string> = {
    rose:   'bg-rose-500/10 text-rose-600 ring-rose-500/15',
    violet: 'bg-violet-500/10 text-violet-600 ring-violet-500/15',
    amber:  'bg-amber-500/10 text-amber-600 ring-amber-500/15',
    blue:   'bg-sky-500/10 text-sky-600 ring-sky-500/15',
    green:  'bg-green-500/10 text-green-600 ring-green-500/15',
  };

  const tone = toneClasses[notification.tone as NotificationTone] ?? toneClasses.blue;
  const isUnread = !notification.read;

  return (
    <div className={`group flex gap-3 px-4 py-3.5 transition hover:bg-secondary/60 ${isUnread ? 'bg-secondary/30' : 'bg-card'}`}>
<CutPanel tone="card" className={`mt-0.5 size-10 shrink-0 ${tone}`} contentClassName={`flex items-center justify-center ${tone}`}>
  <Icon name={notification.icon as IconName} size={19} />
  </CutPanel>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold leading-snug">{notification.title}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            {isUnread && (
              <span className="h-1.5 w-1.5 rounded-full bg-brand-2 mt-0.5" aria-label="Unread" />
            )}
            {/* Delete button — always visible at low opacity, full on hover */}
<button
  type="button"
  onClick={(e) => { e.stopPropagation(); onDelete(); }}
  title="Delete notification"
  className="flex size-7 items-center justify-center rounded-lg text-muted-foreground/40 transition hover:bg-destructive/10 hover:text-destructive group-hover:text-muted-foreground/70"
  aria-label="Delete notification"
  >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
  </button>
  </div>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{notification.description}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground/70">
            {formatNotificationTime(notification.createdAt)}
          </span>
          {notification.actionUrl && (
            <Link
              href={notification.actionUrl}
              className="rounded-md bg-brand-2/10 px-2 py-1 text-[10px] font-semibold text-brand-2 transition hover:bg-brand-2/20"
            >
              {notification.actionLabel ?? 'View'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Avatar({ profile, size, className = '' }: { profile: { photoURL: string; name: string }; size: 'sm' | 'lg'; className?: string }) {
  const sz = size === 'lg' ? 'h-10 w-10' : 'h-10 w-10';
  if (profile.photoURL) {
    return <img src={profile.photoURL} alt={profile.name} className={`${sz} rounded-full object-cover ${className}`} crossOrigin="anonymous" />;
  }
  return (
    <span className={`flex ${sz} items-center justify-center rounded-full bg-gradient-brand text-sm font-medium text-primary-foreground ${className}`}>
      {profile.name?.charAt(0).toUpperCase() || 'U'}
    </span>
  );
}

function NewsletterEmailField({ value, onChange }: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative flex h-10 min-h-10 min-w-0 flex-1 items-center overflow-hidden sm:h-14 sm:min-h-14">
      <CutFrame />
      <span className="relative z-10 pl-4"><Icon name="mail" size={18} /></span>
      <input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="your@email.com"
        autoComplete="email"
        aria-label="Newsletter email address"
        className="relative z-10 min-w-0 flex-1 bg-transparent px-2.5 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/55 sm:px-3.5"
      />
    </div>
  );
}

function SiteFooter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setErrMsg('Please enter a valid email address.'); return; }
    setStatus('loading'); setErrMsg('');
    try {
      if (await isNewsletterSubscribed(trimmed)) {
        setStatus('error');
        setErrMsg('This email is already subscribed.');
        return;
      }
      const { db } = await import('../lib/firebase');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'perfectory_newsletter'), { email: trimmed, canonicalEmail: trimmed.replace(/^(.*?)@gmail\\.com$/i, (_, local) => `${local.replace(/\\./g, '')}@gmail.com`), subscribedAt: serverTimestamp() });
      setStatus('success'); setEmail('');
    } catch { setStatus('error'); setErrMsg('Something went wrong. Please try again.'); }
  }

  return (
    <footer className="relative mt-10 border-t border-border bg-card/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <BrandLogo />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Natural text-to-voice in Bangla, English &amp; Hindi. Create, listen and download in seconds.
            </p>
          </div>
          <div className="max-w-sm w-full">
            <h4 className="text-sm font-semibold">Newsletter</h4>
            <p className="mt-1 text-xs text-muted-foreground">Get updates, tips and new feature announcements.</p>
            {status === 'success' ? (
              <CutPanel tone="soft" className="mt-3" contentClassName="flex items-center gap-2 px-4 py-3 text-sm text-emerald-600">
                <Icon name="check" size={16} />
                <span>Thank you for subscribing.</span>
              </CutPanel>
            ) : (
              <form onSubmit={handleSubscribe} className="mt-3 flex w-full min-w-0 items-center gap-2">
                <NewsletterEmailField
                  value={email}
                  onChange={(value) => { setEmail(value); setErrMsg(''); setStatus('idle'); }}
                />
                <CutButton type="submit" variant="primary" disabled={status === 'loading'} aria-label="Subscribe to newsletter" className="h-10 min-h-10 shrink-0 px-2.5 py-2 text-[11px] text-primary-foreground sm:h-14 sm:min-h-14 sm:px-4 sm:py-3 sm:text-sm">
                  {status === 'loading' ? 'Checking...' : 'Subscribe'}
                </CutButton>
              </form>
            )}
            {errMsg && (
              <CutPanel tone="soft" className="mt-2" contentClassName="px-3 py-2 text-xs text-destructive" role="alert">
                {errMsg}
              </CutPanel>
            )}
          </div>
        </div>
        <div className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-8">
          <FooterCol title="Products" links={[
            { label: 'Voice Generator', href: '/generator' },
            { label: 'Plans', href: '/plans' },
            { label: 'Dashboard', href: '/dashboard' },
          ]} />
          <FooterCol title="Company" links={[
            { label: 'About Us', href: '/about' },
            { label: 'FAQ', href: '/faq' },
            { label: 'Contact', href: '/contact' },
          ]} />
          <FooterCol title="Support" links={[
            { label: 'Help Center', href: '/faq' },
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
          ]} />
        </div>
        <div className="mt-8 border-t border-border pt-5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Perfectory Voice. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-3 flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-xs text-muted-foreground transition hover:text-brand-2 sm:text-sm">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
