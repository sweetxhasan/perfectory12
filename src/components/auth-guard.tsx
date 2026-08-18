import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { PageSkeleton } from './page-skeleton';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading, accountDisabled } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) { setLocation('/login'); return; }
    if (!user.emailVerified) { setLocation('/verify-email'); return; }
    if (accountDisabled) { setLocation('/account-disabled'); }
  }, [loading, user, accountDisabled, setLocation]);

  /* Firebase resolving — show full-page shimmer skeleton */
  if (loading) return <PageSkeleton />;

  /* Unauthenticated — redirect is already triggered above, render nothing */
  if (!user) return null;

  /* Email not verified — redirect triggered above */
  if (!user.emailVerified) return null;

  /* Disabled — redirect triggered above */
  if (accountDisabled || profile?.isDisabled) return null;

  return <>{children}</>;
}
