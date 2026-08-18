import { useState } from 'react';
import { SiteShell } from '@/components/site-shell';
import { LineBg } from '@/components/line-bg';
import { Icon, type IconName } from '@/components/icon';
import { GradientButton, Panel, SectionBadge, TextInput, TextArea } from '@/components/primitives';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { SEOHead } from '@/components/seo-head';
import { PAGE_SEO } from '@/lib/seo-config';

const channels: { icon: IconName; title: string; value: string; sub: string }[] = [
  { icon: 'chat', title: 'Live Chat', value: 'Premium Feature', sub: 'Available for Pro & Pro Max members' },
  { icon: 'shield', title: 'Email Support', value: 'support@perfectoryvoice.com', sub: 'We reply within 24 hours' },
  { icon: 'clock', title: 'Support Hours', value: 'Sat – Thu', sub: '9:00 AM – 9:00 PM (BST)' },
];

const topics = [
  'General Question',
  'Billing & Plans',
  'Technical Issue',
  'Voice Quality',
  'Feature Request',
  'Bug Report',
  'Partnership',
  'Other',
];

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function ContactPage() {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [topic, setTopic]     = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus]   = useState<Status>('idle');
  const [errMsg, setErrMsg]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrMsg('Please fill in all required fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrMsg('Please enter a valid email address.');
      return;
    }
    setStatus('loading');
    setErrMsg('');
    try {
      await addDoc(collection(db, 'perfectory_contact'), {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        topic: topic || 'General Question',
        message: message.trim(),
        submittedAt: serverTimestamp(),
      });
      setStatus('success');
      setName(''); setEmail(''); setTopic(''); setMessage('');
    } catch {
      setStatus('error');
      setErrMsg('Something went wrong. Please try again or email us directly.');
    }
  }

  return (
    <SiteShell>
      <SEOHead {...PAGE_SEO.contact} />
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
        <LineBg />
        <div className="relative px-6 py-12 text-center sm:px-10 sm:py-16">
          <div className="flex justify-center">

          </div>
          <h1 className="mt-5 text-balance text-4xl leading-tight sm:text-5xl">
            We'd love to <span className="text-gradient">hear from you</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            Have a question, found a bug, or just want to say hi? Fill out the form and we'll get back to you
            within 24 hours.
          </p>
        </div>
      </section>

      {/* ── Channel Cards ─────────────────────────────────── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {channels.map((c) => (
          <Panel key={c.title} className="flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-soft text-brand">
              <Icon name={c.icon} size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{c.title}</p>
              <p className="truncate text-sm font-semibold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.sub}</p>
            </div>
          </Panel>
        ))}
      </div>

      {/* ── Form + FAQ teaser ─────────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">

        {/* Form */}
        <div className="lg:col-span-3">
          <Panel className="p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Send a message</h2>
            <p className="mt-1 text-sm text-muted-foreground">We read every message personally.</p>

            {status === 'success' ? (
              <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 text-green-600">
                  <Icon name="check" size={28} />
                </span>
                <h3 className="text-lg font-semibold">Message sent!</h3>
                <p className="text-sm text-muted-foreground">Thank you for reaching out. We'll reply to <span className="font-medium text-foreground">{email || 'your email'}</span> within 24 hours.</p>
                <button onClick={() => setStatus('idle')}
                  className="mt-2 text-sm text-brand-2 hover:underline">
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    label="Your name *"
                    id="contact-name"
                    placeholder="John Doe"
                    icon="user"
                    value={name}
                    onChange={e => { setName(e.target.value); setErrMsg(''); }}
                  />
                  <TextInput
                    label="Email address *"
                    id="contact-email"
                    type="email"
                    placeholder="you@example.com"
                    icon="login"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErrMsg(''); }}
                  />
                </div>

                {/* Topic select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-muted-foreground">Topic</label>
                  <div className="relative">
                    <select
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none transition focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20"
                    >
                      <option value="">Select a topic…</option>
                      {topics.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <Icon name="chevron-down" size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                <TextArea
                  label="Message *"
                  id="contact-message"
                  placeholder="Describe your question or issue in detail…"
                  rows={5}
                  value={message}
                  onChange={e => { setMessage(e.target.value); setErrMsg(''); }}
                />

                {errMsg && (
                  <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <Icon name="shield" size={16} className="mt-0.5 shrink-0" />
                    <span>{errMsg}</span>
                  </div>
                )}

                {status === 'error' && !errMsg && (
                  <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <Icon name="shield" size={16} className="mt-0.5 shrink-0" />
                    <span>Something went wrong. Please try again.</span>
                  </div>
                )}

                <GradientButton type="submit" loading={status === 'loading'} icon="chat" fullWidth>
                  {status === 'loading' ? 'Sending…' : 'Send Message'}
                </GradientButton>
              </form>
            )}
          </Panel>
        </div>

        {/* Sidebar: Quick help */}
        <div className="lg:col-span-2 space-y-4">
          <Panel className="p-6">
            <h3 className="font-semibold">Quick answers</h3>
            <p className="mt-1 text-sm text-muted-foreground">Common questions are answered on our FAQ page.</p>
            <a href="/faq" className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-gradient-soft px-4 py-3 text-sm transition hover:border-brand-2 hover:text-brand-2">
              <Icon name="help" size={18} />
              <span className="flex-1">Browse FAQ</span>
              <Icon name="arrow-right" size={15} className="text-muted-foreground" />
            </a>
          </Panel>

          <Panel className="overflow-hidden p-0">
            <div className="p-5 pb-4">
              <h3 className="font-semibold">Response time</h3>
              <p className="mt-1 text-sm text-muted-foreground">We aim to reply as fast as possible.</p>
            </div>
            {[
              { tier: 'Pro Max members', time: '< 4 hours', color: 'text-brand-2' },
              { tier: 'Pro members',     time: '< 12 hours', color: 'text-brand' },
              { tier: 'Free users',      time: '< 24 hours', color: 'text-muted-foreground' },
            ].map((r, i) => (
              <div key={i} className={`flex items-center justify-between border-t border-border px-5 py-3 ${i === 0 ? 'bg-gradient-soft' : ''}`}>
                <span className="text-sm">{r.tier}</span>
                <span className={`text-sm font-semibold ${r.color}`}>{r.time}</span>
              </div>
            ))}
          </Panel>

          <Panel className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                <Icon name="crown" size={19} />
              </span>
              <div>
                <p className="text-sm font-semibold">Need priority support?</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Upgrade to Pro Max for live chat and fastest response times.</p>
                <a href="/plans" className="mt-2 inline-flex items-center gap-1 text-xs text-brand-2 hover:underline">
                  View Plans <Icon name="arrow-right" size={12} />
                </a>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </SiteShell>
  );
}
