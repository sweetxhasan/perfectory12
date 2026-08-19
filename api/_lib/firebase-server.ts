import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * A second, server-side named Firebase app instance, used by the OTP
 * endpoints (and any other public serverless function) to talk to
 * Firestore. There is no Firebase Admin SDK/service account configured
 * for this project, so this mirrors exactly how the rest of the app
 * already does unauthenticated Firestore reads/writes straight from the
 * client SDK (e.g. `isEmailUsed`/`isPhoneUsed` in `src/lib/user-store.ts`).
 *
 * Uses the same public `firebaseConfig` as `src/lib/firebase.ts` — these
 * values are not secrets, they're the standard public web SDK config.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyCMKNydjhcNLdKu9Nm-pzgq2pSRGDHVk-4',
  authDomain: 'banglaquiz-sgw69.firebaseapp.com',
  databaseURL: 'https://banglaquiz-sgw69-default-rtdb.firebaseio.com',
  projectId: 'banglaquiz-sgw69',
  storageBucket: 'banglaquiz-sgw69.firebasestorage.app',
  messagingSenderId: '1022892255338',
  appId: '1:1022892255338:web:347505a8ff6d0f1397c213',
};

const APP_NAME = 'server';

const app = getApps().some((a) => a.name === APP_NAME)
  ? getApp(APP_NAME)
  : initializeApp(firebaseConfig, APP_NAME);

export const serverDb = getFirestore(app);
