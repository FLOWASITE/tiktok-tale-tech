

# Telegram hiểu đầy đủ kênh: thêm Google Business + đồng bộ với hệ thống

## Vấn đề

User gõ "Tạo 1 bài đăng lên Gg business" → bot không hiểu vì:

1. **Intent classifier** (`_shared/telegram-intent.ts`) enum `channel` chỉ có 8 giá trị: `facebook, instagram, website, tiktok, linkedin, threads, x, zalo` → **không có `google_business`**, không có `youtube`, không có alias "gg business / gbp / google maps".
2. **Handler** (`telegram-webhook/index.ts` dòng 1193) `VALID_SINGLE_CHANNELS` cũng thiếu các kênh tương tự.
3. **Channel picker** (callback `single:switch`) không list các kênh mới → user không có cách nào chọn lại.

Hệ quả: AI bị ép enum trả `channel=""` → hoặc rơi xuống fast-fallback (FB/IG/TikTok hardcoded), hoặc chitchat.

## Đối chiếu hệ thống thực tế

Hệ thống đang hỗ trợ **12 kênh** (theo `src/utils/channelColors.ts` + `channel-publisher`):

| Channel key (DB) | Tên hiển thị | Publish action | Có trong Telegram hiện tại? |
|---|---|---|---|
| facebook | Facebook | `facebook` | ✅ |
| instagram | Instagram | `instagram` | ✅ |
| twitter | X (Twitter) | `twitter` | ✅ (`x`) |
| linkedin | LinkedIn | `linkedin` | ✅ |
| tiktok | TikTok | `tiktok` | ✅ |
| threads | Threads | `threads` | ✅ |
| website | Website / Blog | `website` / `blog` | ✅ |
| zalo_oa | Zalo OA | `zalo` | ✅ (`zalo`) |
| **youtube** | YouTube | (chưa publish) | ❌ thiếu |
| **google_maps** | Google Business | `google-business` | ❌ **thiếu** |
| **email** | Email | (chưa publish) | ❌ thiếu |
| **telegram** | Telegram | (n/a) | ❌ skip (không tự đăng vào chính nó) |

## Kế hoạch sửa

### 1. Tạo bảng alias chuẩn hoá kênh (single source of truth)

File mới: `supabase/functions/_shared/telegram-channel-aliases.ts`

```ts
// Map mọi cách user gọi → channel key chuẩn (khớp với generate-multichannel)
export const CHANNEL_ALIASES: Record<string, string> = {
  // Facebook
  fb: 'facebook', facebook: 'facebook', fanpage: 'facebook', 'face book': 'facebook',
  // Instagram
  ig: 'instagram', insta: 'instagram', instagram: 'instagram',
  // X / Twitter
  x: 'twitter', twitter: 'twitter', tweet: 'twitter', 'x.com': 'twitter',
  // LinkedIn
  li: 'linkedin', linkedin: 'linkedin', 'linked in': 'linkedin',
  // TikTok
  tt: 'tiktok', tiktok: 'tiktok', 'tik tok': 'tiktok',
  // Threads
  threads: 'threads', thread: 'threads',
  // YouTube
  yt: 'youtube', youtube: 'youtube', 'you tube': 'youtube',
  // Website / Blog
  web: 'website', website: 'website', blog: 'website', 'trang web': 'website',
  // Zalo OA
  zalo: 'zalo_oa', oa: 'zalo_oa', 'zalo oa': 'zalo_oa',
  // Google Business (key mới quan trọng)
  gbp: 'google_maps', 'gg business': 'google_maps', 'google business': 'google_maps',
  'google my business': 'google_maps', 'google maps': 'google_maps', gmb: 'google_maps',
  // Email
  email: 'email', mail: 'email', newsletter: 'email',
};

export const SUPPORTED_TG_CHANNELS = [
  'facebook','instagram','twitter','linkedin','tiktok','threads',
  'youtube','website','zalo_oa','google_maps','email',
] as const;

export function normalizeChannel(input: string | undefined | null): string {
  if (!input) return '';
  const k = input.toLowerCase().trim();
  return CHANNEL_ALIASES[k] || (SUPPORTED_TG_CHANNELS.includes(k as any) ? k : '');
}

export function extractChannelFromText(text: string): string {
  const t = text.toLowerCase();
  // Ưu tiên match cụm dài trước (vd "google business" trước "google")
  const sortedKeys = Object.keys(CHANNEL_ALIASES).sort((a,b) => b.length - a.length);
  for (const alias of sortedKeys) {
    const re = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(t)) return CHANNEL_ALIASES[alias];
  }
  return '';
}
```

### 2. Cập nhật intent classifier

File: `supabase/functions/_shared/telegram-intent.ts`

