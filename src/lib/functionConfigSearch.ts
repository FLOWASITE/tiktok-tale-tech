/**
 * Smart search engine for Function Configuration panel.
 * - Diacritics-insensitive (Vietnamese)
 * - Multi-field weighted scoring
 * - Levenshtein typo tolerance for tokens >= 4 chars
 * - Advanced operators: key:value (model:, provider:, tag:, status:, category:)
 */

import { normalizeVi } from './industrySearch';
import type { AIFunctionConfig, AIFunctionTag, AIFunctionType, ModelInfo } from '@/hooks/useAIConfig';

export interface SearchableFn {
  name: string;
  description: string;
  category: string;
  type: AIFunctionType;
  currentModel: string;
  tags?: AIFunctionTag[];
}

export type FunctionStatus = 'override' | 'default' | 'disabled';
export type FunctionProvider = ModelInfo['provider'];

export interface ParsedQuery {
  freeText: string;
  freeTokens: string[];
  ops: {
    model?: string[];
    provider?: string[];
    tag?: string[];
    status?: FunctionStatus[];
    category?: string[];
  };
}

const OP_KEYS = new Set(['model', 'provider', 'tag', 'status', 'category', 'cat']);

export function parseQuery(raw: string): ParsedQuery {
  const ops: ParsedQuery['ops'] = {};
  const freeBits: string[] = [];
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^([a-z]+):(.+)$/i);
    if (m && OP_KEYS.has(m[1].toLowerCase())) {
      const key = m[1].toLowerCase() === 'cat' ? 'category' : (m[1].toLowerCase() as keyof typeof ops);
      const value = m[2].toLowerCase();
      const arr = (ops[key] ||= [] as never) as string[];
      arr.push(value);
    } else {
      freeBits.push(part);
    }
  }
  const freeText = freeBits.join(' ');
  return {
    freeText,
    freeTokens: normalizeVi(freeText).split(' ').filter(Boolean),
    ops,
  };
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
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length];
}

interface ScoreField {
  text: string;
  weight: number;
}

function scoreField(field: ScoreField, freeText: string, tokens: string[]): number {
  const h = normalizeVi(field.text);
  if (!h) return 0;
  let score = 0;
  if (h === freeText) score += field.weight;
  else if (h.startsWith(freeText)) score += field.weight * 0.6;
  else if (h.includes(freeText)) score += field.weight * 0.4;

  const words = h.split(' ');
  for (const t of tokens) {
    if (!t) continue;
    if (h.includes(t)) score += 12;
    else if (t.length >= 4) {
      for (const w of words) {
        if (Math.abs(w.length - t.length) <= 2 && levenshtein(w, t) <= 2) {
          score += 6;
          break;
        }
      }
    }
  }
  return score;
}

export function getProviderFromModel(model: string, lookup?: (m: string) => ModelInfo): FunctionProvider {
  if (lookup) return lookup(model).provider;
  // Cheap fallback: parse prefix
  if (model.startsWith('9router/') || model.startsWith('ninerouter/')) return 'ninerouter';
  if (model.includes('qwen') || model.startsWith('dashscope/')) return 'dashscope';
  if (model.startsWith('geminigen/')) return 'geminigen';
  if (model.startsWith('poyo/')) return 'poyo';
  if (model.startsWith('kie/')) return 'kie';
  if (model.includes('/') && !model.startsWith('google/') && !model.startsWith('openai/'))
    return 'openrouter';
  return 'lovable';
}

export function getFunctionStatus(config?: AIFunctionConfig): FunctionStatus {
  if (config && !config.isEnabled) return 'disabled';
  if (config?.modelOverride) return 'override';
  return 'default';
}

export interface ScoredFn<T extends SearchableFn> {
  item: T;
  score: number;
}

export interface SearchOptions {
  query: string;
  configsMap: Map<string, AIFunctionConfig>;
  statusFilter?: FunctionStatus[];
  providerFilter?: FunctionProvider[];
  categoryFilter?: string[];
  /** Optional helper to resolve provider with full ModelInfo (more accurate). */
  getModelInfo?: (m: string) => ModelInfo;
}

