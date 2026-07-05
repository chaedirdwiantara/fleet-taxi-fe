import type { LucideIcon } from 'lucide-react';
import { formatRupiah } from '@/lib/money';

// Reusable gradient summary card (legacy summary-card look, modern styling).
export type GradientStatDef = {
  label: string;
  value: number;
  icon: LucideIcon;
  gradient: string; // tailwind `from-… to-…`
};

export function GradientStat({ label, value, icon: Icon, gradient }: GradientStatDef) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} p-5 text-white shadow-sm`}>
      <p className="text-sm font-medium opacity-90">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{formatRupiah(value)}</p>
      <Icon className="absolute -bottom-3 -right-2 size-20 opacity-20" aria-hidden />
    </div>
  );
}

export function GradientStatRow({ cards }: { cards: GradientStatDef[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <GradientStat key={c.label} {...c} />
      ))}
    </div>
  );
}
