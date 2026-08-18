import { Link } from 'wouter';
import { SiteShell } from '@/components/site-shell';
import { LineBg } from '@/components/line-bg';
import { Icon } from '@/components/icon';
import { Panel, SectionBadge } from '@/components/primitives';
import { SEOHead } from '@/components/seo-head';
import { PAGE_SEO } from '@/lib/seo-config';

const sections = [
  {
    id: 'information-we-collect',
    title: '1. Information We Collect',
    content: [
      {
        sub: 'Account information',
        text: 'When you register, we collect your name, email address, phone number (optional), and gender (used to generate a default avatar). If you sign in with Google, we receive your name, email, and profile picture from Google.',
      },
      {
        sub: 'Usage data',
        text: 'We log metadata about your voice generations — including the language selected, the voice style used, the character count, and the credit cost. We do not store the actual text you typed or the audio output.',
      },
      {
        sub: 'Payment information',
        text: 'Payment is processed by our third-party payment processor. We receive only a transaction confirmation and the plan type — we never receive or store your full card number or CVV.',
      },
      {
        sub: 'Technical data',
        text: 'Standard web server logs including your IP address, browser type, and pages visited. This data is used for security and performance monitoring and is not linked to your account profile.',
      },
      {
        sub: 'Visitor tracking',
        text: 'We count unique visits using a session-based anonymous counter. We do not use third-party analytics trackers like Google Analytics.',
      },
    ],
  },
  {
    id: 'how-we-use-information',
    title: '2. How We Use Your Information',
    content: [
      { sub: 'Service delivery', text: 'To operate your account, process credit usage, manage subscriptions, and deliver generated audio.' },
      { sub: 'Communications', text: 'To send you service-related emails such as email verification, password resets, and important account notices. We do not send marketing emails unless you have subscribed to our newsletter.' },
      { sub: 'Support', text: 'If you contact us, we use your information to respond to and resolve your query.' },
      { sub: 'Security & fraud prevention', text: 'To detect abuse, prevent fraud, and protect the integrity of our service and our users.' },
      { sub: 'Product improvement', text: 'Aggregated, anonymised usage statistics help us understand which features to improve. Individual user data is never used for advertising.' },
    ],
  },
  {
    id: 'data-storage-security',
    title: '3. Data Storage & Security',
    content: [
      { sub: 'Firebase infrastructure', text: 'Your data is stored in Google Firebase (Firestore and Firebase Authentication), hosted on Google Cloud servers. Firebase applies industry-standard encryption at rest and in transit.' },
      { sub: 'Security rules', text: 'Our Firestore security rules ensure that each user can only read and write their own data. Admin-level data access is restricted to verified admin accounts.' },
      { sub: 'Passwords', text: 'Passwords are hashed and salted by Firebase Authentication using Google\'s security standards. We never have access to your plain-text password.' },
      { sub: 'Data retention', text: 'Account data is retained until you delete your account. Generation metadata is retained for up to 90 days to support credit dispute resolution, then automatically deleted.' },
    ],
  },
  {
    id: 'sharing',
    title: '4. Sharing Your Information',
    content: [
      { sub: 'We do not sell your data', text: 'Your personal information is never sold, rented, or traded to any third party for marketing or advertising purposes.' },
      { sub: 'Service providers', text: 'We share limited data with trusted third-party service providers who help us operate the platform (e.g. payment processors, email delivery). These providers are contractually bound to protect your data.' },
      { sub: 'Legal requirements', text: 'We may disclose your information if required by law, court order, or to protect the rights and safety of our users.' },
    ],
  },
  {
    id: 'cookies',
    title: '5. Cookies',
    content: [
      { sub: 'Session cookies', text: 'We use strictly necessary cookies to maintain your login session. These are deleted when you close your browser or log out.' },
      { sub: 'No tracking cookies', text: 'We do not use advertising, tracking, or profiling cookies. We do not use Google Analytics or Facebook Pixel.' },
    ],
  },
  {
    id: 'your-rights',
    title: '6. Your Rights',
    content: [
      { sub: 'Access', text: 'You can view the personal information we hold about you by visiting your Profile page.' },
      { sub: 'Correction', text: 'You can update your name, avatar, and contact details from the Edit Profile page.' },
      { sub: 'Deletion', text: 'You can permanently delete your account and all associated data from the Profile page. Deletion is irreversible.' },
      { sub: 'Data portability', text: 'You can request an export of your account data by contacting us at support@perfectoryvoice.com.' },
      { sub: 'Withdrawal of consent', text: 'You can unsubscribe from our newsletter at any time via the link in any email we send you.' },
    ],
  },
  {
    id: 'childrens-privacy',
    title: '7. Children\'s Privacy',
    content: [
      { sub: '', text: 'Perfectory Voice is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately and we will delete it.' },
    ],
  },
  {
    id: 'changes',
    title: '8. Changes to This Policy',
    content: [
      { sub: '', text: 'We may update this Privacy Policy from time to time. When we make significant changes, we will notify you via email or a prominent notice on the website. The date at the top of this page always shows when the policy was last updated. Continued use of the service after changes constitutes acceptance of the revised policy.' },
    ],
  },
  {
    id: 'contact',
    title: '9. Contact Us',
    content: [
      { sub: '', text: 'If you have questions, concerns, or requests related to this Privacy Policy or your personal data, please contact us at support@perfectoryvoice.com or use the Contact form on our website. We will respond within 48 hours.' },
    ],
  },
];

