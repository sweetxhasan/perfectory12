import { SiteShell } from '@/components/site-shell';
import { AdminGuard } from '@/components/admin-guard';

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <SiteShell>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of platform activity.</p>
        </div>
      </SiteShell>
    </AdminGuard>
  );
}
