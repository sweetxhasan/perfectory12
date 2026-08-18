import { Helmet } from 'react-helmet-async';
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, TWITTER_HANDLE } from '@/lib/seo-config';

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  keywords?: string;
  noIndex?: boolean;
  /** JSON-LD structured data object(s) */
  schema?: Record<string, unknown> | Record<string, unknown>[];
}

export function SEOHead({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  keywords,
  noIndex = false,
  schema,
}: SEOHeadProps) {
  const schemas = schema ? (Array.isArray(schema) ? schema : [schema]) : [];

  return (
    <Helmet>
      {/* ── Basic ────────────────────────────────────────────────── */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />
      {canonical && <link rel="canonical" href={canonical} />}

      {/* ── Open Graph ───────────────────────────────────────────── */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical ?? SITE_URL} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${SITE_NAME} — ${description.slice(0, 80)}`} />
      <meta property="og:locale" content="en_US" />

      {/* ── Twitter / X ──────────────────────────────────────────── */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:creator" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={SITE_NAME} />

      {/* ── Structured data (JSON-LD) ────────────────────────────── */}
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
}

// ─── Pre-built schema helpers ─────────────────────────────────────────────

export const SCHEMA_WEBAPP = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: SITE_URL,
  description:
    'AI-powered text-to-speech generator that converts writing into natural voices in Bangla, English and Hindi.',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript. Works in all modern browsers.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free plan includes 10 credits.',
  },
  featureList: [
    'Text to Speech in Bangla',
    'Text to Speech in English',
    'Text to Speech in Hindi',
    '20+ natural AI voices',
    'Browser playback',
    'Audio download',
  ],
  screenshot: DEFAULT_OG_IMAGE,
  creator: {
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
  },
};

export const SCHEMA_ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  sameAs: [],
};

export const SCHEMA_WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/generator?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};
