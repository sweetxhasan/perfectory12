import { SiteShell } from '@/components/site-shell';
import { AdminGuard } from '@/components/admin-guard';

export default function AdminCredits() {
  return (
    <AdminGuard>
      <SiteShell>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Credits</h1>
          <p className="text-muted-foreground">Manage user credit balances.</p>
        </div>
      </SiteShell>
    </AdminGuard>
  );
}
