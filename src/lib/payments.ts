import {
  collection, doc, addDoc, getDocs, updateDoc,
  query, where, serverTimestamp, onSnapshot, getDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { setPlan, type PlanId } from './user-store';
import {
  notifyPaymentApproved,
  notifyPaymentRejected,
  notifyPaymentSubmitted,
  notifyAdminsNewPayment,
} from './notifications';

export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethodId = 'bkash' | 'nagad' | 'rocket';

const PAYMENTS_COL = 'perfectory_payments';
const CONFIG_COL   = 'perfectory_config';

export interface PaymentRequest {
  id: string;
  uid: string;
  userName: string;
  userEmail: string;
  /** Profile slug — used to build clickable profile links in the admin panel */
  username?: string;
  plan: PlanId;
  method: PaymentMethodId;
  amount: number;
  senderNumber: string;
  transactionId: string;
  status: PaymentStatus;
  createdAt: unknown;
  updatedAt?: unknown;
  rejectionNote?: string;
}

export interface ConfiguredMethod {
  id: string;
  name: string;
  number: string;
  logoUrl?: string;
}

/* ── Static plan prices ─────────────────────────────── */
export const PLAN_AMOUNTS: Record<Exclude<PlanId, 'free'>, number> = {
  monthly: 200,
  yearly: 2000,
};

/* ── Default methods (fallback when admin hasn't configured) */
export const DEFAULT_METHODS: Array<{
  id: PaymentMethodId;
  name: string;
  number: string;
  brandColor: string;
  bgGradient: string;
}> = [
  {
    id: 'bkash',
    name: 'bKash',
    number: '01839125072',
    brandColor: '#E2136E',
    bgGradient: 'linear-gradient(135deg,#E2136E 0%,#b50057 100%)',
  },
  {
    id: 'nagad',
    name: 'Nagad',
    number: '01839125072',
    brandColor: '#F7961C',
    bgGradient: 'linear-gradient(135deg,#F7961C 0%,#e07a00 100%)',
  },
  {
    id: 'rocket',
    name: 'Rocket',
    number: '01839125072',
    brandColor: '#7B2D8B',
    bgGradient: 'linear-gradient(135deg,#7B2D8B 0%,#55007f 100%)',
  },
];

/* ── Firestore helpers ──────────────────────────────── */

/** Returns admin-configured methods or null to use defaults */
export async function getConfiguredMethods(): Promise<ConfiguredMethod[] | null> {
  try {
    const snap = await getDoc(doc(db, CONFIG_COL, 'payment_methods'));
    if (snap.exists()) {
      const data = snap.data() as { methods?: ConfiguredMethod[] };
      if (data.methods && data.methods.length > 0) return data.methods;
    }
  } catch { /* fall through */ }
  return null;
}

/** Live admin payment-method configuration for checkout screens. */
export function subscribeConfiguredMethods(
  cb: (methods: ConfiguredMethod[] | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, CONFIG_COL, 'payment_methods'),
    (snap) => {
      const data = snap.exists() ? (snap.data() as { methods?: ConfiguredMethod[] }) : null;
      cb(data?.methods && data.methods.length > 0 ? data.methods : null);
    },
    (error) => onError?.(error),
  );
}

/** Submit a new payment request (user action) */
export async function submitPaymentRequest(
  data: Omit<PaymentRequest, 'id' | 'status' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, PAYMENTS_COL), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  notifyPaymentSubmitted(data.uid, data.plan, data.method).catch(() => {});
  notifyAdminsNewPayment(data.userName, data.plan, data.method).catch(() => {});
  return ref.id;
}

/** Check if user already has a pending request for a plan */
export async function getUserPendingPayment(
  uid: string,
  plan: PlanId,
): Promise<PaymentRequest | null> {
  const q = query(
    collection(db, PAYMENTS_COL),
    where('uid', '==', uid),
    where('plan', '==', plan),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as PaymentRequest;
}

/** Real-time listener for a single user's own payment requests */
export function subscribeUserPayments(
  uid: string,
  cb: (payments: PaymentRequest[]) => void,
): Unsubscribe {
  const q = query(collection(db, PAYMENTS_COL), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRequest)));
    },
    () => {},
  );
}

/** Real-time listener for all payments (admin) — sorted client-side */
export function subscribeAllPayments(
  cb: (payments: PaymentRequest[]) => void,
): Unsubscribe {
  const q = query(collection(db, PAYMENTS_COL));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRequest));
      rows.sort((a, b) => {
        const ta = (a.createdAt as { toMillis?: () => number } | null)?.toMillis?.() ?? 0;
        const tb = (b.createdAt as { toMillis?: () => number } | null)?.toMillis?.() ?? 0;
        return tb - ta;
      });
      cb(rows);
    },
    () => {},
  );
}

/** Admin: approve → activate plan + mark approved */
export async function approvePayment(payment: PaymentRequest): Promise<void> {
  await setPlan(payment.uid, payment.plan);
  await updateDoc(doc(db, PAYMENTS_COL, payment.id), {
    status: 'approved',
    updatedAt: serverTimestamp(),
  });
  notifyPaymentApproved(payment.uid, payment.plan).catch(() => {});
}

/** Admin: reject with optional note */
export async function rejectPayment(payment: PaymentRequest, note = ''): Promise<void> {
  await updateDoc(doc(db, PAYMENTS_COL, payment.id), {
    status: 'rejected',
    rejectionNote: note,
    updatedAt: serverTimestamp(),
  });
  notifyPaymentRejected(payment.uid, payment.plan, note || undefined).catch(() => {});
}
