import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { SiteShell } from '@/components/site-shell';
import { GoogleOneTap } from '@/components/google-one-tap';
import { LineBg } from '@/components/line-bg';
import { Icon, type IconName } from '@/components/icon';
import { CutButton, CutIconBox, CutPanel } from '@/components/cut-ui';
import { SEOHead, SCHEMA_WEBAPP, SCHEMA_WEBSITE, SCHEMA_ORGANIZATION } from '@/components/seo-head';
import { PAGE_SEO } from '@/lib/seo-config';

const features: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'language', title: '3 Languages', desc: 'Natural voices in Bangla, English & Hindi with authentic pronunciation.' },
  { icon: 'soundwave', title: 'Studio Quality', desc: 'Cloud AI voices with clear, expressive and realistic speech output.' },
  { icon: 'bolt', title: 'Instant & Fast', desc: 'Type your text and get audio in just a few seconds.' },
  { icon: 'download', title: 'Download Audio', desc: 'Save your generated audio and use it anywhere you like.' },
  { icon: 'shield', title: 'Private & Secure', desc: 'Your data is protected with our secure server — your own private database.' },
  { icon: 'crown', title: 'Fair Credits', desc: 'Start free with 5 credits. Upgrade any time for more power.' },
];

const steps = [
  { n: '01', title: 'Write your text', desc: 'Paste or type text in Bangla, English or Hindi.' },
  { n: '02', title: 'Pick a voice', desc: 'Choose a language and a natural AI voice.' },
  { n: '03', title: 'Generate & listen', desc: 'Listen instantly in your browser.' },
];

const VOICES = [
  { lang: 'Bangla', native: 'বাংলা', flag: '🇧🇩', name: 'Priya', gender: 'Female', text: 'আমাদের AI কণ্ঠস্বর আপনার টেক্সটকে জীবন্ত করে তোলে।', accent: '#ec5252', wave: [12,28,18,38,24,42,16,34,22,40,14,30,20,36,10] },
  { lang: 'English', native: 'English', flag: '🇬🇧', name: 'James', gender: 'Male', text: 'Our neural AI voice brings your words to life instantly.', accent: '#6366f1', wave: [20,36,14,40,26,44,18,38,24,42,16,32,22,38,12] },
  { lang: 'Hindi', native: 'हिन्दी', flag: '🇮🇳', name: 'Ananya', gender: 'Female', text: 'हमारी AI आवाज़ तकनीक आपके शब्दों को जीवंत बनाती है।', accent: '#f59e0b', wave: [16,32,20,42,18,38,28,44,12,36,22,40,14,34,24] },
];

type VoiceStage = 'typing' | 'converting' | 'playing' | 'done';

