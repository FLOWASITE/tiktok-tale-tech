# Rà & đồng bộ kênh cho AI Campaign Wizard

## Vấn đề phát hiện

So sánh `src/components/agents/GoalWizard.tsx` (10 kênh) với source-of-truth `src/types/multichannel.ts` `CHANNELS` (16 kênh) + 15 edge function `publish-*`:

| Sai sót | Hiện trạng | Đúng theo hệ thống |
|---|---|---|
| **TikTok** xuất hiện | có | ❌ Bỏ — memory `Channel Mediums`: TikTok/YouTube chỉ post từ Video Studio, không thuộc multichannel |
| **Pinterest** map sai `channelKey` | `'website'` | `'pinterest'` (đã có `publish-pinterest`, có icon/mockup riêng) |
| **Blog** gộp Website | label "Blog" → `website` | Tách 3 long-form độc lập theo memory `Longform Channel Separation`: **Website / Blogger / WordPress** (mỗi cái prompt + length + mockup khác nhau) |
| Thiếu **Bluesky** | — | Thêm (có `publish-bluesky`, OAuth flow đầy đủ) |
| Thiếu **Telegram** | — | Thêm (channel social chuẩn) |
| Thiếu **Google Maps (GBP)** | — | Thêm (có `publish-google-business`) |
| Thiếu **Shopify Blog / Wix / Medium** | — | Thêm (có `publish-shopify-blog`, `publish-wordpress`, …) |
| Estimate carousel/video logic | dùng `'tiktok'`, `'youtube'` | Bỏ `tiktok`/`youtube` khỏi `videoChannelIds` (không còn pick được) |

## Thay đổi

**File duy nhất**: `src/components/agents/GoalWizard.tsx`

### 1. Rebuild `AVAILABLE_CHANNELS` (line 33-43)

Theo đúng `CHANNELS` từ `multichannel.ts`, group 2 nhóm hiển thị (long-form / social), label tiếng Việt giữ như UI multichannel:

```ts
const AVAILABLE_CHANNELS: { id: string; label: string; channelKey: Channel; group: 'longform' | 'social' }[] = [
  // 🌐 Long-form
  { id: 'website',   label: 'Website',      channelKey: 'website',   group: 'longform' },
  { id: 'blogger',   label: 'Blogger',      channelKey: 'blogger',   group: 'longform' },
  { id: 'wordpress', label: 'WordPress',    channelKey: 'wordpress', group: 'longform' },
  { id: 'shopify',   label: 'Shopify Blog', channelKey: 'shopify',   group: 'longform' },
  { id: 'wix',       label: 'Wix Blog',     channelKey: 'wix',       group: 'longform' },
  { id: 'medium',    label: 'Medium',       channelKey: 'medium',    group: 'longform' },
  { id: 'email',     label: 'Email',        channelKey: 'email',     group: 'longform' },
  // 💬 Social
  { id: 'facebook',    label: 'Facebook',    channelKey: 'facebook',    group: 'social' },
  { id: 'instagram',   label: 'Instagram',   channelKey: 'instagram',   group: 'social' },
  { id: 'linkedin',    label: 'LinkedIn',    channelKey: 'linkedin',    group: 'social' },
  { id: 'twitter',     label: 'X (Twitter)', channelKey: 'twitter',     group: 'social' },
  { id: 'threads',     label: 'Threads',     channelKey: 'threads',     group: 'social' },
  { id: 'bluesky',     label: 'Bluesky',     channelKey: 'bluesky',     group: 'social' },
  { id: 'pinterest',   label: 'Pinterest',   channelKey: 'pinterest',   group: 'social' },
  { id: 'telegram',    label: 'Telegram',    channelKey: 'telegram',    group: 'social' },
  { id: 'zalo',        label: 'Zalo OA',     channelKey: 'zalo_oa',     group: 'social' },
  { id: 'google_maps', label: 'Google Maps', channelKey: 'google_maps', group: 'social' },
];
```

### 2. Render channel grid 2 nhóm (line ~1010)

Thay grid phẳng bằng 2 subsection với heading nhỏ:
- "🌐 Website & Long-form" (7 kênh)
- "💬 Mạng xã hội" (10 kênh)

Vẫn dùng `toggleChannel(ch.id)` + `ChannelIcon` hiện tại — không đổi state shape (vẫn lưu `id` string như cũ để không vỡ `target_channels` ở backend; backend đã có sẵn alias `blog → website`).

### 3. Sửa estimate logic (line 1070-1080)

```ts
const visualChannelIds = ['instagram', 'facebook', 'pinterest', 'threads'];
const videoChannelIds: string[] = []; // TikTok/YouTube không nằm trong agent multichannel
```

Hoặc bỏ hẳn block ước lượng video vì không còn channel video nào.

## Tương thích

- Backend `agent-pipeline` và `agent-creator-v2` đã handle `blog → website` alias (line 1317, 446) — nhưng giờ ta dùng `id: 'website'` trực tiếp nên alias trở thành no-op an toàn. Không cần đổi backend.
- `Channel` type trong `multichannel.ts` đã chứa đủ key cần dùng → không cần migration.
- DB `agent_goals.target_channels` lưu text[] tự do → backward-compatible.

## Out of scope

- Không đổi backend edge functions (đã đủ 15 publish-*).
- Không đổi UI multichannel form (đã đúng).
- Không thêm TikTok/YouTube vào agent (luồng video đi qua Video Studio + `script-to-studio-link`).
