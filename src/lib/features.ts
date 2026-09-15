/**
 * Product feature switches — build-time constants, flipped here and nowhere
 * else. They gate what the UI *offers*; the backend keeps serving the data
 * either way, so turning one back on is a one-line change with no migration.
 *
 * Deliberately not `VITE_*` env: these are product decisions that must be
 * identical in dev, tests and prod, and a reader should be able to see the
 * current answer in the repo rather than in a deploy config.
 */

/**
 * Grab is paused across both consoles: its sidebar entries, dashboard cards,
 * monitoring pages, and its column/legend/breakdown in All Fleet Monitoring all
 * stay hidden, and the Grab routes redirect to the console's home.
 *
 * Money is never hidden: All Fleet's `Total Pemasukan`, its per-row `Total` and
 * its TOTAL row are the backend's own figures and still include Grab. With no
 * Grab imports in play that is Rp 0 — but if Grab data ever lands while this is
 * off, the visible per-source columns will read short of Total. That is the
 * honest direction to err, and the fix is to flip this back to `true`.
 */
// Annotated `boolean` on purpose: a `false` literal type would let TypeScript
// prune the enabled branches as dead and stop type-checking them, so the flag
// could not be flipped back without fixing rot first.
export const GRAB_ENABLED: boolean = false;
