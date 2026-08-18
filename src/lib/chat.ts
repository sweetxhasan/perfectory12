import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
  increment,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

/* ── Types ───────────────────────────────────────────────── */

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  createdAt: Timestamp | null;
  edited: boolean;
  editedAt: Timestamp | null;
}

export interface Conversation {
  id: string;
  userId: string;
  adminId: string;
  userProfile: { uid: string; name: string; photoURL: string; username: string };
  adminProfile: { uid: string; name: string; photoURL: string; email: string; username: string };
  lastMessage: string;
  lastMessageAt: Timestamp | null;
  adminUnread: number;
  userUnread: number;
  closedAt?: Timestamp | null;
  closedBy?: string;   // display name of the admin who closed the chat
}

export interface AdminPresence {
  online: boolean;
  lastSeen: Timestamp | null;
}

export interface TypingUser {
  uid: string;
  displayName: string;
  isAdmin: boolean;
}

/* ── Collection names ────────────────────────────────────── */
const CHATS = 'perfectory_chats';
const PRESENCE = 'perfectory_presence';
const USERS = 'perfectory_users';

/* ── Conversations ───────────────────────────────────────── */

/**
 * Returns the ID of an existing OPEN conversation between this user and admin,
 * or creates a brand-new one (auto-generated ID) if none exists or all are closed.
 * This allows users to start fresh after a chat has been closed.
 */
export async function getOrCreateConversation(
  userId: string,
  adminId: string,
  userProfile: { uid: string; name: string; photoURL: string; username: string },
  adminProfile: { uid: string; name: string; photoURL: string; email: string; username: string },
): Promise<string> {
  // Query all conversations for this user, filter by adminId + open state client-side
  // (avoids requiring a Firestore composite index)
  const q = query(collection(db, CHATS), where('userId', '==', userId), limit(20));
  const snap = await getDocs(q);
  const openDoc = snap.docs.find((d) => {
    const data = d.data();
    return data.adminId === adminId && !data.closedAt;
  });
  if (openDoc) return openDoc.id;

  // Create a new conversation with an auto-generated ID
  const newRef = await addDoc(collection(db, CHATS), {
    userId,
    adminId,
    userProfile,
    adminProfile,
    lastMessage: 'Hello! How can I help you today? 👋',
    lastMessageAt: serverTimestamp(),
    adminUnread: 0,
    userUnread: 0,
    closedAt: null,
    closedBy: null,
  });

  // Seed a welcome message from the admin
  await addDoc(collection(db, CHATS, newRef.id, 'messages'), {
    text: 'Hello! 👋 Welcome to support. How can I help you today?',
    senderId: adminId,
    senderName: adminProfile.name,
    senderPhoto: adminProfile.photoURL,
    createdAt: serverTimestamp(),
    edited: false,
    editedAt: null,
  });

  return newRef.id;
}

/** Close a conversation — disables messaging on both sides. */
export async function closeChat(cid: string, adminName: string): Promise<void> {
  await updateDoc(doc(db, CHATS, cid), {
    closedAt: serverTimestamp(),
    closedBy: adminName,
    lastMessage: `Chat closed by ${adminName}`,
    lastMessageAt: serverTimestamp(),
  });
}

/* ── Messages ────────────────────────────────────────────── */
export async function sendChatMessage(
  cid: string,
  senderId: string,
  senderName: string,
  senderPhoto: string,
  text: string,
  isFromAdmin: boolean,
): Promise<void> {
  await addDoc(collection(db, CHATS, cid, 'messages'), {
    text,
    senderId,
    senderName,
    senderPhoto,
    createdAt: serverTimestamp(),
    edited: false,
    editedAt: null,
  });

  const preview = text.length > 80 ? `${text.slice(0, 80)}…` : text;
  await updateDoc(doc(db, CHATS, cid), {
    lastMessage: preview,
    lastMessageAt: serverTimestamp(),
    ...(isFromAdmin ? { userUnread: increment(1) } : { adminUnread: increment(1) }),
  });
}

