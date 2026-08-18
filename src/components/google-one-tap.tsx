import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';

const CLIENT_ID =
  '1022892255338-qsuleh1npn09rbhisg2enbmfckm93oj9.apps.googleusercontent.com';

/* ── Minimal GIS type shim ───────────────────────────────── */
type GisCb = (r: { credential: string }) => void;
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(cfg: {
            client_id: string;
            callback: GisCb;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: string;
            use_fedcm_for_prompt?: boolean;
          }): void;
          prompt(
            fn?: (n: {
              isNotDisplayed(): boolean;
              isSkippedMoment(): boolean;
            }) => void,
          ): void;
          cancel(): void;
        };
      };
    };
  }
}

/**
 * Renders nothing — mounts Google One Tap as a native browser overlay.
 * Mount on any page where unauthenticated users might land (Home, Login, Signup).
 * Automatically skipped if the user is already signed in.
 */
export function GoogleOneTap() {
  const { user, signInCredential } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) return; // already signed in — do nothing

    function init() {
      const gsi = window.google?.accounts?.id;
      if (!gsi) return;

      gsi.initialize({
        client_id: CLIENT_ID,
        callback: async ({ credential }) => {
          try {
            await signInCredential(credential);
            setLocation('/dashboard');
          } catch (err) {
            console.error('[OneTap] sign-in error:', err);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true, // enables FedCM in Chrome 120+
      });

      gsi.prompt();
    }

    // Script already loaded (e.g. navigating between pages)
    if (window.google?.accounts?.id) {
      init();
      return;
    }

    // Dynamically load the GIS script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.head.appendChild(script);

    return () => {
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [user]); // re-evaluate whenever auth state changes

  return null; // One Tap is a native browser UI — no DOM needed here
}
