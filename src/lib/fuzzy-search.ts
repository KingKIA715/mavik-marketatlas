/**
 * Lightweight fuzzy match scorer — no dependency, since this app has no
 * network access for npm installs during development and a full fuzzy
 * search library is overkill for matching against a few dozen asset names.
 *
 * Returns null when `target` doesn't match `query` at all. Otherwise
 * returns a score where higher is a better match, roughly:
 *   exact match > starts-with > substring > in-order subsequence (typo-tolerant)
 */
export function fuzzyScore(query: string, target: string): number | null {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 0;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 500 - t.length;
  const idx = t.indexOf(q);
  if (idx !== -1) return 250 - idx;

  // In-order subsequence match (e.g. "ntfy" matching "Nifty 50") — tolerates
  // typos and abbreviations the substring check above would miss.
  let ti = 0;
  let gaps = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti);
    if (found === -1) return null;
    gaps += found - ti;
    ti = found + 1;
  }
  return Math.max(1, 100 - gaps);
}
