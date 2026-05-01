import { useMemo } from 'react';
import { ChannelSettings, DEFAULT_CHANNEL_SETTINGS } from '@/types/channelSettings';
import { Channel } from '@/types/multichannel';
import { LucideIcon } from 'lucide-react';

export interface ComplianceIssue {
  type: 'length' | 'hook' | 'cta' | 'emoji' | 'hashtag';
  severity: 'warning' | 'error';
  message: string;
  suggestion: string;
  autoFixInstruction: string;
}

export interface ContentAnalysis {
  wordCount: number;
  charCount: number;
  emojiCount: number;
  hashtagCount: number;
  hasHook: boolean;
  hasCTA: boolean;
  issues: ComplianceIssue[];
  isCompliant: boolean;
}

function countWords(text: string): number {
  if (typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countCharacters(text: string): number {
  if (typeof text !== 'string') return 0;
  return text.length;
}

function countEmojis(text: string): number {
  if (typeof text !== 'string') return 0;
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
  const matches = text.match(emojiRegex);
  return matches ? matches.length : 0;
}

function countHashtags(text: string): number {
  if (typeof text !== 'string') return 0;
  const hashtagRegex = /#\w+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.length : 0;
}

function detectHook(text: string): boolean {
  if (typeof text !== 'string') return false;
  // Check first 2 lines for hook patterns
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return false;
  
  const firstTwoLines = lines.slice(0, 2).join(' ').toLowerCase();
  
  // Hook indicators: questions, strong statements, numbers, emojis at start
  const hookPatterns = [
    /^[🔥💡🚀✨⚡️❗️❓🎯]/,  // Starts with emoji
    /^\d+/,                    // Starts with number
    /\?/,                      // Contains question
    /^(bạn|có bao giờ|bí quyết|cách|tại sao|làm sao|ai|gì|nào)/i, // Question words
    /^(đừng|hãy|stop|attention|breaking)/i, // Imperative/attention
  ];
  
  return hookPatterns.some(pattern => pattern.test(firstTwoLines));
}

function detectCTA(text: string): boolean {
  if (typeof text !== 'string') return false;
  const ctaPatterns = [
    /đăng ký|đăng kí|subscribe/i,
    /liên hệ|contact/i,
    /mua ngay|order now|buy now/i,
    /click|nhấn|bấm/i,
    /tìm hiểu|learn more/i,
    /xem thêm|read more|see more/i,
    /inbox|dm|nhắn tin/i,
    /gọi|call/i,
    /theo dõi|follow/i,
    /share|chia sẻ/i,
    /comment|bình luận/i,
    /link (trong|ở|tại) bio/i,
    /👇|⬇️|↓/,
  ];
  
  return ctaPatterns.some(pattern => pattern.test(text));
}

export function analyzeContent(
  content: string, 
  channel: Channel, 
  brandAllowEmoji: boolean = true,
  channelOverrides?: Partial<ChannelSettings>
): ContentAnalysis {
  const defaultSettings = DEFAULT_CHANNEL_SETTINGS[channel];
  const settings: ChannelSettings = {
    ...defaultSettings,
    ...channelOverrides,
  };
  
  const wordCount = countWords(content);
  // Bluesky đếm grapheme (1 emoji = 1), không phải char.
  let charCount = countCharacters(content);
  if (channel === 'bluesky' && typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    const seg = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
    let n = 0;
    for (const _ of seg.segment(content || '')) n++;
    charCount = n;
  }
  const emojiCount = countEmojis(content);
  const hashtagCount = countHashtags(content);
  const hasHook = detectHook(content);
  const hasCTA = detectCTA(content);
  
  const issues: ComplianceIssue[] = [];
  
  // Length check
  const currentLength = settings.length_unit === 'chars' ? charCount : wordCount;
  const unit = settings.length_unit === 'chars' ? 'ký tự' : 'chữ';
  
  if (currentLength > settings.max_length) {
    const over = currentLength - settings.max_length;
    issues.push({
      type: 'length',
      severity: 'error',
      message: `Vượt ${over} ${unit}`,
      suggestion: `Cần rút gọn còn dưới ${settings.max_length} ${unit}`,
      autoFixInstruction: `Rút gọn nội dung xuống còn khoảng ${settings.max_length} ${unit}, giữ nguyên ý chính và format`,
    });
  } else if (settings.min_length && currentLength < settings.min_length) {
    const under = settings.min_length - currentLength;
    issues.push({
      type: 'length',
      severity: 'warning',
      message: `Thiếu ${under} ${unit}`,
      suggestion: `Nên bổ sung thêm nội dung`,
      autoFixInstruction: `Bổ sung thêm nội dung chi tiết để đạt khoảng ${settings.min_length}-${settings.max_length} ${unit}`,
    });
  }
  
  // Hook check
  if (settings.hook_required && !hasHook) {
    issues.push({
      type: 'hook',
      severity: 'warning',
      message: 'Thiếu hook mở đầu',
      suggestion: settings.hook_style || 'Thêm câu hook thu hút ở đầu bài',
      autoFixInstruction: `Thêm hook mạnh vào 1-2 dòng đầu tiên theo style: ${settings.hook_style || 'thu hút, gây tò mò'}`,
    });
  }
  
  // CTA check
  if (settings.cta_policy === 'required' && !hasCTA) {
    issues.push({
      type: 'cta',
      severity: 'warning',
      message: 'Thiếu Call-to-Action',
      suggestion: 'Thêm CTA rõ ràng',
      autoFixInstruction: 'Thêm call-to-action rõ ràng, phù hợp với nội dung và mục tiêu bài viết',
    });
  }
  
  // Emoji check
  const effectiveEmojiAllowed = brandAllowEmoji && settings.emoji_allowed;
  if (!effectiveEmojiAllowed && emojiCount > 0) {
    issues.push({
      type: 'emoji',
      severity: 'warning',
      message: `Có ${emojiCount} emoji không nên dùng`,
      suggestion: 'Xóa emoji theo quy tắc brand/kênh',
      autoFixInstruction: 'Xóa tất cả emoji trong nội dung, giữ nguyên các phần còn lại',
    });
  } else if (effectiveEmojiAllowed && settings.emoji_limit && emojiCount > settings.emoji_limit) {
    const over = emojiCount - settings.emoji_limit;
    issues.push({
      type: 'emoji',
      severity: 'warning',
      message: `Vượt ${over} emoji`,
      suggestion: `Giảm xuống còn ${settings.emoji_limit} emoji`,
      autoFixInstruction: `Giảm số emoji xuống còn tối đa ${settings.emoji_limit}, giữ lại những emoji phù hợp nhất`,
    });
  }
  
  // Hashtag check
  if (settings.hashtag_limit === 0 && hashtagCount > 0) {
    issues.push({
      type: 'hashtag',
      severity: 'warning',
      message: `Có ${hashtagCount} hashtag không nên dùng`,
      suggestion: 'Xóa hashtag theo quy tắc kênh',
      autoFixInstruction: 'Xóa tất cả hashtag trong nội dung',
    });
  } else if (settings.hashtag_limit > 0 && hashtagCount > settings.hashtag_limit) {
    const over = hashtagCount - settings.hashtag_limit;
    issues.push({
      type: 'hashtag',
      severity: 'warning',
      message: `Vượt ${over} hashtag`,
      suggestion: `Giảm xuống còn ${settings.hashtag_limit} hashtag`,
      autoFixInstruction: `Giảm số hashtag xuống còn tối đa ${settings.hashtag_limit}, giữ lại những hashtag liên quan nhất`,
    });
  }
  
  return {
    wordCount,
    charCount,
    emojiCount,
    hashtagCount,
    hasHook,
    hasCTA,
    issues,
    isCompliant: issues.filter(i => i.severity === 'error').length === 0,
  };
}

export function useContentAnalysis(
  content: string,
  channel: Channel,
  brandAllowEmoji: boolean = true,
  channelOverrides?: Partial<ChannelSettings>
): ContentAnalysis {
  return useMemo(
    () => analyzeContent(content, channel, brandAllowEmoji, channelOverrides),
    [content, channel, brandAllowEmoji, channelOverrides]
  );
}
