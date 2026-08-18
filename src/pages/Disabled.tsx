import { useAuth } from '@/lib/auth-context';
import { Icon } from '@/components/icon';
import { BrandLogo } from '@/components/brand-logo';

export default function DisabledPage() {
  const { logout } = useAuth();

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-background px-4">
      {/* Brand */}
      <div className="mb-2">
        <BrandLogo />
      </div>

      {/* Icon */}
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
        <Icon name="lock" size={40} />
      </div>

      {/* Copy */}
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold">Account Suspended</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your account has been suspended by an administrator. If you believe this is a mistake, please contact our support team.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-secondary px-6 py-2.5 text-sm font-medium transition hover:border-destructive hover:text-destructive"
        >
          <Icon name="logout" size={16} />
          Sign out
        </button>
        <a
          href="mailto:support@perfectory.com"
          className="text-xs text-brand-2 underline underline-offset-2 hover:opacity-80"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
