import type { SVGProps } from 'react';

export type IconName =
  | 'microphone' | 'soundwave' | 'play' | 'download' | 'home' | 'dashboard'
  | 'user' | 'users' | 'settings' | 'logout' | 'login' | 'crown' | 'bolt'
  | 'menu' | 'close' | 'google' | 'eye' | 'eye-off' | 'check' | 'arrow-right' | 'bell'
  | 'arrow-left' | 'globe' | 'link' | 'star' | 'heart' | 'copy' | 'mail'
  | 'lock' | 'shield' | 'chart' | 'language' | 'plus' | 'pencil' | 'upload' | 'image' | 'x' | 'chat'
  | 'chevron-down' | 'chevron-up' | 'code' | 'credit-card' | 'sliders' | 'refresh' | 'ban' | 'info'
  | 'pause' | 'stop' | 'filter' | 'clock' | 'trash' | 'send'
  | 'search' | 'help' | 'phone' | 'file';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const paths: Record<IconName, React.ReactNode> = {
  microphone: (<g fill="currentColor" stroke="none"><path d="m20.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 19.276.931L19.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251M8.5 6h-2v12h2zM4 10H2v4h2zm9-8h-2v20h2zm4.5 6h-2v10h2zm4.5 2h-2v4h2z"/></g>),
  soundwave: (<><path d="M4 10v4M8 6v12M12 3v18M16 6v12M20 10v4" strokeLinecap="round"/></>),
  play: <path d="M6 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 6 5.5Z"/>,
  download: (<><path d="M12 3v12m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round"/></>),
  home: (<><path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/></>),
  dashboard: (<><rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/></>),
  user: (<><circle cx="12" cy="7.5" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round"/></>),
  users: (<><circle cx="9" cy="7.5" r="3"/><path d="M3 20a6 6 0 0 1 12 0" strokeLinecap="round"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 20a6 6 0 0 0-3-5.2" strokeLinecap="round"/></>),
  settings: (<><circle cx="12" cy="12" r="3"/><path d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" strokeLinecap="round"/></>),
  logout: (<><path d="M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" strokeLinecap="round"/></>),
  login: (<><path d="M11 12h9m0 0-3.5-3.5M20 12l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6" strokeLinecap="round"/></>),
  crown: (<><path d="M3 8l3.5 3L12 5l5.5 6L21 8l-1.5 10h-15L3 8Z" strokeLinejoin="round"/></>),
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round"/>,
  menu: <path d="M4 7h3m13 0h-9m9 10h-3M4 17h9m-9-5h16" strokeLinecap="round"/>,
  bell: (<><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" strokeLinejoin="round"/><path d="M10 21h4" strokeLinecap="round"/></>),
  close: (<><path d="m14.5 9.5-5 5m0-5 5 5"/><path d="M7 3.338A9.954 9.954 0 0 1 12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12c0-1.821.487-3.53 1.338-5" strokeLinecap="round"/></>),
  google: (<path fill="currentColor" stroke="none" d="M21.35 11.1h-9.17v2.98h5.27c-.23 1.4-1.64 4.1-5.27 4.1-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.8 0 3.01.77 3.7 1.43l2.52-2.43C16.9 3.9 14.76 3 12.18 3 6.98 3 2.77 7.2 2.77 12.4S6.98 21.8 12.18 21.8c5.5 0 9.14-3.87 9.14-9.32 0-.63-.07-1.1-.16-1.38Z"/>),
  eye: (<><path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"/><circle cx="12" cy="12" r="3"/></>),
  'eye-off': (<><path d="M4 4l16 16" strokeLinecap="round"/><path d="M9.5 5.4A9.5 9.5 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3 3.7M6.4 6.7C3.9 8.3 2.5 12 2.5 12s3.5 7 9.5 7c1.3 0 2.5-.3 3.6-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>),
  check: <path d="M5 12.5 10 17.5 19 6.5" strokeLinecap="round" strokeLinejoin="round"/>,
  'arrow-right': <path d="M4 12h16m0 0-6-6m6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>,
  'arrow-left': <path d="M20 12H4m0 0 6 6M4 12l6-6" strokeLinecap="round" strokeLinejoin="round"/>,
  globe: (<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></>),
  link: (<><path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.54 3.54 0 0 0-5-5l-1 1" strokeLinecap="round"/><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.54 3.54 0 0 0 5 5l1-1" strokeLinecap="round"/></>),
  star: (<path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 17.9 6.75 19.6l1-5.85L3.5 9.7l5.9-.9L12 3.5Z" strokeLinejoin="round"/>),
  heart: (<path d="M12 20s-7-4.35-9-9.5C1.5 6.5 4 4 7 4c2 0 3.5 1.5 5 3 1.5-1.5 3-3 5-3 3 0 5.5 2.5 4 6.5-2 5.15-9 9.5-9 9.5Z" strokeLinejoin="round"/>),
  copy: (<><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>),
  mail: (<><rect x="2.5" y="4.5" width="19" height="15" rx="3"/><path d="m3.5 6.5 8.5 6 8.5-6" strokeLinecap="round"/></>),
  lock: (<><rect x="4.5" y="10" width="15" height="10.5" rx="3"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/></>),
  shield: (<><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></>),
  chart: (<><path d="M4 20V4M4 20h16" strokeLinecap="round"/><path d="M8 16v-4M12 16V8M16 16v-6" strokeLinecap="round"/></>),
  language: (<><path d="M4 6h9M8.5 4v2c0 4-2 7-5 8.5" strokeLinecap="round"/><path d="M6 10c1.5 3 4 4.5 6 5" strokeLinecap="round"/><path d="m12.5 20 3.5-8 3.5 8M13.7 17h4.6" strokeLinecap="round" strokeLinejoin="round"/></>),
  plus: <path d="M12 5v14M5 12h14" strokeLinecap="round"/>,
  pencil: (<><path d="M15.5 4.5 19.5 8.5 8.5 19.5 4 20l.5-4.5Z" strokeLinejoin="round"/><path d="M13.5 6.5 17.5 10.5" strokeLinecap="round"/></>),
  upload: (<><path d="M12 15V3m0 0-4 4m4-4 4 4" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round"/></>),
  image: (<><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21" strokeLinecap="round" strokeLinejoin="round"/></>),
  x: <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round"/>,
  chat: (<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" strokeLinejoin="round"/><path d="M8 10h.01M12 10h.01M16 10h.01" strokeLinecap="round" strokeWidth={2}/></>),
  'chevron-down': <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>,
  'chevron-up': <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round"/>,
  code: (<><path d="M16 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round"/></>),
  'credit-card': (<><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20" strokeLinecap="round"/><path d="M6 15h4" strokeLinecap="round"/></>),
  sliders: (<><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round"/><circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/></>),
  refresh: (<><path d="M4 12a8 8 0 0 1 14.93-4M20 4v4h-4" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 12a8 8 0 0 1-14.93 4M4 20v-4h4" strokeLinecap="round" strokeLinejoin="round"/></>),
  ban: (<><circle cx="12" cy="12" r="9"/><path d="M6 6l12 12" strokeLinecap="round"/></>),
  info:   (<><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v5" strokeLinecap="round"/></>),
  pause:  (<><rect x="5" y="4" width="4" height="16" rx="1.5" fill="currentColor" stroke="none"/><rect x="15" y="4" width="4" height="16" rx="1.5" fill="currentColor" stroke="none"/></>),
  stop:   (<rect x="4" y="4" width="16" height="16" rx="2.5" fill="currentColor" stroke="none"/>),
  filter: (<><path d="M3 6h18M6 12h12M10 18h4" strokeLinecap="round" strokeLinejoin="round"/></>),
  clock:  (<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round"/></>),
  trash:  (<><path d="M5 7h14M8 7V5a2 2 0 0 1 4 0v2M10 12v5M14 12v5M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" strokeLinecap="round" strokeLinejoin="round"/></>),
  send:   (<><path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2 15 22 11 13 2 9l20-7Z" strokeLinejoin="round"/></>),
  search: (<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/></>),
  help:   (<><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 2-2.5 2.5-2.5 4" strokeLinecap="round"/><path d="M12 17h.01" strokeLinecap="round" strokeWidth={2}/></>),
  phone:  (<path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C9.6 21 3 14.4 3 6c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8Z" strokeLinejoin="round"/>),
  file:   (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" strokeLinejoin="round"/><path d="M14 2v6h6" strokeLinejoin="round"/></>),
};

export function Icon({ name, size = 22, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.6} aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  );
}
