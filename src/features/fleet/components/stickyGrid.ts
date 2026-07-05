// Small helpers shared by the faithful pivot tables (Gojek + Grab).
// Identity columns are frozen with `position: sticky; left: <offset>` — the
// offsets are derived from fixed widths so no runtime measurement is needed.

export type IdentityCol = { id: string; label: string; width: number };

/** Cumulative left offsets for a set of fixed-width sticky columns. */
export function stickyLefts(cols: IdentityCol[]): number[] {
  const lefts: number[] = [];
  let acc = 0;
  for (const c of cols) {
    lefts.push(acc);
    acc += c.width;
  }
  return lefts;
}

export const identityWidth = (cols: IdentityCol[]) => cols.reduce((s, c) => s + c.width, 0);

/**
 * Row-span map for a grouping key over already-sorted rows: index → span,
 * present only on the first row of each run (mirrors the legacy rowspan merge).
 */
export function groupRowSpans<T>(rows: T[], keyOf: (r: T) => string): Record<number, number> {
  const spans: Record<number, number> = {};
  let i = 0;
  while (i < rows.length) {
    const key = keyOf(rows[i]);
    let j = i;
    while (j < rows.length && keyOf(rows[j]) === key) j++;
    spans[i] = j - i;
    i = j;
  }
  return spans;
}
