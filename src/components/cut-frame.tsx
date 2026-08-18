/* ─────────────────────────────────────────────
   Shared "premium cut-corner" frame used by every
   input on the Login / Signup pages. Percentage-based
   paths so the frame scales cleanly to any field size.
───────────────────────────────────────────── */

/** Outer 1px cut-corner border path (percentage coordinates, viewBox 0 0 100 100). */
export const CUT_FRAME_PATH =
  'M4.1 0.9 L92.4 0.9 L94.7 10.7 L98.2 10.7 L99.9 23.2 L99.9 76.8 L95.9 99.1 L7.6 99.1 L5.6 89.3 L2.1 89.3 L0.1 76.8 L0.1 23.2 Z';

/** Subtle inner echo line, same cut geometry inset a touch further. */
export const CUT_FRAME_INNER_PATH =
  'M5 6.25 L91.5 6.25 L93.5 15.2 L97.1 15.2 L98.7 26.8 L98.7 73.2 L95 93.75 L8.5 93.75 L6.5 84.8 L2.9 84.8 L1 73.2 L1 26.8 Z';

/** Same shape expressed as a CSS clip-path polygon, for the field's backdrop layer. */
export const CUT_FRAME_CLIP_PATH =
  'polygon(4.1% 0.9%, 92.4% 0.9%, 94.7% 10.7%, 98.2% 10.7%, 99.9% 23.2%, 99.9% 76.8%, 95.9% 99.1%, 7.6% 99.1%, 5.6% 89.3%, 2.1% 89.3%, 0.1% 76.8%, 0.1% 23.2%)';

/** Small cut-tag clip-path used for the floating label chip. */
export const CUT_LABEL_CLIP_PATH =
  'polygon(0% 0%, 96% 0%, 100% 22%, 100% 78%, 96% 100%, 4% 100%, 0% 78%, 0% 22%)';

/** The SVG frame itself — two layered cut-corner strokes, colored entirely via CSS. */
export function CutFrame() {
  return (
    <svg
      className="pv-cut-frame-svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path className="pv-cut-frame" d={CUT_FRAME_PATH} />
      <path className="pv-cut-frame-inner" d={CUT_FRAME_INNER_PATH} />
    </svg>
  );
}