- Mở rộng enum `channel` trong tool schema lên đủ **11 kênh** chuẩn:
  ```
  ["", "facebook","instagram","twitter","linkedin","tiktok","threads",
   "youtube","website","zalo_oa","google_maps","email"]
  ```
- Sửa system prompt — thêm rõ:
  > "Channel chuẩn (lowercase): facebook, instagram, twitter (alias: x, tweet), linkedin, tiktok, threads, youtube (alias: yt), website (alias: blog, web), zalo_oa (alias: zalo, oa), google_maps (alias: gbp, gg business, google business, gmb), email."
- Sau khi nhận về `args.channel` từ AI → chạy thêm `normalizeChannel()` để tự sửa nếu AI viết sai (vd `x` → `twitter`).

### 3. Cập nhật handler & channel picker

File: `supabase/functions/telegram-webhook/index.ts`

- **Dòng 1193**: thay `VALID_SINGLE_CHANNELS` bằng import `SUPPORTED_TG_CHANNELS`.
- **Dòng 1881-1893** (route `generate_single`): chạy `normalizeChannel(result.channel)` trước khi gọi `handleGenerateSingle`. Nếu vẫn rỗng → fallback `extractChannelFromText(text)` (regex match từ raw user message — bắt được "Gg business" ngay cả khi AI miss).
- **`handleGenerateSingle`** (~1388): khi map sang publish action cho `generateImageForSinglePost`, dùng cùng channel key chuẩn.
- **Inline keyboard `single:switch`** (callback handler ~3047): thêm hàng nút cho các kênh mới — bố trí 3 hàng × 4 nút:
  ```
  [📘 Facebook] [📸 IG] [🐦 X] [💼 LinkedIn]
  [🎵 TikTok] [🧵 Threads] [📺 YouTube] [🌐 Website]
  [💬 Zalo OA] [📍 Google Business] [✉️ Email]
  ```

### 4. UX message khi user gõ "tạo bài [kênh chưa support hoặc gõ sai]"

- Nếu `extractChannelFromText` trả `''` và AI cũng trả rỗng → bot reply:
  ```
  🤔 Mình chưa nhận ra kênh bạn muốn đăng. Chọn nhanh 1 kênh nhé:
  [inline keyboard 11 nút như trên]
  ```
- Cache lại `prompt` vào `telegram_example_cache` để khi user bấm nút channel sẽ chạy `handleGenerateSingle` với prompt đó.

### 5. Verify channel-publisher đã map đúng

Đã có trong `channel-publisher/index.ts`:
- `'google-business' → publish-google-business` ✅
- `ACTION_TO_CHANNEL: 'google-business' → 'google_maps'` ✅

→ Khi `multi_channel_contents` lưu `selected_channels: ['google_maps']`, frontend Multichannel page và publish flow đã hỗ trợ sẵn. Chỉ cần Telegram truyền đúng key này xuống `generate-multichannel`.

### 6. Lệnh `/help` cập nhật danh sách kênh

Bổ sung dòng "Mình hỗ trợ 11 kênh: Facebook, Instagram, X, LinkedIn, TikTok, Threads, YouTube, Website, Zalo OA, **Google Business**, Email."

## Files sẽ sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/_shared/telegram-channel-aliases.ts` | **Mới** — alias map + `normalizeChannel()` + `extractChannelFromText()` |
| `supabase/functions/_shared/telegram-intent.ts` | Mở rộng enum channel lên 11; cập nhật system prompt; chạy normalize ở output |
| `supabase/functions/telegram-webhook/index.ts` | Dùng `SUPPORTED_TG_CHANNELS`; chạy normalize + extract fallback ở route `generate_single`; mở rộng channel picker `single:switch` lên 11 nút; thêm bước "ask for channel" khi không detect được; cập nhật `/help` |

## Edge cases

- **User gõ "Gg business"**: `extractChannelFromText` regex `\bgg business\b` → `google_maps` ✅
- **User gõ chỉ "tạo bài đăng" không kênh**: AI trả `channel=""` → bot show keyboard 11 kênh thay vì đoán đại
- **User chưa kết nối Google Business**: vẫn tạo content lưu DB (giống flow web hiện tại). Lúc publish mới check connection — đó là behavior nhất quán, không thay đổi ở pha này
- **AI vẫn trả enum cũ (`x`, `zalo`)**: `normalizeChannel` tự convert sang `twitter`, `zalo_oa`

## Ngoài phạm vi

- Build edge function `publish-youtube`, `publish-email` (chưa có) — chỉ thêm vào danh sách "tạo bài", chưa publish được
- UI inline keyboard chọn brand trước khi tạo (đề cập pha trước, vẫn defer)
- Hiển thị icon kênh thật (SVG) trong Telegram — Telegram chỉ hỗ trợ emoji trên button text

