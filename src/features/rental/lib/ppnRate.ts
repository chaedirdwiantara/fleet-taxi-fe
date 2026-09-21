/** 1100 → "11%" — the rate is server-owned (basis points), never hardcoded in the UI. */
export const formatPpnRate = (rateBps: number): string =>
  `${(rateBps / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;
