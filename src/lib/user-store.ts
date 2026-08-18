import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  limit,
  serverTimestamp,
  increment,
  runTransaction,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  notifyWelcome,
  notifyPlanActivated,
  notifyPlanDeactivated,
  notifyPlanExpired,
  notifyDailyCredits,
  notifyCreditAdded,
  notifyCreditDeducted,
} from './notifications';

export interface UserProfile {
  uid: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  photoURL: string;
  bio: string;
  location: string;
  website: string;
  plan: PlanId;
  credits: number;
  planExpiresAt?: Timestamp | null;
  planActivatedAt?: unknown;
  lastDailyAt?: Timestamp | null;   // when daily credits were last granted
  isPublic: boolean;
  phonePublic?: boolean;  // whether phone number is visible on public profile
  isAdmin?: boolean;      // Firestore-assigned admin flag (not the main hardcoded admin)
  isDisabled?: boolean;   // account disabled by admin — blocks all access
  isBlocked?: boolean;    // account blocked by admin — blocks all access
  onboardingDone?: boolean; // whether the onboarding overlay has been completed/dismissed
  useCase?: string;         // how the user plans to use Perfectory Voice (set in onboarding)
  createdAt: unknown;
}

export interface Generation {
  id: string;
  text: string;
  language: string;
  voice: string;
  cost: number;
  audioUrl?: string;   // Supabase CDN URL saved at generation time
  createdAt: unknown;
  expiresAt?: unknown; // Timestamp — set to createdAt + 1 hr
}

export type PlanId = 'free' | 'monthly' | 'yearly';

const USERS = 'perfectory_users';
const GENS = 'perfectory_generations';

/* ── Avatar CDN ─────────────────────────────────────── */
export type AvatarGender = 'male' | 'female';

