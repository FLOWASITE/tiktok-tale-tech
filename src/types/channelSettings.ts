import { Channel } from './multichannel';

export interface ChannelSettings {
  // Length constraints
  min_length?: number;           // Số chữ tối thiểu
  max_length: number;            // Số chữ/ký tự tối đa
  length_unit: 'words' | 'chars'; // Đơn vị đo
  
  // Content Structure
  hook_required: boolean;        // Bắt buộc có hook
  hook_style?: string;           // Kiểu hook (giật tít / nhẹ / không)
  bullet_allowed: boolean;       // Cho phép bullet points
  cta_policy: 'required' | 'optional' | 'soft' | 'none';
  has_subject_line?: boolean;    // Email subject
  
  // Formatting Rules
  emoji_allowed: boolean;        // Cho phép emoji
  emoji_limit?: number;          // Giới hạn số emoji (0 = không)
  hashtag_limit: number;         // Giới hạn số hashtag (0 = không)
  hashtag_position?: 'none' | 'end' | 'inline'; // Vị trí hashtag
  line_break_style: 'many' | 'short' | 'normal' | 'minimal';
  
  // Link Policy
  link_position: 'body' | 'end' | 'allowed' | 'none';
  
  // Tone Adjustment
  tone_adjustment: 'keep' | 'shorten' | 'concise';
  
  // Format type
  format_type?: 'markdown' | 'plain' | 'thread' | 'notification';
  format_description?: string;   // Mô tả format chi tiết
}

