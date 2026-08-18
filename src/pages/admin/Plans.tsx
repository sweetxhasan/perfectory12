import { SiteShell } from '@/components/site-shell';
import { AdminGuard } from '@/components/admin-guard';

export default function AdminPlans() {
  return (
    <AdminGuard>
      <SiteShell>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Plans</h1>
          <p className="text-muted-foreground">Configure subscription plans and pricing.</p>
        </div>
      </SiteShell>
    </AdminGuard>
  );
}