export async function editChatMessage(
  cid: string,
  msgId: string,
  newText: string,
): Promise<void> {
  await updateDoc(doc(db, CHATS, cid, 'messages', msgId), {
    text: newText,
    edited: true,
    editedAt: serverTimestamp(),
  });

  // Also update lastMessage preview if this was the latest
  const preview = newText.length > 80 ? `${newText.slice(0, 80)}…` : newText;
  const convSnap = await getDoc(doc(db, CHATS, cid));
  if (convSnap.exists()) {
    const data = convSnap.data() as Conversation;
    if (data.lastMessage && data.lastMessage.startsWith(preview.slice(0, 20))) {
      await updateDoc(doc(db, CHATS, cid), { lastMessage: preview });
    }
  }
}

export async function markConversationRead(cid: string, isAdmin: boolean): Promise<void> {
  await updateDoc(doc(db, CHATS, cid), {
    ...(isAdmin ? { adminUnread: 0 } : { userUnread: 0 }),
  });
}

/* ── Subscriptions ───────────────────────────────────────── */
export function subscribeMessages(
  cid: string,
  cb: (msgs: ChatMessage[]) => void,
): Unsubscribe {
  const q = query(collection(db, CHATS, cid, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
  });
}

export function subscribeAdminConversations(
  adminId: string,
  cb: (convs: Conversation[]) => void,
): Unsubscribe {
  // NOTE: combining where() + orderBy() on different fields requires a
  // Firestore composite index. To avoid a silent empty-result failure we
  // only filter by adminId here and sort client-side.
  const q = query(
    collection(db, CHATS),
    where('adminId', '==', adminId),
  );
  return onSnapshot(q, (snap) => {
    const convs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation));
    // Sort newest-first on the client
    convs.sort((a, b) => {
      const ta = a.lastMessageAt?.toMillis() ?? 0;
      const tb = b.lastMessageAt?.toMillis() ?? 0;
      return tb - ta;
    });
    cb(convs);
  });
}

export function subscribeConversation(
  cid: string,
  cb: (conv: Conversation | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, CHATS, cid), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Conversation) : null);
  });
}

export function subscribeUserConversations(
  userId: string,
  cb: (convs: Conversation[]) => void,
): Unsubscribe {
  const q = query(collection(db, CHATS), where('userId', '==', userId));
  return onSnapshot(q, (snap) => {
    const convs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation));
    convs.sort((a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0));
    cb(convs);
  });
}

/* ── Presence (works for both admins and users) ──────────── */
export async function setPresence(uid: string, online: boolean): Promise<void> {
  await setDoc(
    doc(db, PRESENCE, uid),
    { online, lastSeen: serverTimestamp() },
    { merge: true },
  );
}

/** @deprecated Use setPresence instead */
export const setAdminPresence = setPresence;

export function subscribePresence(
  uid: string,
  cb: (p: AdminPresence) => void,
): Unsubscribe {
  return onSnapshot(doc(db, PRESENCE, uid), (snap) => {
    cb(snap.exists() ? (snap.data() as AdminPresence) : { online: false, lastSeen: null });
  });
}

/* ── Typing indicators ───────────────────────────────────── */
export async function setTyping(
  cid: string,
  uid: string,
  isTyping: boolean,
  displayName: string,
  isAdminUser: boolean,
): Promise<void> {
  try {
    await setDoc(doc(db, CHATS, cid, 'typing', uid), {
      isTyping,
      displayName,
      isAdmin: isAdminUser,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Silently ignore typing errors — non-critical feature
  }
}

export function subscribeTyping(
  cid: string,
  myUid: string,
  cb: (typers: TypingUser[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, CHATS, cid, 'typing'), (snap) => {
    const typers: TypingUser[] = [];
    snap.docs.forEach((d) => {
      if (d.id === myUid) return; // skip self
      const data = d.data();
      if (data.isTyping) {
        typers.push({ uid: d.id, displayName: data.displayName, isAdmin: data.isAdmin });
      }
    });
    cb(typers);
  });
}

/* ── Fetch admin profiles by email ──────────────────────── */
export async function fetchAdminProfiles(emails: string[]) {
  const results: Array<Record<string, unknown>> = [];
  for (const email of emails) {
    const q = query(collection(db, USERS), where('email', '==', email), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      results.push({ uid: snap.docs[0].id, ...snap.docs[0].data() });
    }
  }
  return results;
}
