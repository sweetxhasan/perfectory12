import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  signOut,
  updateProfile as fbUpdateProfile,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { getProfile, subscribeUserProfile, upsertProfile, generateAvatarUrl, isPhoneUsed, isEmailUsed, checkAndExpirePlan, type AvatarGender, type UserProfile } from './user-store';

interface SignUpParams {
  email: string;
  password: string;
  name: string;
  phone: string;
  gender: AvatarGender;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  accountDisabled: boolean;
  signInEmail: (email: string, password: string) => Promise<UserProfile | null>;
  signInGoogle: (onAccountSelected?: () => void) => Promise<void>;
  signInCredential: (idToken: string) => Promise<void>;
  signUpEmail: (params: SignUpParams) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const accountDisabled = !!(user && profile?.isDisabled);

  useEffect(() => {
    let stopProfile: (() => void) | null = null;
    let generation = 0;
    let disposed = false;

    const unsub = onAuthStateChanged(auth, async (u) => {
      const currentGeneration = ++generation;
      stopProfile?.();
      stopProfile = null;
      setUser(u);
      if (u) {
        setLoading(true);
        try {
          const raw = await getProfile(u.uid);
          const p = raw ? await checkAndExpirePlan(raw) : null;
          if (disposed || currentGeneration !== generation) return;
          setProfile(p);
        } catch {
          if (disposed || currentGeneration !== generation) return;
          setProfile(null);
        }
        if (disposed || currentGeneration !== generation) return;

        stopProfile = subscribeUserProfile(
          u.uid,
          (nextProfile) => {
            if (!disposed && currentGeneration === generation) {
              setProfile(nextProfile);
              setLoading(false);
            }
          },
          () => {
            if (!disposed && currentGeneration === generation) setLoading(false);
          },
        );
      } else {
        setProfile(null);
      }
      if (!disposed && currentGeneration === generation) setLoading(false);
    });

    return () => {
      disposed = true;
      stopProfile?.();
      unsub();
    };
  }, []);

  async function signInEmail(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const p = await upsertProfile(
      cred.user.uid,
      cred.user.displayName ?? email.split('@')[0],
      email,
      cred.user.photoURL ?? '',
    );
    setProfile(p);
    return p;
  }

  /**
   * `onAccountSelected` fires the instant the Google account picker closes
   * with a chosen account (signInWithPopup resolved) — before the
   * Firestore profile upsert that follows. Login/Signup use it to hand the
   * "loading" look off from the Google button to the main submit button
   * for this final step.
   */
  async function signInGoogle(onAccountSelected?: () => void) {
    const cred = await signInWithPopup(auth, googleProvider);
    onAccountSelected?.();
    const avatarUrl = cred.user.photoURL ?? generateAvatarUrl(cred.user.displayName ?? 'User', 'male');
    // Google already verifies the email address, so new profiles are marked verified immediately.
    const p = await upsertProfile(
      cred.user.uid,
      cred.user.displayName ?? 'User',
      cred.user.email ?? '',
      avatarUrl,
      '',
      true,
    );
    setProfile(p);
  }

  /** Sign in using a raw Google ID token — used by One Tap. */
  async function signInCredential(idToken: string) {
    const fbCred = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, fbCred);
    const avatarUrl =
      result.user.photoURL ??
      generateAvatarUrl(result.user.displayName ?? 'User', 'male');
    // Google already verifies the email address, so new profiles are marked verified immediately.
    const p = await upsertProfile(
      result.user.uid,
      result.user.displayName ?? 'User',
      result.user.email ?? '',
      avatarUrl,
      '',
      true,
    );
    setProfile(p);
  }

  /**
   * Creates the Firebase Auth account and Firestore profile right away —
   * marked emailVerified: false. The caller is signed in immediately after
   * (createUserWithEmailAndPassword does this automatically) and is expected
   * to redirect to /verify/email, where the OTP flow finishes the job by
   * flipping emailVerified to true.
   */
  async function signUpEmail({ email, password, name, phone, gender }: SignUpParams) {
  // Check phone uniqueness before creating account
  if (phone) {
  const phoneUsed = await isPhoneUsed(phone);
  if (phoneUsed) throw new Error('phone-already-in-use');
  }
  // Check email uniqueness (Gmail dot-trick aware) before creating account —
  // hasan@gmail.com, h.asan@gmail.com, has.an@gmail.com etc. are one account.
  const emailUsed = await isEmailUsed(email);
  if (emailUsed) throw new Error('email-already-in-use');
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const photoURL = generateAvatarUrl(name, gender);
    await fbUpdateProfile(cred.user, { displayName: name, photoURL });
    const p = await upsertProfile(cred.user.uid, name, email, photoURL, phone, false);
    setProfile(p);
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile() {
    if (!user) return;
    const raw = await getProfile(user.uid);
    const p = raw ? await checkAndExpirePlan(raw) : null;
    setProfile(p);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, accountDisabled, signInEmail, signInGoogle, signInCredential, signUpEmail, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