export function generateAvatarUrl(name: string, gender: AvatarGender = 'male'): string {
  const seed = encodeURIComponent(name.trim() || 'user');
  const style = gender === 'female' ? 'lorelei' : 'adventurer-neutral';
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`;
}

/* ── Username generator from email (unique) ──────────── */
export async function generateUsernameFromEmail(email: string): Promise<string> {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user';
  const snap = await getDocs(query(collection(db, USERS), where('username', '==', base), limit(1)));
  if (snap.empty) return base;
  for (let i = 1; i <= 999; i++) {
    const candidate = `${base}${i}`;
    const s2 = await getDocs(query(collection(db, USERS), where('username', '==', candidate), limit(1)));
    if (s2.empty) return candidate;
  }
  return `${base}${Date.now()}`;
}

/* ── Phone uniqueness check ──────────────────────────── */
export async function isPhoneUsed(phone: string): Promise<boolean> {
  if (!phone) return false;
  const snap = await getDocs(query(collection(db, USERS), where('phone', '==', phone), limit(1)));
  return !snap.empty;
}

/* ── CRUD ─────────────────────────────────────────────── */
export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as UserProfile;
}

/**
 * Live profile listener for the signed-in user.
 * Admin plan, credit, disable, and profile changes are pushed to every open
 * client immediately through Firestore instead of waiting for a refresh.
 */
export function subscribeUserProfile(
  uid: string,
  cb: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, USERS, uid),
    (snap) => {
      cb(snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null);
    },
    (error) => {
      onError?.(error);
    },
  );
}

/** Live directory feed for the admin users workspace. */
export function subscribeAllUserProfiles(
  cb: (profiles: UserProfile[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, USERS),
    (snap) => {
      const rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile);
      rows.sort((a, b) => {
        const ta = (a.createdAt as Timestamp | null)?.toMillis?.() ?? 0;
        const tb = (b.createdAt as Timestamp | null)?.toMillis?.() ?? 0;
        return tb - ta;
      });
      cb(rows);
    },
    (error) => onError?.(error),
  );
}

export async function createProfile(
  uid: string,
  name: string,
  email: string,
  phone: string,
  photoURL: string,
): Promise<UserProfile> {
  const username = await generateUsernameFromEmail(email);
  const profile: Omit<UserProfile, 'uid'> = {
    username,
    name,
    email,
    phone,
    photoURL,
    bio: "I'm a Perfectory voice user.",
    location: '',
    website: '',
    plan: 'free',
    credits: 2,
    planExpiresAt: null,
    lastDailyAt: null,
    isPublic: true,
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, USERS, uid), profile);
  notifyWelcome(uid).catch(() => {});
  return { uid, ...profile };
}

export async function upsertProfile(
  uid: string,
  name: string,
  email: string,
  photoURL: string,
  phone = '',
): Promise<UserProfile> {
  const existing = await getProfile(uid);
  if (existing) {
    if (photoURL && photoURL !== existing.photoURL) {
      await updateDoc(doc(db, USERS, uid), { photoURL });
      return { ...existing, photoURL };
    }
    return existing;
  }
  return createProfile(uid, name, email, phone, photoURL);
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<UserProfile, 'uid' | 'email' | 'plan' | 'credits' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, USERS, uid), data as Record<string, unknown>);
}

/* ── Admin management functions ──────────────────────── */

/** Set or clear the admin flag on any user (main admin only) */
export async function adminSetAdmin(uid: string, value: boolean): Promise<void> {
  await updateDoc(doc(db, USERS, uid), { isAdmin: value });
}

/** Enable or disable a user account */
export async function adminSetDisabled(uid: string, value: boolean): Promise<void> {
  await updateDoc(doc(db, USERS, uid), { isDisabled: value });
}

/** Block or unblock a user account. */
export async function adminSetBlocked(uid: string, value: boolean): Promise<void> {
  await updateDoc(doc(db, USERS, uid), { isBlocked: value });
}

/** Set a user's credits to a specific amount */
export async function adminSetCredits(uid: string, amount: number): Promise<void> {
  await updateDoc(doc(db, USERS, uid), { credits: Math.max(0, Math.round(amount)) });
}

/** Add (or subtract) credits from a user's balance */
export async function adminAddCredits(uid: string, amount: number): Promise<void> {
  const rounded = Math.round(amount);
  await updateDoc(doc(db, USERS, uid), { credits: increment(rounded) });
  if (rounded > 0) {
    notifyCreditAdded(uid, rounded).catch(() => {});
  } else if (rounded < 0) {
    notifyCreditDeducted(uid, Math.abs(rounded)).catch(() => {});
  }
}

/** Admin-level plan change — sets plan + grants today's daily credits */
export async function adminSetPlan(uid: string, planId: PlanId): Promise<void> {
  await setPlan(uid, planId);
  notifyPlanActivated(uid, planId).catch(() => {});
}

/** Update any profile field as admin (bypasses normal restrictions) */
export async function adminUpdateProfile(
  uid: string,
  data: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, USERS, uid), data as Record<string, unknown>);
}

/** Delete all user data — generations + profile document */
export async function adminDeleteUserData(uid: string): Promise<void> {
  const gensSnap = await getDocs(query(collection(db, GENS), where('userId', '==', uid)));
  await Promise.all(gensSnap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, USERS, uid));
}

export async function isUsernameAvailable(username: string, currentUid: string): Promise<boolean> {
  if (!username || username.length < 3) return false;
  const q = query(collection(db, USERS), where('username', '==', username.toLowerCase()), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return true;
  return snap.docs[0].id === currentUid;
}

export async function getProfileByUsername(username: string): Promise<UserProfile | null> {
  const q = query(collection(db, USERS), where('username', '==', username), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return getProfile(username);
  const d = snap.docs[0];
  return { uid: d.id, ...d.data() } as UserProfile;
}

function sortAndExpire(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
  n: number,
  deleteExpired: boolean,
): Generation[] {
  const now = Date.now();
  const fresh: Generation[] = [];

  for (const d of docs) {
    const row = { id: d.id, ...d.data() } as Generation;
    const expMs = (row.expiresAt as Timestamp | null)?.toMillis?.() ?? Infinity;
    if (expMs <= now) {
      // Fire-and-forget deletion; ignore errors
      if (deleteExpired) deleteDoc(doc(db, GENS, d.id)).catch(() => {});
    } else {
      fresh.push(row);
    }
  }

  fresh.sort((a, b) => {
    const ta = (a.createdAt as Timestamp | null)?.toMillis?.() ?? 0;
    const tb = (b.createdAt as Timestamp | null)?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return fresh.slice(0, n);
}

/** One-shot fetch — no composite index needed (sort + expire client-side). */
export async function getGenerations(uid: string, n = 20): Promise<Generation[]> {
  const q = query(collection(db, GENS), where('userId', '==', uid), limit(n + 20));
  const snap = await getDocs(q);
  return sortAndExpire(snap.docs, n, true);
}

/**
 * Real-time listener — calls `cb` immediately and on every change.
 * Expired docs are deleted from Firestore automatically.
 * Returns an unsubscribe function.
 */
export function subscribeGenerations(
  uid: string,
  n: number,
  cb: (gens: Generation[]) => void,
): Unsubscribe {
  const q = query(collection(db, GENS), where('userId', '==', uid), limit(n + 20));
  return onSnapshot(q, (snap) => {
    cb(sortAndExpire(snap.docs, n, true));
  }, () => { /* ignore permission errors */ });
}

/**
 * Usage history listener — shows ALL generation records including expired ones.
 * Unlike subscribeGenerations, this never deletes records; usage history is permanent.
 */
export function subscribeUsageHistory(
  uid: string,
  n: number,
  cb: (gens: Generation[]) => void,
): Unsubscribe {
  const q = query(collection(db, GENS), where('userId', '==', uid), limit(n + 20));
  return onSnapshot(q, (snap) => {
    const all: Generation[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Generation));
    all.sort((a, b) => {
      const ta = (a.createdAt as Timestamp | null)?.toMillis?.() ?? 0;
      const tb = (b.createdAt as Timestamp | null)?.toMillis?.() ?? 0;
      return tb - ta;
    });
    cb(all.slice(0, n));
  }, () => {});
}

export async function deleteGeneration(id: string): Promise<void> {
  await deleteDoc(doc(db, GENS, id));
}

export async function logGeneration(
  uid: string,
  data: { text: string; language: string; voice: string; cost: number; audioUrl?: string },
): Promise<void> {
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)); // +1 hr
  await addDoc(collection(db, GENS), {
    userId: uid,
    ...data,
    createdAt: serverTimestamp(),
    expiresAt,
  });
}

export async function spendCredits(uid: string, cost: number): Promise<void> {
  await updateDoc(doc(db, USERS, uid), { credits: increment(-cost) });
}

/* ── API Request Log ─────────────────────────────────── */
const API_REQUESTS = 'perfectory_api_requests';

export interface ApiRequestLog {
  id: string;
  uid: string;
  userName: string;
  username: string;
  userPhotoURL: string;
  text: string;
  language: string;
  voiceId: string;
  success: boolean;
  error?: string;
  durationMs: number;
  createdAt: Timestamp | null;
}

export async function logApiRequest(
  uid: string,
  data: {
    text: string;
    language: string;
    voiceId: string;
    success: boolean;
    error?: string;
    durationMs: number;
    userName: string;
    username: string;
    userPhotoURL: string;
  },
): Promise<void> {
  await addDoc(collection(db, API_REQUESTS), {
    uid,
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function fetchApiRequests(limitCount = 100): Promise<ApiRequestLog[]> {
  const snap = await getDocs(collection(db, API_REQUESTS));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ApiRequestLog));
  rows.sort((a, b) => {
    const ta = (a.createdAt as Timestamp | null)?.toMillis?.() ?? 0;
    const tb = (b.createdAt as Timestamp | null)?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return rows.slice(0, limitCount);
}

/* ── Plan daily credit amounts ───────────────────────── */
// Each credit = 1 generation. Credits refill daily at BST midnight.
// Free:    2/day  (resets daily)
// Monthly: 5/day  × 30 days
// Yearly:  10/day × 365 days
export const PLAN_DAILY_CREDITS: Record<PlanId, number> = {
  free: 2,
  monthly: 5,
  yearly: 10,
};

// Character limit per generation (word limit × ~5 chars/word)
// Free: 500 words = 2,500 chars
// Monthly: 3,000 words = 15,000 chars
// Yearly: 100,000 words = 500,000 chars
export const PLAN_TEXT_LIMIT: Record<PlanId, number> = {
  free: 2500,
  monthly: 15000,
  yearly: 500000,
};

/* ── Activate / switch plan ──────────────────────────── */
// Only today's daily credits are added on activation.
// Switching plans does NOT stack or add extra credits —
// the new plan's daily rate simply takes over.
export async function setPlan(uid: string, planId: PlanId): Promise<void> {
  const now = new Date();
  let expiresAt: Timestamp | null = null;

  if (planId === 'monthly') {
    expiresAt = Timestamp.fromDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
  } else if (planId === 'yearly') {
    expiresAt = Timestamp.fromDate(new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000));
  }

  const dailyAmount = PLAN_DAILY_CREDITS[planId];

  // Give today's daily credits only. lastDailyAt is set to now
  // so the next claim will be tomorrow.
  await updateDoc(doc(db, USERS, uid), {
    plan: planId,
    credits: dailyAmount,
    planExpiresAt: expiresAt,
    planActivatedAt: serverTimestamp(),
    lastDailyAt: serverTimestamp(),
  });
}

/* ── Daily credit claim ──────────────────────────────── */
// Called each time the profile is loaded. If 24 h have passed
// since lastDailyAt and the plan is still active, add daily credits.
/** Returns a "YYYY-MM-DD" string in Bangladesh Standard Time (UTC+6). */
function getBSTDateKey(date: Date): string {
  const BST_OFFSET_MS = 6 * 60 * 60 * 1000;
  const bstMs = date.getTime() + BST_OFFSET_MS;
  const d = new Date(bstMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function claimDailyCredits(profile: UserProfile): Promise<UserProfile> {
  const dailyAmount = PLAN_DAILY_CREDITS[profile.plan];
  if (!dailyAmount) return profile;

  const now = new Date();
  const lastDaily = profile.lastDailyAt
    ? (profile.lastDailyAt as Timestamp).toDate()
    : null;

  // Grant credits if BST calendar date has changed since last grant
  // (resets at 00:00 Bangladesh Standard Time = 18:00 UTC previous day)
  const alreadyClaimedToday = lastDaily
    ? getBSTDateKey(lastDaily) === getBSTDateKey(now)
    : false;

  if (alreadyClaimedToday) return profile;

  const userRef = doc(db, USERS, profile.uid);
  const result = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) return { granted: false, credits: profile.credits };

    const current = snap.data() as Partial<UserProfile>;
    const storedLastDaily = current.lastDailyAt as Timestamp | null | undefined;
    const claimedToday = storedLastDaily
      ? getBSTDateKey(storedLastDaily.toDate()) === getBSTDateKey(now)
      : false;

    if (claimedToday) {
      return { granted: false, credits: Number(current.credits ?? 0) };
    }

    // Daily reset replaces the previous balance; it never stacks with yesterday's credits.
    transaction.update(userRef, {
      credits: dailyAmount,
      lastDailyAt: serverTimestamp(),
    });
    return { granted: true, credits: dailyAmount };
  });

  if (result.granted) notifyDailyCredits(profile.uid, dailyAmount).catch(() => {});

  return {
    ...profile,
    credits: result.credits,
    lastDailyAt: result.granted ? Timestamp.fromDate(now) : profile.lastDailyAt,
  };
}

/* ── Expire check + daily claim — call after loading profile ── */
export async function checkAndExpirePlan(profile: UserProfile): Promise<UserProfile> {
  // Free plan: no expiry — just claim daily credits
  if (profile.plan === 'free' || !profile.planExpiresAt) {
    return claimDailyCredits(profile);
  }

  const expiresAt = profile.planExpiresAt as Timestamp;

  if (expiresAt.toDate() > new Date()) {
    // Plan still active — try to claim today's daily credits
    return claimDailyCredits(profile);
  }

  // Expired → revert to free (2 starter credits)
  await updateDoc(doc(db, USERS, profile.uid), {
    plan: 'free',
    credits: PLAN_DAILY_CREDITS.free,
    planExpiresAt: null,
    lastDailyAt: null,
  });
  notifyPlanExpired(profile.uid).catch(() => {});
  return { ...profile, plan: 'free', credits: PLAN_DAILY_CREDITS.free, planExpiresAt: null, lastDailyAt: null };
}

/* ── Deactivate plan (user-initiated) ────────────────── */
// Downgrades to free immediately. All current credits are cleared
// and replaced with the free plan's daily allowance.
export async function deactivatePlan(uid: string): Promise<void> {
  await updateDoc(doc(db, USERS, uid), {
    plan: 'free',
    credits: PLAN_DAILY_CREDITS.free,
    planExpiresAt: null,
    planActivatedAt: null,
    lastDailyAt: serverTimestamp(),
  });
  notifyPlanDeactivated(uid).catch(() => {});
}

/* ── Username availability check ─────────────────────── */
export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'too-short';

export async function checkUsernameAvailable(
  username: string,
  currentUid: string,
): Promise<'available' | 'taken' | 'invalid' | 'too-short'> {
  if (username.length < 3) return 'too-short';
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return 'invalid';
  const q = query(collection(db, USERS), where('username', '==', username), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return 'available';
  if (snap.docs[0].id === currentUid) return 'available';
  return 'taken';
}

/* ── Complete onboarding (save username + useCase, set flag) ── */
export async function completeOnboarding(
  uid: string,
  username: string,
  useCase?: string,
): Promise<void> {
  await updateDoc(doc(db, USERS, uid), {
    username,
    ...(useCase ? { useCase } : {}),
    onboardingDone: true,
  });
}

/* ── Plan config from Firebase (prices & labels) ─────── */
export interface PlanConfig {
  monthly_price: string;
  monthly_period: string;
  yearly_price: string;
  yearly_period: string;
  free_price: string;
}

const DEFAULT_PLAN_CONFIG: PlanConfig = {
  free_price: 'Tk 0',
  monthly_price: 'Tk 200',
  monthly_period: 'per month',
  yearly_price: 'Tk 2,000',
  yearly_period: 'per year',
};

export async function getPlanConfig(): Promise<PlanConfig> {
  try {
    const snap = await getDoc(doc(db, 'perfectory_config', 'plans'));
    if (snap.exists()) return { ...DEFAULT_PLAN_CONFIG, ...(snap.data() as Partial<PlanConfig>) };
  } catch { /* ignore — use defaults */ }
  return DEFAULT_PLAN_CONFIG;
}