// Default settings cho mỗi kênh - Chi tiết theo Social Channel Settings Engine
export const DEFAULT_CHANNEL_SETTINGS: Record<Channel, ChannelSettings> = {
  website: {
    min_length: 800,
    max_length: 1500,
    length_unit: 'words',
    hook_required: false,
    hook_style: 'không cần giật tít',
    bullet_allowed: true,
    cta_policy: 'soft',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'body',
    tone_adjustment: 'keep',
    format_type: 'markdown',
    format_description: 'Cấu trúc H1–H3 rõ ràng, Markdown format',
  },
  blogger: {
    min_length: 800,
    max_length: 1500,
    length_unit: 'words',
    hook_required: false,
    hook_style: 'không cần giật tít',
    bullet_allowed: true,
    cta_policy: 'soft',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'body',
    tone_adjustment: 'keep',
    format_type: 'markdown',
    format_description: 'Cấu trúc H1–H3 rõ ràng, Markdown format',
  },
  wordpress: {
    min_length: 800,
    max_length: 1500,
    length_unit: 'words',
    hook_required: false,
    hook_style: 'không cần giật tít',
    bullet_allowed: true,
    cta_policy: 'soft',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'body',
    tone_adjustment: 'keep',
    format_type: 'markdown',
    format_description: 'Cấu trúc H1–H3 rõ ràng, Markdown format',
  },
  facebook: {
    min_length: 250,
    max_length: 400,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'BẮT BUỘC 2 dòng đầu là hook mạnh, gây tò mò',
    bullet_allowed: true,
    cta_policy: 'optional',
    emoji_allowed: true,
    emoji_limit: 3,
    hashtag_limit: 3,
    hashtag_position: 'end',
    line_break_style: 'short',
    link_position: 'body',
    tone_adjustment: 'keep',
    format_type: 'plain',
    format_description: 'Xuống dòng ngắn, chia đoạn 2-3 dòng, nội dung chi tiết và đầy đủ',
  },
  instagram: {
    min_length: 50,
    max_length: 150,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'hook ngắn gọn',
    bullet_allowed: false,
    cta_policy: 'optional',
    emoji_allowed: true,
    emoji_limit: 5,
    hashtag_limit: 5,
    hashtag_position: 'end',
    line_break_style: 'many',
    link_position: 'none',
    tone_adjustment: 'concise',
    format_type: 'plain',
    format_description: 'Nhiều xuống dòng, KHÔNG chèn hashtag trong body',
  },
  pinterest: {
    min_length: 50,
    max_length: 150,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'hook ngắn gọn',
    bullet_allowed: false,
    cta_policy: 'optional',
    emoji_allowed: true,
    emoji_limit: 5,
    hashtag_limit: 5,
    hashtag_position: 'end',
    line_break_style: 'many',
    link_position: 'none',
    tone_adjustment: 'concise',
    format_type: 'plain',
    format_description: 'Nhiều xuống dòng, KHÔNG chèn hashtag trong body',
  },
  twitter: {
    min_length: 0,
    max_length: 280,
    length_unit: 'chars',
    hook_required: true,
    hook_style: 'quan điểm ngay câu đầu',
    bullet_allowed: false,
    cta_policy: 'none',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 1,
    hashtag_position: 'end',
    line_break_style: 'minimal',
    link_position: 'allowed',
    tone_adjustment: 'concise',
    format_type: 'thread',
    format_description: 'Thread 5-7 tweets, mỗi tweet ≤280 ký tự, đánh số 1/, 2/...',
  },
  google_maps: {
    min_length: 80,
    max_length: 150,
    length_unit: 'words',
    hook_required: false,
    hook_style: 'không',
    bullet_allowed: false,
    cta_policy: 'none',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'none',
    tone_adjustment: 'keep',
    format_type: 'plain',
    format_description: 'Thực tế, xác thực, khách quan',
  },
  linkedin: {
    min_length: 150,
    max_length: 400,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'nhẹ, không giật tít',
    bullet_allowed: true,
    cta_policy: 'soft',
    emoji_allowed: true,
    emoji_limit: 2,
    hashtag_limit: 3,
    hashtag_position: 'end',
    line_break_style: 'normal',
    link_position: 'allowed',
    tone_adjustment: 'keep',
    format_type: 'plain',
    format_description: 'Chuyên nghiệp, rõ đoạn, B2B authority',
  },
  email: {
    min_length: 150,
    max_length: 400,
    length_unit: 'words',
    hook_required: false,
    bullet_allowed: true,
    cta_policy: 'required',
    has_subject_line: true,
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'body',
    tone_adjustment: 'keep',
    format_type: 'plain',
    format_description: 'Có Subject line, đoạn ngắn, dễ đọc, CTA rõ nhưng không spam',
  },
  youtube: {
    min_length: 500,
    max_length: 800,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'hook 5 giây đầu',
    bullet_allowed: true,
    cta_policy: 'required',
    emoji_allowed: true,
    emoji_limit: 3,
    hashtag_limit: 5,
    hashtag_position: 'end',
    line_break_style: 'normal',
    link_position: 'body',
    tone_adjustment: 'keep',
    format_type: 'markdown',
    format_description: 'Script 3-5 phút với Hook + Intro + Content + CTA + Outro',
  },
  zalo_oa: {
    min_length: 60,
    max_length: 150,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'trực diện, không giật tít',
    bullet_allowed: false,
    cta_policy: 'required',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'short',
    link_position: 'allowed',
    tone_adjustment: 'concise',
    format_type: 'notification',
    format_description: 'Thông báo rõ việc, thân thiện local',
  },
  telegram: {
    min_length: 100,
    max_length: 500,
    length_unit: 'words',
    hook_required: false,
    hook_style: 'không cần giật',
    bullet_allowed: true,
    cta_policy: 'optional',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'allowed',
    tone_adjustment: 'keep',
    format_type: 'plain',
    format_description: 'Bullet, dễ đọc, linh hoạt',
  },
  tiktok: {
    min_length: 50,
    max_length: 150,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'Hook 3 giây đầu GÂY SỐC hoặc GÂY TÒ MÒ',
    bullet_allowed: false,
    cta_policy: 'optional',
    emoji_allowed: true,
    emoji_limit: 5,
    hashtag_limit: 5,
    hashtag_position: 'end',
    line_break_style: 'short',
    link_position: 'none',
    tone_adjustment: 'concise',
    format_type: 'plain',
    format_description: 'Script video ngắn 15-60s, câu ngắn, action-oriented, trending hashtag',
  },
  threads: {
    min_length: 0,
    max_length: 500,
    length_unit: 'chars',
    hook_required: true,
    hook_style: 'Mở đầu với quan điểm mạnh hoặc câu hỏi',
    bullet_allowed: false,
    cta_policy: 'none',
    emoji_allowed: true,
    emoji_limit: 3,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'none',
    tone_adjustment: 'concise',
    format_type: 'plain',
    format_description: 'Text thuần, casual, conversational, không hashtag',
  },
  bluesky: {
    min_length: 0,
    max_length: 300,
    length_unit: 'chars',
    hook_required: true,
    hook_style: 'Mở đầu thu hút, ngắn gọn',
    bullet_allowed: false,
    cta_policy: 'none',
    emoji_allowed: true,
    emoji_limit: 3,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'body',
    tone_adjustment: 'concise',
    format_type: 'plain',
    format_description: 'Post ngắn 300 ký tự, casual, conversational. Tối đa 4 ảnh.',
  },
};

