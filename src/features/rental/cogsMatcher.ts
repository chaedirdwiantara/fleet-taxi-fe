// Map a free-text vehicle type (as entered in Daftarkan Plat) to a default
// COGS preset key. Pure util so the keyword table is unit-testable. Order
// matters: more specific keywords ("air ev") sit above broader ones.
const KEYWORD_TO_KEY: ReadonlyArray<readonly [keyword: string, key: string]> = [
  ['denza', 'denza'],
  ['ioniq', 'ioniq'],
  ['air ev', 'air_ev'],
  ['m6', 'm6_cloud'],
  ['cloud', 'm6_cloud'],
  ['seal', 'seal'],
  ['binguo', 'binguo_neta'],
  ['neta', 'binguo_neta'],
  ['darion', 'darion'],
];

/** Best-effort COGS preset key for a vehicle type; null when nothing matches. */
export function matchCogsKey(vehicleType: string | null | undefined): string | null {
  if (!vehicleType) return null;
  const haystack = vehicleType.toLowerCase();
  for (const [keyword, key] of KEYWORD_TO_KEY) {
    if (haystack.includes(keyword)) return key;
  }
  return null;
}
