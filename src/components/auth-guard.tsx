import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { PageSkeleton } from './page-skeleton';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading, accountDisabled } = useAuth();
  const [, setLocation] = useLocation();
  // A missing field means the profile predates the emailVerified column —
  // treat those legacy accounts as verified so they aren't locked out.
  const isVerified = profile?.emailVerified !== false;

  useEffect(() => {
    if (loading) return;
    if (!user) { setLocation('/login'); return; }
    if (!isVerified) { setLocation('/login'); return; }
    if (accountDisabled) { setLocation('/account-disabled'); }
  }, [loading, user, isVerified, accountDisabled, setLocation]);

  /* Firebase resolving — show full-page shimmer skeleton */
  if (loading) return <PageSkeleton />;

  /* Unauthenticated — redirect is already triggered above, render nothing */
  if (!user) return null;

  /* Email not verified — redirect triggered above (shouldn't happen since
     accounts are only created post-verification, but guards legacy edge cases) */
  if (!isVerified) return null;

  /* Disabled — redirect triggered above */
  if (accountDisabled || profile?.isDisabled) return null;

  return <>{children}</>;
}
