/**
 * Bluesky-specific formatting utilities.
 * Bluesky renders PLAIN TEXT (no markdown) and counts GRAPHEMES (300 max).
 */

const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const MENTION_REGEX = /(@[a-z0-9][a-z0-9-]*\.[a-z0-9.-]+)/gi;

/**
 * Strip markdown that AI may have leaked into a Bluesky post.
 * - Removes **bold**, __bold__, *italic*, _italic_
 * - Strips leading "# ", "## ", "- ", "* ", "> "
 * - Converts [text](url) → "text url" (URL trên dòng riêng cuối nếu duy nhất)
 */
export function stripMarkdownForBluesky(input: string): string {
  if (!input) return '';
  let text = input;

  // [text](url) → text (url giữ lại, sẽ được auto-link)
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 $2');

  // Bold/italic markers
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1');
  text = text.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '$1');

  // Inline code / code fences
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');

  // Leading block markers per line
  text = text
    .split('\n')
    .map((line) => line.replace(/^\s{0,3}(?:#{1,6}\s+|[-*+]\s+|>\s+)/, ''))
    .join('\n');

  // Collapse 3+ newlines to 2
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

/** Trả về URL đầu tiên trong text (dùng cho embed card). */
export function extractFirstUrl(input: string): string | null {
  if (!input) return null;
  const match = input.match(URL_REGEX);
  return match ? match[0] : null;
}

/** Lấy domain từ URL để hiển thị trên embed card. */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Đếm grapheme chuẩn Bluesky (1 emoji = 1 grapheme).
 * Fallback về Array.from nếu Intl.Segmenter không có.
 */
export function countGraphemes(text: string): number {
  if (!text) return 0;
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    const seg = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
    let count = 0;
    for (const _ of seg.segment(text)) count++;
    return count;
  }
  return Array.from(text).length;
}

/**
 * Tách text Bluesky thành các segment để render: text | link | mention.
 */
export type BlueskySegment =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string }
  | { type: 'mention'; value: string };

export function segmentBlueskyText(input: string): BlueskySegment[] {
  if (!input) return [];
  const tokenRegex = /(https?:\/\/[^\s]+|@[a-z0-9][a-z0-9-]*\.[a-z0-9.-]+)/gi;
  const segments: BlueskySegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: input.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith('@')) {
      segments.push({ type: 'mention', value: token });
    } else {
      segments.push({ type: 'link', value: token });
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < input.length) {
    segments.push({ type: 'text', value: input.slice(lastIndex) });
  }
  return segments;
}

export const BLUESKY_MAX_GRAPHEMES = 300;
