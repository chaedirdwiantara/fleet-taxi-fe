import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/lib/money';

// Reusable gradient summary card (legacy summary-card look, modern styling).
export type GradientStatDef = {
  label: string;
  value: number;
  icon: LucideIcon;
  gradient: string; // tailwind `from-… to-…`
  sub?: string; // optional caption under the value
  onClick?: () => void; // renders the card as a button (click-through detail)
};

export function GradientStat({
  label,
  value,
  icon: Icon,
  gradient,
  sub,
  onClick,
}: GradientStatDef) {
  const className = cn(
    'relative overflow-hidden rounded-xl bg-gradient-to-br p-5 text-left text-white shadow-sm',
    gradient,
    onClick &&
      'cursor-pointer transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
  );
  const body = (
    <>
      <p className="text-sm font-medium opacity-90">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{formatRupiah(value)}</p>
      {sub && <p className="mt-1 text-xs font-medium opacity-80">{sub}</p>}
      <Icon className="absolute -right-2 -bottom-3 size-20 opacity-20" aria-hidden />
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function GradientStatRow({ cards }: { cards: GradientStatDef[] }) {
  return (
    <div
      className={`grid gap-3 sm:grid-cols-2 ${cards.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
    >
      {cards.map((c) => (
        <GradientStat key={c.label} {...c} />
      ))}
    </div>
  );
}
