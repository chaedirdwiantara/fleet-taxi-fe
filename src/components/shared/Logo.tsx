import { useId, type SVGProps } from 'react';

import { cn } from '@/lib/utils';

// The Fleet Taxi identity. Unlike the platform marks in `BrandIcons.tsx` — which are
// monochrome so they sit level with the lucide icon set — this one carries brand colour:
// it is the product's own logo, not a nav glyph. Its colours come from the `--brand-*`
// tokens in `index.css`, deliberately separate from the blue `primary` ramp so a rebrand
// never leaks into buttons, links, or focus rings.

/**
 * The mark alone: an open charge orbit around a bolt, on a brand-red squircle.
 * Decorative by default — the wordmark in `<Logo />` carries the accessible name.
 */
export function LogoMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  // Two instances render at once (desktop sidebar + mobile Sheet), so the gradient
  // needs a document-unique id.
  const gradientId = `fleet-taxi-brand-${useId()}`;

  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn('size-6', className)}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="var(--brand-gradient-from)" />
          <stop offset="1" stopColor="var(--brand-gradient-to)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
      {/* Open ring = a charge cycle. Dash pattern rather than an arc path so the gap
          stays exact; rotated so the opening sits top-right. */}
      <circle
        cx="16"
        cy="16"
        r="10"
        fill="none"
        stroke="var(--brand-foreground)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="47 15.8"
        transform="rotate(-70 16 16)"
      />
      <path
        d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"
        transform="translate(10 10.24) scale(0.48)"
        fill="var(--brand-foreground)"
      />
    </svg>
  );
}

/** Full lockup: mark + two-tone "Fleet Taxi" wordmark. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <LogoMark />
      <span className="text-sm font-semibold tracking-tight">
        Fleet<span className="text-brand"> Taxi</span>
      </span>
    </span>
  );
}
