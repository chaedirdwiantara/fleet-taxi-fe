import type { SVGProps } from 'react';

// Monochrome brand marks for the two ride-hailing platforms. Drawn in the
// lucide idiom (24×24 box, `currentColor`, 2px round strokes) so they inherit
// the sidebar's foreground colour and sit visually level with the icon set —
// no brand colours, per DESIGN-SYSTEM.md (tokens only).

/** Gojek — the "Solv" mark: an open ring around a solid dot. */
export function GojekIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 3a9 9 0 1 0 8.5 6" />
      <circle cx="12" cy="12" r="3.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Grab — the stylized "G" swoosh. */
export function GrabIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19.4 8.4A8 8 0 1 0 20 14H13.8" />
    </svg>
  );
}
