import { Link } from 'wouter';
import { SiteShell } from '@/components/site-shell';
import { Panel, OutlineButton } from '@/components/primitives';
import { Icon } from '@/components/icon';
import { SEOHead } from '@/components/seo-head';
import { PAGE_SEO } from '@/lib/seo-config';

export default function NotFoundPage() {
  return (
    <SiteShell>
      <SEOHead {...PAGE_SEO.notFound} />
      <Panel className="flex flex-col items-center gap-5 p-16 text-center">
        <span className="text-6xl text-gradient font-bold">404</span>
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-soft text-brand">
          <Icon name="soundwave" size={30} />
        </span>
        <div>
          <h1 className="text-2xl">Page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The voice you're looking for seems to have faded away.
          </p>
        </div>
        <Link href="/"><OutlineButton icon="home">Return home</OutlineButton></Link>
      </Panel>
    </SiteShell>
  );
}
