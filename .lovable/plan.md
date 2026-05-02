## Chẩn đoán thật

Bài đăng `Website / Blogger / WordPress` ra **cùng 1 nội dung** (hoặc blogger/wordpress rỗng) là vì hệ thống đang chạy ở **streaming mode** — một code path **khác** với block CREATE/INSERT mà tôi vá lần trước.

Streaming mode ở `generate-multichannel/index.ts` (~dòng 3185–3255) chạy mỗi channel **song song** qua `generateChannelsParallel`, mỗi channel 1 lần gọi AI riêng với hàm `buildChannelUserPrompt(channel)`. Vấn đề:

```ts
// Hiện tại — prompt cho cả 3 channel gần như giống hệt nhau
return `${userPrompt}
${channelHookSection}
${transformSection}

Bây giờ viết nội dung cho kênh: ${channel.toUpperCase()}
Viết TRỰC TIẾP nội dung, KHÔNG giải thích hay bình luận.`;
```

→ AI nhận `WEBSITE` vs `BLOGGER` vs `WORDPRESS` chỉ khác nhau 1 từ in hoa, **không có hướng dẫn về độ dài/tone/format khác nhau** → trả ra nội dung giống nhau (hoặc bỏ rỗng vì không hiểu kênh là gì).

Đồng thời các module dùng chung **chưa biết** 2 kênh mới:
- `_shared/dynamic-tokens.ts` → không có entry `blogger`/`wordpress` → fallback `DEFAULT_TOKEN_CONFIG` (max 1500 tokens) → AI cắt bài rất ngắn hoặc trả rỗng.
- `_shared/channel-optimization.ts` → không có entry → fallback balanced/default → mất chế độ "quality" như website.
- `_shared/streaming-handler.ts` `getChannelDisplayName` → không có → UI hiển thị raw key.

Bằng chứng DB (mới nhất):
```
title (mới nhất)                       | web_len | blog_len | wp_len
---------------------------------------+---------+----------+--------
Làm sao để 1 người quản lý 10+ ...     |   5517  |     0    |    0
```
Website đủ chữ, 2 cột long-form mới = 0.

## Kế hoạch sửa

### 1. `supabase/functions/generate-multichannel/index.ts` — streaming mode prompt
Tại `buildChannelUserPrompt` (~dòng 3185), thêm **block hướng dẫn channel-specific** cho mọi long-form (và tận dụng cho mọi kênh khác cùng lúc, dùng map đã có ở dòng ~4010 `channelDescriptions`):

```ts
const CHANNEL_FORMAT_GUIDANCE: Record<string, string> = {
  website:   "Bài chuẩn SEO 1000-2000 từ. H1 + H2/H3, intro 50-100 từ, ≥2 section có bullet/numbered list, blockquote, **bold** keyword, conclusion + CTA. Markdown thuần (KHÔNG HTML).",
  blogger:   "Bài Blogger 500-900 từ, casual, ngôi 'tôi/mình', kể chuyện cá nhân, hook mở bài, 1-2 bullet ngắn, kết bằng câu hỏi mời comment. Markdown nhẹ. KHÔNG SEO chặt như website. Phải KHÁC website rõ rệt về tone & độ dài.",
  wordpress: "Bài WordPress in-depth 1200-2200 từ, expert/authority tone, H2/H3 rõ, intro 80-120 từ, 4-6 section + bullet/numbered, ≥1 blockquote, conclusion + CTA. Sâu hơn & dài hơn website một bậc. Phải KHÁC blogger và website.",
  // ... (các kênh khác giữ nguyên format ngắn từ channelDescriptions)
};

return `${userPrompt}
${channelHookSection}
${transformSection}

## KÊNH HIỆN TẠI: ${channel.toUpperCase()}
${CHANNEL_FORMAT_GUIDANCE[channel] ?? channelDescriptions[channel] ?? ''}

⚠️ Nội dung kênh này phải PHÂN BIỆT RÕ RÀNG với các kênh long-form khác (website/blogger/wordpress) về độ dài, tone, cấu trúc. KHÔNG copy nội dung kênh khác.

Viết TRỰC TIẾP nội dung kênh ${channel.toUpperCase()}, KHÔNG giải thích.`;
```

### 2. `supabase/functions/_shared/dynamic-tokens.ts`
Thêm 2 entry vào `CHANNEL_TOKEN_CONFIGS` (đặt cạnh `website`):
```ts
blogger: {
  minTokens: 1500,
  maxTokens: 5000,
  bufferMultiplier: 1.3,
},
wordpress: {
  minTokens: 2500,
  maxTokens: 9000,
  bufferMultiplier: 1.3,
},
```

### 3. `supabase/functions/_shared/channel-optimization.ts`
Thêm entry `blogger` (balanced/quality, soft hook) và `wordpress` (quality/detailed, soft hook), copy mẫu từ `website`.

### 4. `supabase/functions/_shared/streaming-handler.ts`
Bổ sung display name vào `getChannelDisplayName`:
```ts
blogger:   'Blogger',
wordpress: 'WordPress',
```
(không ảnh hưởng logic, chỉ đẹp UI khi stream tiến độ.)

### 5. (Optional, nhỏ) Logging xác nhận
Trong streaming mode, log thêm khi channel hoàn thành:
```
[streaming-mode] channel=blogger length=NNN chars
```
Đã có sẵn `console.log` ở `onChannelComplete` chỉ thiếu length — bổ sung để debug nhanh lần sau.

## Kết quả mong đợi

- Generate mới chọn cả 3 (website + blogger + wordpress) → 3 nội dung **khác hẳn nhau** về độ dài & phong cách.
- DB sẽ có `web_len > 0`, `blog_len ≈ 500-900 × ~5`, `wp_len ≈ 1200-2200 × ~5`.
- Bài cũ (đã có web_len > 0 nhưng blog_len/wp_len = 0): user phải nhấn **"Tạo lại nội dung"** cho 2 kênh đó (UPDATE mode đã đúng).

## File sẽ sửa

1. `supabase/functions/generate-multichannel/index.ts` — `buildChannelUserPrompt` + thêm map `CHANNEL_FORMAT_GUIDANCE`.
2. `supabase/functions/_shared/dynamic-tokens.ts` — thêm `blogger`, `wordpress`.
3. `supabase/functions/_shared/channel-optimization.ts` — thêm `blogger`, `wordpress`.
4. `supabase/functions/_shared/streaming-handler.ts` — thêm display name.

KHÔNG động database, KHÔNG sửa OAuth/publish, KHÔNG backfill data cũ.
