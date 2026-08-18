import { type ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { isAdmin } from '@/lib/admin';
import { PageSkeleton } from './page-skeleton';

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  /* Firebase resolving — show full-page shimmer skeleton */
  if (loading) return <PageSkeleton />;

  if (!user || !profile || !isAdmin(profile.email)) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
