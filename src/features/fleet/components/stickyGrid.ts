// Small helpers shared by the faithful pivot tables (Gojek + Grab).
// The FROZEN identity columns are pinned with `position: sticky; left: <offset>`
// — the offsets are derived from fixed widths so no runtime measurement is
// needed. Only a PREFIX of the identity block is frozen: sticky columns have to
// be contiguous from the left, or a pinned one would overlay the scrolled ones.

export type IdentityCol = { id: string; label: string; width: number };

/**
 * Left offsets for the frozen prefix; `undefined` for a column that scrolls away
 * with the day band. Index-aligned with `cols`.
 */
export function stickyLefts(
  cols: IdentityCol[],
  frozenCount: number = cols.length,
): (number | undefined)[] {
  const lefts: (number | undefined)[] = [];
  let acc = 0;
  cols.forEach((c, i) => {
    if (i < frozenCount) {
      lefts.push(acc);
      acc += c.width;
    } else {
      lefts.push(undefined);
    }
  });
  return lefts;
}

export const identityWidth = (cols: IdentityCol[]) => cols.reduce((s, c) => s + c.width, 0);

/** Width of the pinned block — where the scrolling area effectively begins. */
export const frozenWidth = (cols: IdentityCol[], frozenCount: number) =>
  identityWidth(cols.slice(0, frozenCount));

/**
 * How many identity columns stay pinned: everything up to and including the
 * row's SUBJECT (its plate, or the driver in `mode=driver`). Keeping the subject
 * visible is what makes a horizontally scrolled row readable; the columns after
 * it are attributes, and letting them scroll buys several more day columns of
 * screen. Derived rather than hard-coded per layout, so the admin/partner ×
 * plate/driver variants all stay correct on their own.
 */
export function frozenPrefixCount(cols: IdentityCol[], subjectId: string): number {
  const index = cols.findIndex((c) => c.id === subjectId);
  // A layout without the subject column pins only "No", never the whole block.
  return index === -1 ? 1 : index + 1;
}

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