function VoiceStudioCard() {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [stage, setStage] = useState<VoiceStage>('typing');
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const v = VOICES[idx];

  const clearT = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  useEffect(() => {
    clearT();
    setDisplayed('');
    setStage('typing');
    setProgress(0);
    let charIdx = 0;
    const full = v.text;

    function typeNext() {
      charIdx++;
      setDisplayed(full.slice(0, charIdx));
      if (charIdx < full.length) {
        timerRef.current = setTimeout(typeNext, 42);
      } else {
        // → converting
        timerRef.current = setTimeout(() => {
          setStage('converting');
          let p = 0;
          const fill = setInterval(() => {
            p += 4 + Math.random() * 6;
            setProgress(Math.min(p, 100));
            if (p >= 100) {
              clearInterval(fill);
              timerRef.current = setTimeout(() => {
                setStage('playing');
                timerRef.current = setTimeout(() => {
                  setStage('done');
                  timerRef.current = setTimeout(() => {
                    setIdx(i => (i + 1) % VOICES.length);
                  }, 1200);
                }, 3800);
              }, 180);
            }
          }, 80);
        }, 400);
      }
    }
    timerRef.current = setTimeout(typeNext, 220);
    return clearT;
  }, [idx]);

  const isPlaying = stage === 'playing';
  const isConverting = stage === 'converting';

  return (
    <CutPanel tone="card" className="mt-7 w-full overflow-hidden" contentClassName="bg-card/95">
      <div className="border-b border-border/70" style={{ borderColor: `${v.accent}30` }}>

      <style>{`
        @keyframes pv-blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes pv-bar{0%{transform:scaleY(0.25)}100%{transform:scaleY(1)}}
        @keyframes pv-glow{0%,100%{opacity:.35}50%{opacity:.7}}
        @keyframes pv-sweep{from{left:-18%}to{left:110%}}
        @keyframes pv-fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        .pv-fadein{animation:pv-fadein .35s ease both}
      `}</style>

      {/* Header bar */}
      <div className="flex items-center justify-between border-b px-4 py-2.5"
        style={{ borderColor: `${v.accent}30`, background: `${v.accent}0a` }}>
        <div className="flex items-center gap-2">
          {/* Traffic lights */}
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          <span className="mx-1.5 h-3.5 w-px bg-border" />
          <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60">Perfectory Voice Studio</span>
        </div>
        {/* Accent dot */}
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ background: v.accent }} />
          <span className="relative h-2 w-2 rounded-full" style={{ background: v.accent }} />
        </span>
      </div>

      <div className="p-4 space-y-3">

        {/* Language switcher pills */}
        <div className="flex gap-2">
          {VOICES.map((vv, i) => (
            <CutButton key={vv.lang} type="button" onClick={() => setIdx(i)}
              variant={i === idx ? 'primary' : 'outline'}
              className="px-3 py-2 text-[11px]"
              style={i === idx ? { boxShadow: `0 0 10px ${vv.accent}30` } : { opacity: 0.65 }}>
              <span>{vv.flag}</span>
              {vv.native}
            </CutButton>
          ))}
        </div>

        {/* Text input area */}
        <div className="relative min-h-[72px] overflow-hidden rounded-xl border px-4 py-3"
          style={{ borderColor: `${v.accent}30`, background: `${v.accent}06` }}>
          {/* Corner label */}
          <span className="absolute right-3 top-2 text-[9px] font-bold uppercase tracking-widest"
            style={{ color: v.accent, opacity: 0.5 }}>Input</span>
          <p className="mt-0.5 text-sm leading-relaxed text-foreground min-h-[1.5rem]">
            {displayed}
            <span className="ml-0.5 inline-block h-[15px] w-[2px] align-middle rounded-sm animate-[pv-blink_.7s_step-end_infinite]"
              style={{ background: v.accent }} />
          </p>
        </div>

        {/* Converting progress bar */}
        {isConverting && (
          <div className="pv-fadein space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: v.accent }}>
                <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0"/></svg>
                Generating voice…
              </span>
              <span className="text-[10px] font-mono font-bold" style={{ color: v.accent }}>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/40">
              <div className="h-full rounded-full transition-all duration-100"
                style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${v.accent}cc, ${v.accent})` }} />
            </div>
          </div>
        )}

        {/* Waveform */}
        {(isPlaying || stage === 'done') && (
          <div className="pv-fadein relative overflow-hidden rounded-xl border px-4 py-3"
            style={{ borderColor: `${v.accent}30`, background: `${v.accent}06` }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Waveform Output</span>
              {isPlaying && (
                <div className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: v.accent }}>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute h-full w-full animate-ping rounded-full opacity-70" style={{ background: v.accent }} />
                    <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: v.accent }} />
                  </span>
                  Playing
                </div>
              )}
              {stage === 'done' && (
                <span className="text-[10px] font-semibold text-green-500">✓ Done</span>
              )}
            </div>
            <div className="flex h-12 items-center justify-center gap-[4px]">
              {v.wave.map((h, i) => (
                <div key={i} className="rounded-full origin-center transition-all duration-500"
                  style={{
                    width: 4,
                    height: isPlaying ? h : 4,
                    background: isPlaying ? v.accent : `${v.accent}60`,
                    animation: isPlaying ? `pv-bar ${0.35 + (i % 5) * 0.09}s ease-in-out infinite alternate` : 'none',
                    animationDelay: `${i * 0.04}s`,
                    opacity: isPlaying ? 1 : 0.4,
                    transitionDelay: `${i * 25}ms`,
                  }} />
              ))}
            </div>
            {/* Scan line */}
            {isPlaying && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                <div className="absolute inset-y-0 w-8"
                  style={{
                    background: `linear-gradient(90deg,transparent,${v.accent}55,transparent)`,
                    animation: 'pv-sweep 2.2s linear infinite',
                  }} />
              </div>
            )}
          </div>
        )}

        {/* Voice metadata row */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full text-white text-[10px] font-black shadow-lg"
              style={{ background: `linear-gradient(135deg,${v.accent}cc,${v.accent})` }}>
              AI
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-[pv-glow_2s_ease-in-out_infinite] rounded-full border-2 border-card"
                style={{ background: v.accent }} />
            </div>
            <div className="leading-none">
              <p className="text-xs font-bold">{v.name} <span className="font-normal text-muted-foreground">({v.gender})</span></p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{v.lang} · Neural TTS</p>
            </div>
          </div>

          <Link href="/generator">
            <CutButton variant="primary" className="px-3.5 py-2 text-[11px] text-primary-foreground" style={{ boxShadow: `0 4px 14px ${v.accent}44` }}>
              Try Free
              <Icon name="arrow-right" size={14} />
            </CutButton>
  </Link>
  </div>
  </div>
  </div>
  </CutPanel>
  );
  }


export default function HomePage() {
  return (
    <SiteShell>
      <SEOHead
        {...PAGE_SEO.home}
        schema={[SCHEMA_WEBAPP, SCHEMA_WEBSITE, SCHEMA_ORGANIZATION]}
      />
      {/* Hero */}
      <CutPanel tone="card" className="relative overflow-hidden" contentClassName="bg-card/90">
        <LineBg />
        <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:p-14">
          <div className="float-up text-center lg:text-left">
            <div className="flex justify-center lg:justify-start">

            </div>
            <h1 className="mt-5 text-balance text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Turn your text into{' '}
              <span className="text-gradient">natural voice</span> instantly
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground lg:mx-0">
              Perfectory Voice converts your writing into lifelike speech in Bangla, English and Hindi.
              Perfect for creators, teachers, and storytellers.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link href="/generator">
                <CutButton variant="primary" className="text-primary-foreground">
                  Start Generating <Icon name="arrow-right" size={18} />
                </CutButton>
              </Link>
              <Link href="/plans">
                <CutButton variant="outline">
                  <Icon name="crown" size={18} /> View Plans
                </CutButton>
              </Link>
            </div>
          </div>

          {/* Hero visual — Voice Studio Card */}
          <div className="relative float-up">
            <VoiceStudioCard />
          </div>
        </div>
      </CutPanel>

      {/* Features */}
      <section className="mt-8">
        <div className="text-center">

          <h2 className="mt-4 text-balance text-3xl sm:text-4xl">
            Everything you need to <span className="text-gradient">create voice</span>
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <CutPanel key={f.title} tone="card" className="group transition hover:-translate-y-1 hover:ring-glow" contentClassName="p-6 text-center">
              <CutIconBox className="mx-auto transition group-hover:text-primary-foreground" tone="soft"><Icon name={f.icon} size={24} /></CutIconBox>
              <h3 className="mt-4 text-lg text-gradient">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </CutPanel>
          ))}
        </div>
      </section>

      {/* How it works */}
      <CutPanel tone="soft" className="mt-10 overflow-hidden" contentClassName="p-6 sm:p-10">
        <div className="text-center">

          <h2 className="mt-4 text-balance text-3xl sm:text-4xl">Three simple steps</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <CutPanel key={s.n} tone="card" className="relative" contentClassName="p-6 text-center">
              <span className="text-4xl text-gradient">{s.n}</span>
              <h3 className="mt-3 text-lg">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </CutPanel>
          ))}
        </div>
      </CutPanel>

      {/* CTA */}
      <CutPanel tone="brand" className="relative mt-10 overflow-hidden" contentClassName="p-8 text-center text-primary-foreground sm:p-14">
        <div className="relative">
          <h2 className="text-balance text-3xl sm:text-4xl">Ready to give your text a voice?</h2>
          <p className="mx-auto mt-3 max-w-md text-pretty text-primary-foreground/85">
            Create your free account and get 10 credits to start generating today.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/signup">
              <CutButton variant="outline" className="text-foreground">
                <Icon name="user" size={18} /> Create free account
              </CutButton>
            </Link>
            <Link href="/generator">
              <CutButton variant="ghost" className="text-primary-foreground">
                Try the generator <Icon name="arrow-right" size={18} />
              </CutButton>
            </Link>
          </div>
        </div>
      </CutPanel>
      <GoogleOneTap />
    </SiteShell>
  );
}
