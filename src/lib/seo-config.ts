// ─── Site-wide SEO config ─────────────────────────────────────────────────
// Update SITE_URL to your actual production domain once deployed.
export const SITE_URL = 'https://perfectoryvoice.com';
export const SITE_NAME = 'Perfectory Voice';
export const TWITTER_HANDLE = '@PerfectoryVoice';

// Fallback OG image (absolute URL)
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export interface SEOMeta {
  title: string;         // Full page title (no suffix needed — suffix added by component)
  description: string;
  canonical?: string;    // Full URL; defaults to SITE_URL + pathname
  ogImage?: string;
  noIndex?: boolean;
  keywords?: string;
}

// ─── Per-page SEO definitions ─────────────────────────────────────────────
export const PAGE_SEO: Record<string, SEOMeta> = {
  home: {
    title: 'Free AI Text to Voice Generator — Bangla, English & Hindi | Perfectory Voice',
    description:
      'Perfectory Voice is a free AI-powered text-to-speech generator that converts your writing into natural voices in Bangla, English and Hindi. Start with 10 free credits — no credit card required.',
    keywords:
      'text to voice, text to speech, AI voice generator, Bangla TTS, Bengali text to speech, Hindi text to speech, English TTS, free voice generator, AI speech, voice synthesis, online TTS, text to audio',
    canonical: SITE_URL,
  },
  generator: {
    title: 'Voice Generator — Convert Text to Speech Online | Perfectory Voice',
    description:
      'Convert any text to natural AI speech instantly. Choose from 20+ voices in Bangla, English and Hindi. Listen in your browser or download as audio — completely free to try.',
    keywords:
      'text to speech online, voice generator, AI voice, Bangla voice generator, Hindi TTS, English speech synthesis, convert text to audio, online voice maker, TTS generator',
    canonical: `${SITE_URL}/generator`,
  },
  plans: {
    title: 'Plans & Pricing — Text to Speech Credits | Perfectory Voice',
    description:
      'Start free with 10 credits. Upgrade to Monthly Pro or Yearly Premium for more voices, higher limits, and advanced features. Affordable TTS plans for creators, teachers, and businesses.',
    keywords:
      'Perfectory Voice pricing, TTS plans, text to speech credits, voice generator subscription, AI voice pricing',
    canonical: `${SITE_URL}/plans`,
  },
  about: {
    title: 'About Perfectory Voice — AI Text to Speech Tool',
    description:
      'Learn about Perfectory Voice — the AI text-to-speech platform built for Bangla, English and Hindi speakers. Our mission is to make high-quality voice generation accessible to everyone.',
    keywords:
      'about Perfectory Voice, AI text to speech, voice generation platform, Bangla TTS tool, multilingual voice AI',
    canonical: `${SITE_URL}/about`,
  },
  contact: {
    title: 'Contact Us | Perfectory Voice',
    description:
      'Have questions about Perfectory Voice? Get in touch with our support team. We are here to help with billing, voice generation, account issues and more.',
    keywords: 'contact Perfectory Voice, support, help, TTS support',
    canonical: `${SITE_URL}/contact`,
  },
  faq: {
    title: 'FAQ — Text to Speech Questions Answered | Perfectory Voice',
    description:
      'Find answers to the most common questions about Perfectory Voice — how credits work, supported languages, voice quality, downloading audio, and account management.',
    keywords:
      'Perfectory Voice FAQ, text to speech FAQ, TTS questions, voice generator help, how to use TTS',
    canonical: `${SITE_URL}/faq`,
  },
  login: {
    title: 'Login to Your Account | Perfectory Voice',
    description:
      'Log in to Perfectory Voice to access your credits, generate voices in Bangla, English and Hindi, and manage your account.',
    canonical: `${SITE_URL}/login`,
    noIndex: false,
  },
  signup: {
    title: 'Sign Up Free — Get 10 Free Credits | Perfectory Voice',
    description:
      'Create a free Perfectory Voice account and get 10 credits instantly — no credit card needed. Start converting text to natural speech in Bangla, English and Hindi today.',
    keywords:
      'sign up Perfectory Voice, free TTS account, free text to speech, free voice generator',
    canonical: `${SITE_URL}/signup`,
  },
  dashboard: {
    title: 'Dashboard | Perfectory Voice',
    description: 'Your Perfectory Voice dashboard — view credits, recent generations, and account activity.',
    noIndex: true,
    canonical: `${SITE_URL}/dashboard`,
  },
  verifyEmail: {
    title: 'Verify Your Email | Perfectory Voice',
    description: 'Confirm your email address with the code we sent you to finish setting up your Perfectory Voice account.',
    noIndex: true,
    canonical: `${SITE_URL}/verify/email`,
  },
  profile: {
    title: 'My Profile | Perfectory Voice',
    description: 'Manage your Perfectory Voice profile and account settings.',
    noIndex: true,
    canonical: `${SITE_URL}/profile`,
  },
  privacy: {
    title: 'Privacy Policy | Perfectory Voice',
    description:
      'Read the Perfectory Voice privacy policy to understand how we collect, use, and protect your data when you use our text-to-speech service.',
    canonical: `${SITE_URL}/privacy`,
  },
  terms: {
    title: 'Terms of Service | Perfectory Voice',
    description:
      'Read the Perfectory Voice terms of service — the rules and guidelines governing your use of our AI text-to-speech platform.',
    canonical: `${SITE_URL}/terms`,
  },
  notFound: {
    title: 'Page Not Found (404) | Perfectory Voice',
    description: 'The page you are looking for does not exist. Go back to Perfectory Voice homepage.',
    noIndex: true,
  },
};