export function smartSearchFunctions<T extends SearchableFn>(
  items: T[],
  opts: SearchOptions,
): ScoredFn<T>[] {
  const parsed = parseQuery(opts.query);
  const { freeText, freeTokens, ops } = parsed;
  const normalizedFreeText = normalizeVi(freeText);

  const results: ScoredFn<T>[] = [];

  for (const fn of items) {
    const config = opts.configsMap.get(fn.name);
    const effectiveModel = config?.modelOverride || fn.currentModel;
    const provider = getProviderFromModel(effectiveModel, opts.getModelInfo);
    const status = getFunctionStatus(config);

    // ---- Operator filters (AND) ----
    if (ops.model && !ops.model.some(v => effectiveModel.toLowerCase().includes(v))) continue;
    if (ops.provider && !ops.provider.some(v => provider.toLowerCase().includes(v))) continue;
    if (ops.tag && !ops.tag.some(v => fn.tags?.some(t => t.toLowerCase().includes(v))))
      continue;
    if (ops.status && !ops.status.includes(status)) continue;
    if (ops.category && !ops.category.some(v => fn.category.toLowerCase().includes(v))) continue;

    // ---- Chip filters (AND across groups, OR inside group) ----
    if (opts.statusFilter?.length && !opts.statusFilter.includes(status)) continue;
    if (opts.providerFilter?.length && !opts.providerFilter.includes(provider)) continue;
    if (opts.categoryFilter?.length && !opts.categoryFilter.includes(fn.category)) continue;

    // ---- Free-text scoring ----
    let score = 0;
    if (normalizedFreeText) {
      const fields: ScoreField[] = [
        { text: fn.name, weight: 100 },
        { text: fn.description, weight: 60 },
        { text: fn.category, weight: 40 },
        { text: fn.currentModel, weight: 50 },
        { text: config?.modelOverride || '', weight: 50 },
        { text: provider, weight: 30 },
        { text: (fn.tags || []).join(' '), weight: 40 },
      ];
      for (const f of fields) score += scoreField(f, normalizedFreeText, freeTokens);
      if (score === 0) continue;
    }

    results.push({ item: fn, score });
  }

  if (normalizedFreeText) results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Split text into segments for <mark> rendering.
 * Matches are diacritics-insensitive but original casing/diacritics are preserved.
 */
export function buildHighlightSegments(
  text: string,
  terms: string[],
): { text: string; match: boolean }[] {
  if (!text || !terms.length) return [{ text, match: false }];
  const normalized = normalizeVi(text);
  // Index map: position in normalized → position in original
  const indexMap: number[] = [];
  // normalizeVi may change length (đ → d). Build it character-by-character.
  // Safe approach: normalize each char individually and align.
  const original = text;
  let normRebuilt = '';
  for (let i = 0; i < original.length; i++) {
    const seg = normalizeVi(original[i]);
    for (let k = 0; k < seg.length; k++) indexMap.push(i);
    normRebuilt += seg;
  }
  // If rebuilt diverges from normalized (rare), fallback to no highlight
  if (normRebuilt.length !== normalized.length) return [{ text, match: false }];

  const ranges: [number, number][] = [];
  for (const term of terms) {
    if (!term) continue;
    let from = 0;
    while (true) {
      const idx = normRebuilt.indexOf(term, from);
      if (idx === -1) break;
      const startOrig = indexMap[idx];
      const endOrig = indexMap[idx + term.length - 1] + 1;
      ranges.push([startOrig, endOrig]);
      from = idx + term.length;
    }
  }
  if (!ranges.length) return [{ text, match: false }];

  // Merge overlapping ranges
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    if (ranges[i][0] <= last[1]) last[1] = Math.max(last[1], ranges[i][1]);
    else merged.push(ranges[i]);
  }

  const segments: { text: string; match: boolean }[] = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (s > cursor) segments.push({ text: text.slice(cursor, s), match: false });
    segments.push({ text: text.slice(s, e), match: true });
    cursor = e;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}
