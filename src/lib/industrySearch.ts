/**
 * Smart search helpers for industry selection.
 * - Removes Vietnamese diacritics
 * - Token-based scoring against name + shortName + code + aliases
 * - Tiny Levenshtein for typo tolerance on short queries
 */

export function normalizeVi(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(input: string): string[] {
  return normalizeVi(input).split(' ').filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp: number[] = Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length];
}

export interface ScorableItem {
  name: string;
  shortName?: string | null;
  code: string;
  aliases?: string[];
}

/**
 * Returns 0 if no match, higher = better match.
 */
export function smartScore(item: ScorableItem, query: string): number {
  const q = normalizeVi(query);
  if (!q) return 0;

  const tokens = tokenize(query);
  const haystacks = [
    normalizeVi(item.name),
    item.shortName ? normalizeVi(item.shortName) : '',
    normalizeVi(item.code),
    ...(item.aliases || []).map(normalizeVi),
  ].filter(Boolean);

  let score = 0;
  for (const h of haystacks) {
    if (!h) continue;
    if (h === q) score += 100;
    else if (h.startsWith(q)) score += 60;
    else if (h.includes(q)) score += 40;

    // token-level
    for (const t of tokens) {
      if (!t) continue;
      if (h.includes(t)) score += 12;
      else if (t.length >= 4) {
        // typo tolerance for tokens of length >= 4
        const hWords = h.split(' ');
        for (const w of hWords) {
          if (Math.abs(w.length - t.length) <= 2 && levenshtein(w, t) <= 2) {
            score += 6;
            break;
          }
        }
      }
    }
  }
  return score;
}

export function smartFilter<T extends ScorableItem>(items: T[], query: string): T[] {
  if (!query.trim()) return items;
  return items
    .map(item => ({ item, score: smartScore(item, query) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.item);
}