const highlights = [
  { icon: 'shield', title: 'No Text Storage', desc: 'We never store the text you type for generation.' },
  { icon: 'users', title: 'No Data Selling', desc: 'Your data is never sold to advertisers or third parties.' },
  { icon: 'lock', title: 'Encrypted', desc: 'All data encrypted at rest and in transit via Firebase.' },
  { icon: 'close', title: 'No Tracking', desc: 'No Google Analytics. No advertising cookies.' },
];

export default function PrivacyPage() {
  return (
    <SiteShell>
      <SEOHead {...PAGE_SEO.privacy} />
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
        <LineBg />
        <div className="relative px-6 py-12 text-center sm:px-10 sm:py-16">
          <div className="flex justify-center">

          </div>
          <h1 className="mt-5 text-balance text-4xl leading-tight sm:text-5xl">
            Your privacy is <span className="text-gradient">our priority</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            We believe privacy is a right, not a feature. This policy explains what we collect, why, and how we protect it.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Last updated: July 2026</p>
        </div>
      </section>

      {/* ── Privacy highlights ────────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {highlights.map((h) => (
          <Panel key={h.title} className="flex flex-col items-center gap-2.5 p-5 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-soft text-brand">
              <Icon name={h.icon as any} size={20} />
            </span>
            <p className="text-sm font-semibold">{h.title}</p>
            <p className="text-xs text-muted-foreground">{h.desc}</p>
          </Panel>
        ))}
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-4">
        {/* TOC sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Panel className="p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Contents</p>
              <nav className="flex flex-col gap-0.5">
                {sections.map(s => (
                  <a key={s.id} href={`#${s.id}`}
                    className="rounded-xl px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground">
                    {s.title}
                  </a>
                ))}
              </nav>
            </Panel>
          </div>
        </aside>

        {/* Document */}
        <div className="lg:col-span-3 space-y-5">
          {sections.map(s => (
            <Panel key={s.id} className="p-6 sm:p-7 scroll-mt-24" data-id={s.id}>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <div className="mt-4 space-y-4">
                {s.content.map((c, i) => (
                  <div key={i}>
                    {c.sub && <p className="mb-1 text-sm font-medium text-foreground">{c.sub}</p>}
                    <p className="text-sm leading-relaxed text-muted-foreground">{c.text}</p>
                  </div>
                ))}
              </div>
            </Panel>
          ))}

          {/* Footer note */}
          <div className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-gradient-soft px-5 py-4">
            <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-brand-2" />
            <p className="text-sm text-muted-foreground">
              Questions about this policy?{' '}
              <Link href="/contact" className="text-brand-2 hover:underline">Contact our team</Link> — we're happy to explain anything in plain language.
            </p>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
