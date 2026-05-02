---
name: Longform Channel Separation
description: Website / Blogger / WordPress là 3 kênh long-form độc lập với cột DB + prompt + length riêng (không còn share website_content)
type: feature
---

## Trước (≤2026-04)
3 nút UI nhưng pipeline collapse `blogger`+`wordpress` → `website`, ghi chung cột `website_content`. Hệ quả: 3 kênh đăng cùng 1 bài.

## Sau (2026-05)
Tách hoàn toàn:

| Kênh | Cột DB | Length | Format guidance |
|------|--------|--------|-----------------|
| website | `website_content` (+ `website_seo_data`) | 1000–2000 từ | Corporate, H1+H2/H3, blockquote, CTA, schema-friendly |
| blogger | `blogger_content` (NEW) | 500–900 từ | Casual, ngôi 'tôi/mình', bullet ngắn, kết câu hỏi |
| wordpress | `wordpress_content` (NEW) | 1200–2200 từ | In-depth, H2+H3, 4-6 sections, FAQ, callouts |

## Điểm quan trọng
- **Migration** thêm 2 cột text vào `multi_channel_contents`. Không backfill — fallback đọc.
- **`CHANNEL_COLUMN_MAP`** trong `generate-multichannel/index.ts`: `blogger→blogger_content`, `wordpress→wordpress_content`.
- **Bỏ logic `collapseLongFormAliases`** + `_websiteDisplayAlias` (giờ là no-op).
- **`channel-publisher`**: `CHANNEL_STATUS_KEY_MAP` map blogger→blogger, wordpress→wordpress (không còn fall về website). Resolve content đọc `blogger_content`/`wordpress_content` rồi fallback `website_content` cho data cũ.
- **Frontend**: `MultiChannelViewer`, `ChannelComparison`, `EnhancedExportMenu`, `MultiChannelCreate` đều đọc cột riêng + fallback `website_content`.
- **Settings** (`channelSettings.ts`): mỗi kênh có `format_description` chi tiết.

## ⚠️ Bug đã sửa (2026-05): streaming mode prompt
**Streaming path** (`generate-multichannel/index.ts` ~3185) chạy 1 AI call/channel song song qua `generateChannelsParallel` — KHÁC với block CREATE/INSERT non-streaming. Trước đây prompt cho mỗi channel chỉ là `Bây giờ viết nội dung cho kênh: ${channel.toUpperCase()}` → AI không biết format khác nhau → trả nội dung giống nhau hoặc rỗng cho blogger/wordpress.

**Fix**: inject `CHANNEL_FORMAT_GUIDANCE` map (per-channel format spec) + warning "3 kênh long-form phải KHÁC nhau" vào `buildChannelUserPrompt`. Đồng thời cập nhật shared modules:
- `_shared/dynamic-tokens.ts`: thêm `blogger` (1500-5000 tokens), `wordpress` (2500-9000 tokens). Không có entry → fallback default 1500 → cắt ngắn.
- `_shared/channel-optimization.ts`: thêm entry quality/balanced cho 2 kênh.
- `_shared/streaming-handler.ts` `getChannelDisplayName`: thêm `Blogger`, `WordPress`, `Pinterest`, `Bluesky` (chỉ ảnh hưởng UI).

## Cost impact
Chọn cả 3 → AI chạy 3 long-form calls song song → ~3x output tokens. Chấp nhận trade-off.

## Backward compat
Dữ liệu cũ chỉ có `website_content`. Tất cả chỗ đọc đều fallback: `content.blogger_content || content.website_content`.
