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
| website | `website_content` (+ `website_seo_data`) | 800–1200 từ | Corporate, H1+3-4 H2, CTA cuối, schema-friendly |
| blogger | `blogger_content` (NEW) | 500–800 từ | Casual, H1+2 H2, bullet list, conversational |
| wordpress | `wordpress_content` (NEW) | 1200–2000 từ | In-depth, H1+4-6 H2+H3, TOC, FAQ, callouts |

## Điểm quan trọng
- **Migration** thêm 2 cột text vào `multi_channel_contents`. Không backfill — fallback đọc.
- **`CHANNEL_COLUMN_MAP`** trong `generate-multichannel/index.ts`: `blogger→blogger_content`, `wordpress→wordpress_content`.
- **Bỏ logic `collapseLongFormAliases`** + bỏ `_websiteDisplayAlias` (giờ là no-op).
- **`channel-publisher`**: `CHANNEL_STATUS_KEY_MAP` map blogger→blogger, wordpress→wordpress (không còn fall về website). Resolve content đọc `blogger_content`/`wordpress_content` rồi fallback `website_content` cho data cũ.
- **Frontend**: `MultiChannelViewer`, `ChannelComparison`, `EnhancedExportMenu`, `MultiChannelCreate` đều đọc cột riêng + fallback `website_content`.
- **Settings** (`channelSettings.ts`): mỗi kênh có `format_description` rất chi tiết để AI tạo cấu trúc khác nhau.

## Cost impact
Chọn cả 3 → AI chạy 3 long-form calls song song → ~3x output tokens. Chấp nhận trade-off vì user yêu cầu.

## Backward compat
Dữ liệu cũ chỉ có `website_content`. Tất cả chỗ đọc đều fallback: `content.blogger_content || content.website_content`.