// Helper: Build chi tiết rules prompt cho AI từ settings
export function buildChannelRulesPrompt(
  channel: Channel,
  settings: ChannelSettings,
  brandAllowEmoji: boolean
): string {
  const parts: string[] = [];
  
  // Channel name
  parts.push(`### ${channel.toUpperCase()}`);
  
  // Length
  const lengthLabel = settings.length_unit === 'chars' ? 'ký tự' : 'chữ';
  if (settings.min_length) {
    parts.push(`- Độ dài: ${settings.min_length}–${settings.max_length} ${lengthLabel}`);
  } else {
    parts.push(`- Độ dài: Tối đa ${settings.max_length} ${lengthLabel}`);
  }
  
  // Hook
  if (settings.hook_required) {
    parts.push(`- Hook: ${settings.hook_style || 'BẮT BUỘC'}`);
  } else {
    parts.push(`- Hook: ${settings.hook_style || 'Không bắt buộc'}`);
  }
  
  // CTA
  const ctaLabels: Record<string, string> = {
    required: 'Bắt buộc, rõ ràng',
    soft: 'Có nhưng mềm, không bán',
    optional: 'Tuỳ chọn',
    none: 'Không có CTA bán hàng',
  };
  parts.push(`- CTA: ${ctaLabels[settings.cta_policy] || settings.cta_policy}`);
  
  // Emoji - Brand Voice overrides
  if (!brandAllowEmoji) {
    parts.push(`- Emoji: KHÔNG (Brand Voice yêu cầu)`);
  } else if (settings.emoji_allowed) {
    parts.push(`- Emoji: Cho phép, tối đa ${settings.emoji_limit || 3}`);
  } else {
    parts.push(`- Emoji: KHÔNG`);
  }
  
  // Hashtag
  if (settings.hashtag_limit > 0) {
    const posLabel = settings.hashtag_position === 'end' ? 'cuối bài' : 'trong bài';
    parts.push(`- Hashtag: Tối đa ${settings.hashtag_limit}, đặt ${posLabel}`);
  } else {
    parts.push(`- Hashtag: KHÔNG`);
  }
  
  // Link
  const linkLabels: Record<string, string> = {
    body: 'Cho phép trong bài',
    end: 'Cuối bài',
    allowed: 'Có thể',
    none: 'KHÔNG link',
  };
  parts.push(`- Link: ${linkLabels[settings.link_position] || settings.link_position}`);
  
  // Format description
  if (settings.format_description) {
    parts.push(`- Format: ${settings.format_description}`);
  }
  
  // Subject line for email
  if (settings.has_subject_line) {
    parts.push(`- Bao gồm Subject line hấp dẫn (không spam trigger)`);
  }
  
  return parts.join('\n');
}

// Helper: Tạo prompt tổng hợp cho nhiều kênh
export function buildAllChannelRulesPrompt(
  channels: Channel[],
  brandAllowEmoji: boolean
): string {
  return channels
    .map(ch => buildChannelRulesPrompt(ch, DEFAULT_CHANNEL_SETTINGS[ch], brandAllowEmoji))
    .join('\n\n');
}

// Helper: Merge channel settings with brand overrides
export function mergeChannelSettings(
  channel: Channel,
  channelOverrides: Record<string, Partial<ChannelSettings>> | null | undefined
): ChannelSettings {
  const defaults = DEFAULT_CHANNEL_SETTINGS[channel];
  if (!channelOverrides || !channelOverrides[channel]) {
    return defaults;
  }
  return { ...defaults, ...channelOverrides[channel] };
}

