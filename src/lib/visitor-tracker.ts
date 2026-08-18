import { db } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

function safeId(str: string) {
  return str.replace(/[.:]/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
}

export function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function trackVisit(): Promise<void> {
  // Track once per browser session only
  if (sessionStorage.getItem('_pv_tracked')) return;
  sessionStorage.setItem('_pv_tracked', '1');

  try {
    const res = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    if (!res.ok) return;
    const { ip } = await res.json() as { ip: string };
    if (!ip) return;

    const date  = getTodayStr();
    const month = getMonthStr();
    const safeIp = safeId(ip);

    await Promise.all([
      // One document per unique IP per day
      setDoc(
        doc(db, 'perfectory_visits', `${safeIp}_${date}`),
        { ip, date, month, lastVisit: serverTimestamp() },
        { merge: true }
      ),
      // All-time unique IPs collection
      setDoc(
        doc(db, 'perfectory_visitor_ips', safeIp),
        { ip, lastVisit: serverTimestamp() },
        { merge: true }
      ),
    ]);
  } catch {
    // Non-critical — silently ignore errors
  }
}
