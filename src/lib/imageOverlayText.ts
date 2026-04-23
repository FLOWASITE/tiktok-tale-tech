import type { Channel, GlobalHook, MultiChannelSelectedHook } from '@/types/multichannel';

export const IMAGE_OVERLAY_TEXT_LIMITS = {
  maxChars: 68,
  maxWords: 12,
  minChars: 4,
} as const;

export type OverlayTextSource = 'text_overlay' | 'opening_line' | 'trimmed_summary' | 'suppressed';

export interface OverlayTextResult {
  text: string | null;
  source: OverlayTextSource;
  length: number;
  suppressedBecauseTooLong: boolean;
  reason?: 'text_too_long' | 'no_short_hook_available' | 'auto_downgraded_to_background_only';
}

interface ResolveOverlayTextInput {
  channel?: Channel;
  channelContent?: string | null;
  selectedHooks?: MultiChannelSelectedHook[] | null;
  globalHook?: GlobalHook | null;
}

function stripMarkdownAndNoise(input: string): string {
  return input
    .replace(/#{1,6}\s?/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[•▪◦·]+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimSentence(input: string): string {
  const cleaned = stripMarkdownAndNoise(input);
  if (!cleaned) return '';
  const firstSentence = cleaned.match(/^[^.!?\n]+[.!?]?/u)?.[0]?.trim() || cleaned;
  return firstSentence.replace(/[.!?]+$/u, '').trim();
}

function normalizeOverlayCandidate(input: string): string {
  return trimSentence(input)
    .replace(/^[\-–—:;,.\s]+|[\-–—:;,.\s]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function countWords(input: string): number {
  return input.split(/\s+/).filter(Boolean).length;
}

export function isValidOverlayText(input: string | null | undefined): boolean {
  if (!input) return false;
  const text = normalizeOverlayCandidate(input);
  if (text.length < IMAGE_OVERLAY_TEXT_LIMITS.minChars) return false;
  if (text.length > IMAGE_OVERLAY_TEXT_LIMITS.maxChars) return false;
  if (countWords(text) > IMAGE_OVERLAY_TEXT_LIMITS.maxWords) return false;
  return true;
}

function truncateOverlaySummary(input: string): string | null {
  const cleaned = normalizeOverlayCandidate(input);
  if (!cleaned) return null;
  const sentence = cleaned.split(/(?<=[.!?])\s+/u)[0] || cleaned;
  const compact = sentence.slice(0, IMAGE_OVERLAY_TEXT_LIMITS.maxChars + 20).trim();
  const words = compact.split(/\s+/).filter(Boolean);
  const limitedWords = words.slice(0, IMAGE_OVERLAY_TEXT_LIMITS.maxWords).join(' ');
  const finalText = limitedWords.slice(0, IMAGE_OVERLAY_TEXT_LIMITS.maxChars).trim();
  return isValidOverlayText(finalText) ? finalText : null;
}

export function resolveOverlayText(input: ResolveOverlayTextInput): OverlayTextResult {
  const channelHook = input.channel ? input.selectedHooks?.find((hook) => hook.channel === input.channel) : undefined;
  const candidates: Array<{ value?: string | null; source: Exclude<OverlayTextSource, 'suppressed'> }> = [
    { value: channelHook?.text_overlay, source: 'text_overlay' },
    { value: input.globalHook?.text_overlay, source: 'text_overlay' },
    { value: channelHook?.opening_line, source: 'opening_line' },
    { value: input.globalHook?.opening_line, source: 'opening_line' },
  ];

  let sawTooLong = false;

  for (const candidate of candidates) {
    if (!candidate.value) continue;
    const normalized = normalizeOverlayCandidate(candidate.value);
    if (isValidOverlayText(normalized)) {
      return {
        text: normalized,
        source: candidate.source,
        length: normalized.length,
        suppressedBecauseTooLong: false,
      };
    }

    if (normalized.length > IMAGE_OVERLAY_TEXT_LIMITS.maxChars || countWords(normalized) > IMAGE_OVERLAY_TEXT_LIMITS.maxWords) {
      sawTooLong = true;
    }
  }

  const trimmedSummary = truncateOverlaySummary(input.channelContent || '');
  if (trimmedSummary) {
    return {
      text: trimmedSummary,
      source: 'trimmed_summary',
      length: trimmedSummary.length,
      suppressedBecauseTooLong: false,
    };
  }

  return {
    text: null,
    source: 'suppressed',
    length: 0,
    suppressedBecauseTooLong: sawTooLong,
    reason: sawTooLong ? 'text_too_long' : 'no_short_hook_available',
  };
}