// Helper: Get display string for channel length (dynamic from brand overrides)
export function getChannelLengthDisplay(
  channel: Channel,
  channelOverrides: Record<string, Partial<ChannelSettings>> | null | undefined
): string {
  const settings = mergeChannelSettings(channel, channelOverrides);
  const unitLabel = settings.length_unit === 'chars' ? 'ký tự' : 'từ';
  
  // Special cases for specific channels
  if (channel === 'twitter') {
    const hasOverride = channelOverrides?.[channel]?.min_length || channelOverrides?.[channel]?.max_length;
    if (hasOverride) {
      return `Thread ${settings.min_length}-${settings.max_length} tweets`;
    }
    return 'Thread 5-7 tweets';
  }
  if (channel === 'youtube') return `Script ${settings.min_length}-${settings.max_length} từ`;
  
  if (settings.min_length) {
    return `${settings.min_length}-${settings.max_length} ${unitLabel}`;
  }
  return `Tối đa ${settings.max_length} ${unitLabel}`;
}

// Base channel config (without description - will be computed dynamically)
export const BASE_CHANNEL_CONFIG: Record<Channel, {
  label: string;
  color: string;
  bgColor: string;
  descriptionSuffix: string;
}> = {
  website: { label: 'Website/Blog', color: 'text-blue-400', bgColor: 'bg-blue-500/10', descriptionSuffix: 'SEO optimized' },
  blogger: { label: 'Website/Blog', color: 'text-blue-400', bgColor: 'bg-blue-500/10', descriptionSuffix: 'SEO optimized' },
  wordpress: { label: 'Website/Blog', color: 'text-blue-400', bgColor: 'bg-blue-500/10', descriptionSuffix: 'SEO optimized' },
  facebook: { label: 'Facebook', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', descriptionSuffix: 'hook + emoji' },
  instagram: { label: 'Instagram', color: 'text-pink-400', bgColor: 'bg-pink-500/10', descriptionSuffix: 'visual-first' },
  pinterest: { label: 'Pinterest', color: 'text-[#E60023]', bgColor: 'bg-[#E60023]/10', descriptionSuffix: 'Pin SEO, vertical 2:3' },
  twitter: { label: 'X (Twitter)', color: 'text-slate-400', bgColor: 'bg-slate-500/10', descriptionSuffix: '' },
  linkedin: { label: 'LinkedIn', color: 'text-sky-400', bgColor: 'bg-sky-500/10', descriptionSuffix: 'professional' },
  youtube: { label: 'YouTube', color: 'text-red-400', bgColor: 'bg-red-500/10', descriptionSuffix: '' },
  email: { label: 'Email', color: 'text-amber-400', bgColor: 'bg-amber-500/10', descriptionSuffix: 'subject + CTA' },
  google_maps: { label: 'Google Maps', color: 'text-green-400', bgColor: 'bg-green-500/10', descriptionSuffix: 'review style' },
  zalo_oa: { label: 'Zalo OA', color: 'text-blue-400', bgColor: 'bg-blue-500/10', descriptionSuffix: 'mobile-first' },
  telegram: { label: 'Telegram', color: 'text-sky-400', bgColor: 'bg-sky-500/10', descriptionSuffix: 'community' },
  tiktok: { label: 'TikTok', color: 'text-pink-400', bgColor: 'bg-pink-500/10', descriptionSuffix: 'short script' },
  threads: { label: 'Threads', color: 'text-slate-400', bgColor: 'bg-slate-500/10', descriptionSuffix: 'conversational' },
  bluesky: { label: 'Bluesky', color: 'text-[#0085FF]', bgColor: 'bg-[#0085FF]/10', descriptionSuffix: 'short post 300 chars' },
};

// Helper: Get full channel description with dynamic length from brand overrides
export function getChannelDescription(
  channel: Channel,
  channelOverrides?: Record<string, Partial<ChannelSettings>> | null
): string {
  const baseConfig = BASE_CHANNEL_CONFIG[channel];
  const lengthDisplay = getChannelLengthDisplay(channel, channelOverrides);
  
  if (baseConfig.descriptionSuffix) {
    return `${lengthDisplay}, ${baseConfig.descriptionSuffix}`;
  }
  return lengthDisplay;
}
