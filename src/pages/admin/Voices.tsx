import { SiteShell } from '@/components/site-shell';
import { AdminGuard } from '@/components/admin-guard';

export default function AdminVoices() {
  return (
    <AdminGuard>
      <SiteShell>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Voices</h1>
          <p className="text-muted-foreground">Manage available voice options.</p>
        </div>
      </SiteShell>
    </AdminGuard>
  );
}
