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
 * Tách text Bluesky thành segment khớp với facets ở publish-bluesky:
 * text | link (full URL) | bareLink (domain) | mention | hashtag.
 * Đảm bảo preview = output thật khi publish.
 */
export type BlueskySegment =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string }
  | { type: 'bareLink'; value: string }
  | { type: 'mention'; value: string }
  | { type: 'hashtag'; value: string };

export function segmentBlueskyText(input: string): BlueskySegment[] {
  if (!input) return [];
  const tokenRegex = new RegExp(
    [
      'https?:\\/\\/[^\\s<>")\\]]+',
      '@[a-zA-Z0-9][a-zA-Z0-9._-]*\\.[a-zA-Z][a-zA-Z0-9.-]*',
      '#[a-zA-Z0-9_\\u00C0-\\u024F\\u1E00-\\u1EFF]+',
      '(?:[a-z0-9-]+\\.)+(?:com|net|org|io|ai|co|app|dev|xyz|one|vn|me|so|cloud|tech|store|shop|blog|news|info|gg|to)(?:\\/[^\\s<>")\\]]*)?',
    ].join('|'),
    'gi'
  );

  const segments: BlueskySegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(input)) !== null) {
    const token = match[0];
    const prevChar = input[match.index - 1] || '';

    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: input.slice(lastIndex, match.index) });
    }

    if (token.startsWith('http')) {
      const trimmed = token.replace(/[.,;:!?)\]]+$/, '');
      segments.push({ type: 'link', value: trimmed });
      if (trimmed.length < token.length) {
        segments.push({ type: 'text', value: token.slice(trimmed.length) });
      }
    } else if (token.startsWith('@')) {
      segments.push({ type: 'mention', value: token });
    } else if (token.startsWith('#')) {
      if (/^#\d+$/.test(token)) {
        segments.push({ type: 'text', value: token });
      } else {
        segments.push({ type: 'hashtag', value: token });
      }
    } else {
      // bare domain — skip nếu là email/path/subdomain noise
      if (prevChar === '@' || prevChar === '/' || prevChar === '.') {
        segments.push({ type: 'text', value: token });
      } else {
        segments.push({ type: 'bareLink', value: token });
      }
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < input.length) {
    segments.push({ type: 'text', value: input.slice(lastIndex) });
  }
  return segments;
}

export const BLUESKY_MAX_GRAPHEMES = 300;
