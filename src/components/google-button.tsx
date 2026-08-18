import { CUT_FRAME_PATH, CUT_FRAME_CLIP_PATH } from '@/components/cut-frame';

interface GoogleButtonProps {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const BUTTON_WIDTH = 250;

function GoogleColorIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="relative z-10 shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/**
 * Premium "6-cut" outline-only Google button — reuses the exact border
 * geometry from the input frames (CUT_FRAME_PATH: 4 chamfered corners
 * + 2 small notch steps on the top-right and bottom-left = 6 cuts
 * total). No filled background — just the 1px cut-corner stroke, so
 * the page background shows through. Fixed 250px wide on every
 * device; must sit inside a centered wrapper (self-center on a
 * flex-column form).
 */
export function GoogleButton({ onClick, loading = false, disabled = false }: GoogleButtonProps) {
  const busy = loading && !disabled;

  return (
    <div
      className="group relative self-center shrink-0 transition-opacity"
      style={{ width: BUTTON_WIDTH, aspectRatio: '250 / 52' }}
    >
      {/* 6-cut border stroke */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <path
          d={CUT_FRAME_PATH}
          fill="none"
          stroke={busy ? '#9AA0A6' : '#DADCE0'}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          className="transition-colors duration-200 group-hover:stroke-[#B8BCC2]"
        />
      </svg>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled || loading}
        className="relative flex h-full w-full items-center justify-center gap-3 bg-transparent text-sm font-medium text-[#3c4043] transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
        style={{ clipPath: CUT_FRAME_CLIP_PATH }}
      >
        {busy ? (
          /* keep icon slot same width so text doesn't jump */
          <span className="relative z-10 flex h-[18px] w-[18px] items-center justify-center">
            <span className="block h-4 w-4 rounded-full border-2 border-[#DADCE0] border-t-[#4285F4] animate-spin" />
          </span>
        ) : (
          <GoogleColorIcon size={18} />
        )}
        <span className="relative z-10">Continue with Google</span>
      </button>
    </div>
  );
}
