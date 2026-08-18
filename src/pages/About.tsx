import { Link } from 'wouter';
import { SiteShell } from '@/components/site-shell';
import { LineBg } from '@/components/line-bg';
import { Icon, type IconName } from '@/components/icon';
import { GradientButton, Panel, SectionBadge } from '@/components/primitives';
import { SEOHead } from '@/components/seo-head';
import { PAGE_SEO } from '@/lib/seo-config';

const values: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'soundwave', title: 'Audio First', desc: 'We believe voice is the most natural form of communication. Every product decision starts from that belief.' },
  { icon: 'shield', title: 'Privacy by Default', desc: 'Your texts, your audio — never stored, never sold. We are strict about data privacy from day one.' },
  { icon: 'language', title: 'Language Inclusivity', desc: 'Bangla, English, Hindi — and more on the roadmap. We build for everyone, not just the English-speaking world.' },
  { icon: 'bolt', title: 'Speed & Simplicity', desc: 'No complicated setup. Paste, pick, generate. We relentlessly cut friction out of the workflow.' },
  { icon: 'crown', title: 'Fair Pricing', desc: 'Start free with real credits. Upgrade only when you need more. No hidden fees, no dark patterns.' },
  { icon: 'users', title: 'Community Driven', desc: 'Feature ideas, bug reports, language requests — our roadmap is shaped by the people who use the product daily.' },
];

const stats = [
  { value: '10K+', label: 'Voices Generated' },
  { value: '3', label: 'Languages Supported' },
  { value: '99%', label: 'Uptime SLA' },
  { value: '< 5s', label: 'Avg Generation Time' },
];

const timeline = [
  { year: '2024', title: 'The Idea', desc: 'Frustrated by expensive and English-only TTS tools, our founder started building a multilingual alternative during late-night side-project sessions.' },
  { year: '2025', title: 'First Public Beta', desc: 'Launched with Bangla & English support. First 500 users signed up within a week entirely through word of mouth.' },
  { year: '2025', title: 'Hindi Added', desc: 'Hindi support arrived after repeated requests from the community. Pro plans introduced to sustain the platform.' },
  { year: '2026', title: 'Growing Fast', desc: 'Admin dashboard, live chat support, and daily credit resets for Pro members. More languages are on the horizon.' },
];

export default function AboutPage() {
  return (
    <SiteShell>
      <SEOHead {...PAGE_SEO.about} />
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
        <LineBg />
        <div className="relative px-6 py-14 text-center sm:px-10 sm:py-20">
          <div className="flex justify-center">

          </div>
          <h1 className="mt-5 text-balance text-4xl leading-tight sm:text-5xl">
            Built for voices that{' '}
            <span className="text-gradient">deserve to be heard</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
            Perfectory Voice was born out of a simple frustration: great text-to-speech tools were expensive,
            English-only, and built for enterprises — not for everyday creators, teachers, and storytellers
            across South Asia.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/generator">
              <GradientButton icon="microphone">Try it Free</GradientButton>
            </Link>
            <Link href="/contact">
              <button className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm transition hover:border-brand-2 hover:text-brand-2">
                <Icon name="chat" size={18} /> Get in Touch
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Panel key={s.label} className="flex flex-col items-center justify-center gap-1 p-6 text-center">
            <span className="text-3xl font-bold text-gradient">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </Panel>
        ))}
      </div>

      {/* ── Mission ───────────────────────────────────────── */}
      <section className="mt-10">
        <div className="text-center">

          <h2 className="mt-4 text-balance text-3xl">
            What we're building toward
          </h2>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Panel className="relative overflow-hidden p-7">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand/10" />
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-soft text-brand">
              <Icon name="soundwave" size={24} />
            </span>
            <h3 className="mt-4 text-xl font-semibold">Our Mission</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              To make natural, expressive AI voice generation accessible to every creator — regardless of language,
              budget, or technical background. We want a teacher in Dhaka to sound as professional as a studio in
              New York.
            </p>
          </Panel>
          <Panel className="relative overflow-hidden p-7">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-2/10" />
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-soft text-brand-2">
              <Icon name="crown" size={24} />
            </span>
            <h3 className="mt-4 text-xl font-semibold">Our Vision</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A world where anyone can give voice to their ideas in their native language — at the press of a button.
              We are starting with Bangla, English, and Hindi, and expanding from there.
            </p>
          </Panel>
        </div>
      </section>

      {/* ── Values ────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="text-center">

          <h2 className="mt-4 text-balance text-3xl">What guides every decision</h2>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((v) => (
            <Panel key={v.title} className="group flex flex-col gap-3 p-6 transition hover:border-brand-2/40">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-soft text-brand transition group-hover:bg-gradient-brand group-hover:text-primary-foreground">
                <Icon name={v.icon} size={22} />
              </span>
              <h3 className="font-semibold">{v.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
            </Panel>
          ))}
        </div>
      </section>

      {/* ── Timeline ──────────────────────────────────────── */}
      <section className="mt-10">
        <div className="text-center">

          <h2 className="mt-4 text-balance text-3xl">How we got here</h2>
        </div>
        <div className="mt-6 space-y-0">
          {timeline.map((t, i) => (
            <div key={i} className="relative flex gap-6 pb-8 last:pb-0">
              {/* Line */}
              {i < timeline.length - 1 && (
                <div className="absolute left-[19px] top-10 h-full w-px bg-border" />
              )}
              {/* Dot */}
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[11px] font-bold text-primary-foreground ring-2 ring-brand/20">
                {t.year.slice(2)}
              </div>
              <Panel className="flex-1 p-5">
                <p className="text-xs font-semibold text-brand-2 mb-1">{t.year}</p>
                <h3 className="font-semibold">{t.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.desc}</p>
              </Panel>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="relative overflow-hidden rounded-3xl p-8 text-center sm:p-12"
          style={{ background: 'linear-gradient(135deg, #6e1a52 0%, #b03070 50%, #ec5252 100%)' }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="relative">
            <h2 className="text-balance text-3xl font-bold text-white">
              Ready to give your words a voice?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/80">
              Start free — no credit card required. Generate your first voice in under 10 seconds.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup">
                <button className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-brand transition hover:opacity-90 active:scale-[0.98]">
                  <Icon name="microphone" size={18} /> Get Started Free
                </button>
              </Link>
              <Link href="/plans">
                <button className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-6 py-3 text-sm text-white transition hover:bg-white/10">
                  <Icon name="crown" size={18} /> View Plans
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
