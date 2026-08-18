import { useState } from 'react';
import { Link } from 'wouter';
import { SiteShell } from '@/components/site-shell';
import { LineBg } from '@/components/line-bg';
import { Icon, type IconName } from '@/components/icon';
import { Panel, SectionBadge, GradientButton } from '@/components/primitives';
import { SEOHead } from '@/components/seo-head';
import { PAGE_SEO } from '@/lib/seo-config';

interface FAQItem { q: string; a: string }
interface FAQCategory { id: string; label: string; icon: IconName; items: FAQItem[] }

const categories: FAQCategory[] = [
  {
    id: 'general',
    label: 'General',
    icon: 'home',
    items: [
      { q: 'What is Perfectory Voice?', a: 'Perfectory Voice is an AI-powered text-to-speech platform that converts your written text into natural, human-like audio in Bangla, English, and Hindi. It is designed for creators, teachers, students, and storytellers who want high-quality voice output without expensive studio equipment.' },
      { q: 'Who is Perfectory Voice for?', a: 'Anyone who needs voice content — content creators, educators, podcast producers, app developers, accessibility advocates, and business owners. If you have text and want audio, Perfectory Voice is for you.' },
      { q: 'What languages are supported?', a: 'We currently support Bangla (বাংলা), English, and Hindi (हिन्दी). Each language has multiple male and female AI voice styles to choose from. More languages are actively on our roadmap.' },
      { q: 'Do I need to install anything?', a: 'No. Perfectory Voice is entirely browser-based. Open the website, log in, and start generating — no downloads, no plugins, no setup required.' },
    ],
  },
  {
    id: 'credits',
    label: 'Credits & Plans',
    icon: 'bolt',
    items: [
      { q: 'What are credits?', a: 'Credits are the currency used to generate audio. Each character in your text costs a small number of credits. Longer texts cost more credits. You can see the exact cost before generating.' },
      { q: 'How many credits do I get for free?', a: 'New accounts receive 10 free credits upon sign-up. Free plan credits do not reset — they are a one-time welcome gift. To keep generating after they run out, you will need to upgrade to a paid plan.' },
      { q: 'Do Pro plan credits reset?', a: 'Yes. Pro Monthly and Pro Max (Yearly) plan members receive a daily credit refresh at midnight Bangladesh Standard Time (BST, UTC+6). Your credits are topped up every single day.' },
      { q: 'What happens if I run out of credits?', a: 'You will not be able to generate new audio until your credits refresh (Pro) or you upgrade your plan (Free). You can still listen to and download your existing generated audio.' },
      { q: 'Can I carry over unused credits to the next day?', a: 'Daily credits are reset each midnight — unused credits do not roll over. Think of them as a daily allowance. Purchase credits are separate and do not expire.' },
      { q: 'Can I buy extra credits without upgrading my plan?', a: 'Yes. You can purchase additional credit packs from your Dashboard at any time, regardless of your current plan.' },
    ],
  },
  {
    id: 'generation',
    label: 'Voice Generation',
    icon: 'microphone',
    items: [
      { q: 'How long does it take to generate audio?', a: 'Most generations complete in under 5 seconds for typical paragraph-length text. Longer texts (1000+ characters) may take up to 15 seconds as the audio is processed in chunks and merged.' },
      { q: 'Is there a character limit?', a: 'Yes. You can generate up to 5,000 characters per request. For longer content, we recommend splitting it into multiple sections.' },
      { q: 'What audio format is used?', a: 'Audio is delivered as MP3 files. They are compatible with all modern devices, browsers, and audio software.' },
      { q: 'How long is my generated audio available?', a: 'Generations in your in-browser history are available for 1 hour after creation — they are stored locally in your browser session. Persistent history (Pro feature) keeps your generations in Firestore. Download your audio promptly if you need it long-term.' },
      { q: 'Can I choose different voice styles?', a: 'Yes. Each language has multiple voice styles with different pitch, rate, and personality. Free plan users have access to the "Free" tier voices. Pro members unlock all voices including premium expressive styles.' },
    ],
  },
  {
    id: 'account',
    label: 'Account & Privacy',
    icon: 'user',
    items: [
      { q: 'How do I create an account?', a: 'Click "Sign up" on any page. You can register with your email and password or continue with Google. Email accounts require a quick verification step before you can generate audio.' },
      { q: 'Is my text stored on your servers?', a: 'No. The text you enter for generation is sent directly to our proxy and is not stored. Only metadata (language, voice, character count) is logged for credit tracking purposes.' },
      { q: 'Can I delete my account?', a: 'Yes. Go to your Profile page and use the "Delete Account" option. This will permanently remove your profile, credit balance, and all associated data.' },
      { q: 'How is my data protected?', a: 'All data is stored in Firebase with strict security rules. Passwords are hashed by Firebase Authentication — we never see your plain-text password. Connections are encrypted via HTTPS.' },
      { q: 'Can I change my username or email?', a: 'You can edit your display name, avatar, and profile details from the Edit Profile page. Email changes go through Firebase verification for security.' },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: 'credit-card',
    items: [
      { q: 'What payment methods are accepted?', a: 'We accept all major credit and debit cards, as well as popular digital wallets. Payment is processed securely — we never store your card details.' },
      { q: 'Can I cancel my subscription at any time?', a: 'Yes. You can cancel your subscription from your Dashboard at any time. You will keep access until the end of your current billing period.' },
      { q: 'Do you offer refunds?', a: 'We offer refunds within 7 days of purchase if you have not used significant credits. Contact our support team at support@perfectoryvoice.com to request one.' },
      { q: 'Is there a free trial for Pro?', a: 'Currently we do not offer a paid plan free trial, but our Free plan lets you experience the platform with 10 real credits. You can upgrade at any time from your Dashboard.' },
    ],
  },
];

function AccordionItem({ item, defaultOpen = false }: { item: FAQItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border-b border-border last:border-0 transition-colors ${open ? 'bg-gradient-soft/50' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-secondary/50"
      >
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition ${open ? 'bg-gradient-brand text-primary-foreground' : 'border border-border text-muted-foreground'}`}>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={12} />
        </span>
        <span className={`flex-1 text-sm font-medium ${open ? 'text-foreground' : 'text-foreground/80'}`}>
          {item.q}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4 pl-13">
          <p className="ml-8 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('general');
  const [search, setSearch] = useState('');

  const active = categories.find(c => c.id === activeCategory)!;

  const filteredItems = search.trim()
    ? categories.flatMap(c => c.items).filter(
        item =>
          item.q.toLowerCase().includes(search.toLowerCase()) ||
          item.a.toLowerCase().includes(search.toLowerCase()),
      )
    : active.items;

  const isSearching = search.trim().length > 0;

  return (
    <SiteShell>
      <SEOHead
        {...PAGE_SEO.faq}
        schema={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            { '@type': 'Question', name: 'What is Perfectory Voice?', acceptedAnswer: { '@type': 'Answer', text: 'Perfectory Voice is an AI-powered text-to-speech platform that converts your written text into natural, human-like audio in Bangla, English, and Hindi.' } },
            { '@type': 'Question', name: 'What languages are supported?', acceptedAnswer: { '@type': 'Answer', text: 'Bangla (বাংলা), English, and Hindi (हिन्दी). Each language has multiple male and female AI voice styles.' } },
            { '@type': 'Question', name: 'How many free credits do I get?', acceptedAnswer: { '@type': 'Answer', text: 'New accounts receive 10 free credits upon sign-up with no credit card required.' } },
            { '@type': 'Question', name: 'Do I need to install anything?', acceptedAnswer: { '@type': 'Answer', text: 'No. Perfectory Voice is entirely browser-based — no downloads, no plugins, no setup required.' } },
            { '@type': 'Question', name: 'What audio format is used?', acceptedAnswer: { '@type': 'Answer', text: 'Audio is delivered as MP3 files, compatible with all modern devices, browsers, and audio software.' } },
            { '@type': 'Question', name: 'Can I cancel my subscription at any time?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. You can cancel your subscription from your Dashboard at any time and keep access until the end of your billing period.' } },
          ],
        }}
      />
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
        <LineBg />
        <div className="relative px-6 py-12 text-center sm:px-10 sm:py-16">
          <div className="flex justify-center">

          </div>
          <h1 className="mt-5 text-balance text-4xl leading-tight sm:text-5xl">
            Frequently asked <span className="text-gradient">questions</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            Everything you need to know about Perfectory Voice. Can't find an answer?{' '}
            <Link href="/contact" className="text-brand-2 hover:underline">Ask us directly.</Link>
          </p>

          {/* Search */}
          <div className="mx-auto mt-6 max-w-md">
            <div className="relative flex items-center rounded-2xl border border-input bg-card shadow-sm focus-within:border-brand-2 focus-within:ring-2 focus-within:ring-brand-2/20 transition">
              <Icon name="search" size={18} className="ml-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search questions…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
              />
              {search && (
                <button onClick={() => setSearch('')} className="mr-3 shrink-0 text-muted-foreground hover:text-foreground">
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Category nav */}
        {!isSearching && (
          <aside className="lg:w-52 shrink-0">
            <nav className="flex flex-row gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {categories.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategory(c.id)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm transition lg:w-full ${activeCategory === c.id ? 'bg-gradient-brand text-primary-foreground ring-glow' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                >
                  <Icon name={c.icon} size={17} />
                  <span className="whitespace-nowrap">{c.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* FAQ list */}
        <div className="flex-1 min-w-0">
          {isSearching ? (
            <div>
              <p className="mb-3 text-sm text-muted-foreground">
                {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''} for "<span className="font-medium text-foreground">{search}</span>"
              </p>
              {filteredItems.length === 0 ? (
                <Panel className="flex flex-col items-center gap-3 p-10 text-center">
                  <Icon name="search" size={32} className="text-muted-foreground/50" />
                  <p className="font-medium">No results found</p>
                  <p className="text-sm text-muted-foreground">Try different keywords or{' '}
                    <Link href="/contact" className="text-brand-2 hover:underline">contact us</Link>.
                  </p>
                </Panel>
              ) : (
                <Panel className="overflow-hidden">
                  {filteredItems.map((item, i) => (
                    <AccordionItem key={i} item={item} defaultOpen={i === 0} />
                  ))}
                </Panel>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-soft text-brand">
                  <Icon name={active.icon} size={17} />
                </span>
                <h2 className="text-lg font-semibold">{active.label}</h2>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">{active.items.length}</span>
              </div>
              <Panel className="overflow-hidden">
                {active.items.map((item, i) => (
                  <AccordionItem key={i} item={item} defaultOpen={i === 0} />
                ))}
              </Panel>
            </div>
          )}

          {/* Still need help */}
          <div className="mt-5 flex flex-col items-center gap-4 rounded-3xl border border-brand/20 bg-gradient-soft p-6 text-center sm:flex-row sm:text-left">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground">
              <Icon name="chat" size={22} />
            </span>
            <div className="flex-1">
              <p className="font-semibold">Still have a question?</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Our support team is happy to help. Reach out any time.</p>
            </div>
            <Link href="/contact">
              <GradientButton icon="arrow-right">Contact Us</GradientButton>
            </Link>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
