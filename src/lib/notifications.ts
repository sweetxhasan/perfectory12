import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

const NOTIF = 'perfectory_notifications';
const USERS = 'perfectory_users';

export type NotificationTone = 'rose' | 'violet' | 'amber' | 'blue' | 'green';

export type NotificationType =
  | 'welcome'
  | 'profile_update'
  | 'plan_activated'
  | 'plan_deactivated'
  | 'plan_expired'
  | 'daily_credits'
  | 'credit_added'
  | 'credit_deducted'
  | 'payment_submitted'
  | 'payment_approved'
  | 'payment_rejected'
  | 'payment_request_admin'
  | 'admin_notice';

export interface AppNotification {
  id: string;
  uid: string;
  type: NotificationType;
  title: string;
  description: string;
  icon: string;
  tone: NotificationTone;
  read: boolean;
  createdAt: Timestamp | null;
  /** Optional deep-link shown as a "View" button in the notification panel */
  actionUrl?: string;
  actionLabel?: string;
}

/* ── Time formatter ────────────────────────────────── */
export function formatNotificationTime(ts: Timestamp | null): string {
  if (!ts) return '';
  const ms = ts.toMillis?.() ?? 0;
  if (!ms) return '';
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day} days ago`;
  return new Date(ms).toLocaleDateString('en-BD', { day: '2-digit', month: 'short' });
}

/* ── Real-time subscription ─────────────────────────── */
export function subscribeNotifications(
  uid: string,
  cb: (notifs: AppNotification[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(collection(db, NOTIF), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
      // Sort by createdAt desc client-side — avoids needing a composite Firestore index
      rows.sort((a, b) => {
        const ta = (a.createdAt as Timestamp | null)?.toMillis?.() ?? 0;
        const tb = (b.createdAt as Timestamp | null)?.toMillis?.() ?? 0;
        return tb - ta;
      });
      cb(rows.slice(0, 60));
    },
    (error) => onError?.(error),
  );
}

/* ── Mark single notification as read ──────────────── */
export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, NOTIF, id), { read: true });
}

/* ── Mark all notifications read for a user ─────────── */
export async function markAllNotificationsRead(uid: string): Promise<void> {
  const q = query(
    collection(db, NOTIF),
    where('uid', '==', uid),
    where('read', '==', false),
  );
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

/* ── Delete a single notification ───────────────────── */
export async function deleteNotification(id: string): Promise<void> {
  await deleteDoc(doc(db, NOTIF, id));
}

/* ── Delete all notifications for a user ────────────── */
export async function deleteAllNotifications(uid: string): Promise<void> {
  const q = query(collection(db, NOTIF), where('uid', '==', uid));
  const snap = await getDocs(q);
  if (snap.empty) return;
  const BATCH_SIZE = 499;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/* ── Add a notification (internal) ─────────────────── */
async function addNotification(
  uid: string,
  data: Omit<AppNotification, 'id' | 'uid' | 'read' | 'createdAt'>,
): Promise<void> {
  await addDoc(collection(db, NOTIF), {
    uid,
    ...data,
    read: false,
    createdAt: serverTimestamp(),
  });
}

/* ── Notify all admins of a new payment request ─────── */
export async function notifyAdminsNewPayment(
  userName: string,
  plan: string,
  method: string,
): Promise<void> {
  const planLabel = plan === 'monthly' ? 'Monthly Pro' : 'Yearly Premium';
  const methodLabel =
    method === 'bkash' ? 'bKash' : method === 'nagad' ? 'Nagad' : method === 'rocket' ? 'Rocket' : method;

  // Find all users with isAdmin flag
  const q = query(collection(db, USERS), where('isAdmin', '==', true));
  const snap = await getDocs(q);
  const adminUids = snap.docs.map((d) => d.id);

  // Also include hardcoded admins (fetch by email)
  const ADMIN_EMAILS = ['kinghasanbd1@gmail.com'];
  const emailSnap = await Promise.all(
    ADMIN_EMAILS.map((email) =>
      getDocs(query(collection(db, USERS), where('email', '==', email))),
    ),
  );
  emailSnap.forEach((s) =>
    s.docs.forEach((d) => {
      if (!adminUids.includes(d.id)) adminUids.push(d.id);
    }),
  );

  if (adminUids.length === 0) return;

  const batch = writeBatch(db);
  adminUids.forEach((uid) => {
    const ref = doc(collection(db, NOTIF));
    batch.set(ref, {
      uid,
      type: 'payment_request_admin' as NotificationType,
      title: 'New Payment Request',
      description: `${userName} submitted a ${planLabel} payment via ${methodLabel}. Review and approve or reject.`,
      icon: 'credit-card',
      tone: 'amber' as NotificationTone,
      actionUrl: '/admin/payments',
      actionLabel: 'View',
      read: false,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

/* ── Broadcast admin notice to ALL users ─────────────── */
export async function broadcastAdminNotice(
  title: string,
  description: string,
): Promise<void> {
  const usersSnap = await getDocs(collection(db, USERS));
  if (usersSnap.empty) return;

  // Firestore batch limit is 500 ops
  const BATCH_SIZE = 499;
  const uids = usersSnap.docs.map((d) => d.id);

  for (let i = 0; i < uids.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    uids.slice(i, i + BATCH_SIZE).forEach((uid) => {
      const ref = doc(collection(db, NOTIF));
      batch.set(ref, {
        uid,
        type: 'admin_notice' as NotificationType,
        title,
        description,
        icon: 'info',
        tone: 'blue' as NotificationTone,
        read: false,
        createdAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
}

/* ── Send a direct admin notice to a single user ────── */
export async function notifyUserNotice(
  uid: string,
  title: string,
  description: string,
): Promise<void> {
  return addNotification(uid, {
    type: 'admin_notice',
    title,
    description,
    icon: 'info',
    tone: 'violet',
  });
}

/* ── Typed notification helpers ──────────────────────── */

export function notifyWelcome(uid: string): Promise<void> {
  return addNotification(uid, {
    type: 'welcome',
    title: 'Welcome to Perfectory Voice!',
    description:
      'Your account is ready. Generate natural speech in Bangla, English & Hindi instantly.',
    icon: 'star',
    tone: 'violet',
  });
}

export function notifyProfileUpdate(uid: string): Promise<void> {
  return addNotification(uid, {
    type: 'profile_update',
    title: 'Profile Updated',
    description: 'Your profile information has been saved successfully.',
    icon: 'user',
    tone: 'blue',
  });
}

export function notifyPlanActivated(uid: string, plan: string): Promise<void> {
  const label =
    plan === 'monthly' ? 'Monthly Pro' : plan === 'yearly' ? 'Yearly Premium' : 'Free';
  return addNotification(uid, {
    type: 'plan_activated',
    title: `${label} Plan Activated`,
    description: `Your ${label} plan is now active. Enjoy your enhanced credits and features.`,
    icon: 'crown',
    tone: 'violet',
  });
}

export function notifyPlanDeactivated(uid: string): Promise<void> {
  return addNotification(uid, {
    type: 'plan_deactivated',
    title: 'Plan Deactivated',
    description:
      'Your premium plan has been deactivated and you have been moved to the Free plan.',
    icon: 'crown',
    tone: 'amber',
  });
}

export function notifyPlanExpired(uid: string): Promise<void> {
  return addNotification(uid, {
    type: 'plan_expired',
    title: 'Plan Expired',
    description:
      'Your premium plan has expired. Renew anytime from the Plans page to restore full access.',
    icon: 'clock',
    tone: 'amber',
  });
}

export function notifyDailyCredits(uid: string, amount: number): Promise<void> {
  return addNotification(uid, {
    type: 'daily_credits',
    title: 'Daily Credits Added',
    description: `${amount} credit${amount !== 1 ? 's' : ''} have been added to your account for today.`,
    icon: 'bolt',
    tone: 'green',
  });
}

export function notifyCreditAdded(uid: string, amount: number): Promise<void> {
  return addNotification(uid, {
    type: 'credit_added',
    title: 'Bonus Credits Added',
    description: `${amount} bonus credit${amount !== 1 ? 's' : ''} have been added to your account by the admin.`,
    icon: 'bolt',
    tone: 'green',
  });
}

export function notifyCreditDeducted(uid: string, amount: number): Promise<void> {
  return addNotification(uid, {
    type: 'credit_deducted',
    title: 'Credits Deducted',
    description: `${amount} credit${amount !== 1 ? 's' : ''} have been deducted from your account.`,
    icon: 'bolt',
    tone: 'rose',
  });
}

export function notifyPaymentSubmitted(
  uid: string,
  plan: string,
  method: string,
): Promise<void> {
  const label = plan === 'monthly' ? 'Monthly Pro' : 'Yearly Premium';
  const methodLabel =
    method === 'bkash' ? 'bKash' : method === 'nagad' ? 'Nagad' : 'Rocket';
  return addNotification(uid, {
    type: 'payment_submitted',
    title: 'Payment Request Submitted',
    description: `Your ${label} plan payment via ${methodLabel} is under review by the admin.`,
    icon: 'credit-card',
    tone: 'blue',
  });
}

export function notifyPaymentApproved(uid: string, plan: string): Promise<void> {
  const label = plan === 'monthly' ? 'Monthly Pro' : 'Yearly Premium';
  return addNotification(uid, {
    type: 'payment_approved',
    title: 'Payment Approved! 🎉',
    description: `Your ${label} plan payment has been approved. Your plan is now active — enjoy full access!`,
    icon: 'shield',
    tone: 'green',
  });
}

export function notifyPaymentRejected(
  uid: string,
  plan: string,
  note?: string,
): Promise<void> {
  const label = plan === 'monthly' ? 'Monthly Pro' : 'Yearly Premium';
  return addNotification(uid, {
    type: 'payment_rejected',
    title: 'Payment Rejected',
    description: note
      ? `Your ${label} payment was rejected: ${note}`
      : `Your ${label} plan payment could not be verified. Please contact support for help.`,
    icon: 'x',
    tone: 'rose',
  });
}
