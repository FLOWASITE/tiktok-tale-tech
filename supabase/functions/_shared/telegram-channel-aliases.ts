// Single source of truth: alias map cho channel keys trong Telegram bot.
// Ánh xạ mọi cách user gọi (FB, fb, fanpage, gg business, gbp...) → channel key chuẩn
// (khớp với generate-multichannel + multi_channel_contents.selected_channels + channelColors.ts).

export const CHANNEL_ALIASES: Record<string, string> = {
  // Facebook
  fb: "facebook", facebook: "facebook", fanpage: "facebook", "face book": "facebook",
  // Instagram
  ig: "instagram", insta: "instagram", instagram: "instagram",
  // X / Twitter (DB key = twitter)
  x: "twitter", twitter: "twitter", tweet: "twitter", "x.com": "twitter",
  // LinkedIn
  li: "linkedin", linkedin: "linkedin", "linked in": "linkedin",
  // TikTok
  tt: "tiktok", tiktok: "tiktok", "tik tok": "tiktok",
  // Threads
  threads: "threads", thread: "threads",
  // YouTube
  yt: "youtube", youtube: "youtube", "you tube": "youtube",
  // Website / Blog
  web: "website", website: "website", blog: "website", "trang web": "website",
  // Zalo OA (DB key = zalo_oa)
  zalo: "zalo_oa", oa: "zalo_oa", "zalo oa": "zalo_oa", zalo_oa: "zalo_oa",
  // Google Business (DB key = google_maps)
  gbp: "google_maps", "gg business": "google_maps", "google business": "google_maps",
  "google my business": "google_maps", "google maps": "google_maps", gmb: "google_maps",
  google_maps: "google_maps",
  // Email
  email: "email", mail: "email", newsletter: "email",
};

export const SUPPORTED_TG_CHANNELS = [
  "facebook", "instagram", "twitter", "linkedin", "tiktok", "threads",
  "youtube", "website", "zalo_oa", "google_maps", "email",
] as const;

export type SupportedTgChannel = typeof SUPPORTED_TG_CHANNELS[number];

export function normalizeChannel(input: string | undefined | null): string {
  if (!input) return "";
  const k = String(input).toLowerCase().trim();
  if (CHANNEL_ALIASES[k]) return CHANNEL_ALIASES[k];
  return (SUPPORTED_TG_CHANNELS as readonly string[]).includes(k) ? k : "";
}

// Quét raw user message để bắt kênh ngay cả khi AI miss enum.
// Match cụm dài trước (vd "google business" trước "google") để tránh false-positive.
export function extractChannelFromText(text: string): string {
  if (!text) return "";
  const t = text.toLowerCase();
  const sortedKeys = Object.keys(CHANNEL_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of sortedKeys) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // \b không hoạt động tốt với cụm có space ở giữa → dùng lookaround
    const re = new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "i");
    if (re.test(t)) return CHANNEL_ALIASES[alias];
  }
  return "";
}

// Inline keyboard 11 nút cho channel picker — dùng chung cho ask + switch flow.
export function buildChannelPickerKeyboard(callbackPrefix: string) {
  return {
    inline_keyboard: [
      [
        { text: "📘 Facebook", callback_data: `${callbackPrefix}:facebook` },
        { text: "📸 Instagram", callback_data: `${callbackPrefix}:instagram` },
        { text: "🐦 X", callback_data: `${callbackPrefix}:twitter` },
        { text: "💼 LinkedIn", callback_data: `${callbackPrefix}:linkedin` },
      ],
      [
        { text: "🎵 TikTok", callback_data: `${callbackPrefix}:tiktok` },
        { text: "🧵 Threads", callback_data: `${callbackPrefix}:threads` },
        { text: "📺 YouTube", callback_data: `${callbackPrefix}:youtube` },
        { text: "🌐 Website", callback_data: `${callbackPrefix}:website` },
      ],
      [
        { text: "💬 Zalo OA", callback_data: `${callbackPrefix}:zalo_oa` },
        { text: "📍 Google Business", callback_data: `${callbackPrefix}:google_maps` },
        { text: "✉️ Email", callback_data: `${callbackPrefix}:email` },
      ],
      [{ text: "❌ Hủy", callback_data: "single:cancel:1" }],
    ],
  };
}
