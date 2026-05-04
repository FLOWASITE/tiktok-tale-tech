---
name: WordPress SEO-Grade Long-form
description: Bài WordPress sinh kèm seo-meta JSON block, lưu wordpress_seo_data, publish push Yoast/Rank Math meta + UI Panel
type: feature
---

## Pipeline

1. **Prompt** (`generate-multichannel`): WordPress channel guidance + LONGFORM_RETRY_PROMPTS yêu cầu 1500-2500 từ + 5-7 H2 chứa keyword + FAQ + append block ` ```seo-meta {...} ``` ` cuối bài.
2. **Parser** (`extractSeoMetaBlock` trong generate-multichannel/index.ts): regex `/```seo-meta\n...\n```/i`, parse JSON, sanitize (slug NFD-normalize, len caps), trả `{stripped, meta}`.
3. **Persist**: cả streaming (line ~4208) và non-streaming (line ~6421) IIFE → tách body vs meta, lưu `wordpress_content` (body sạch) + `wordpress_seo_data` (jsonb). Tương tự `blogger_*`.
4. **Verify-and-patch**: `verifyAndPatchLongformPersisted` cũng extract trước khi patch để không re-introduce block.
5. **Publish** (`channel-publisher` line ~185): SELECT thêm `wordpress_seo_data`/`blogger_seo_data` → map vào `finalPayload`: title, excerpt, slug, tags, categories, seoTitle, metaDescription, focusKeyword.
6. **Publish-wordpress**: nhận `metaDescription`, `focusKeyword` → đẩy `meta` (self-hosted) hoặc `metadata` array (wp.com) cả 2 plugin Yoast + Rank Math (`_yoast_wpseo_metadesc`, `rank_math_description`, `_yoast_wpseo_title`, `rank_math_title`, `_yoast_wpseo_focuskw`, `rank_math_focus_keyword`). Plugin nào active sẽ pick.

## DB
- `multi_channel_contents.wordpress_seo_data jsonb` (nullable)
- `multi_channel_contents.blogger_seo_data jsonb` (nullable)

## UI
`WordPressSeoPanel` (src/components/seo/WordPressSeoPanel.tsx) hiển thị khi tab = wordpress|blogger trong MultiChannelViewer (mount sau Action Bar). Cho edit metaTitle/desc/slug/focus/tags/categories/excerpt + Score 6 tiêu chí (title 30-60, desc 140-160, focus in H1, ≥3 H2, ≥1500 từ, slug valid). Save trực tiếp vào cột `*_seo_data`.

## Lưu ý
- Yoast/RM cần plugin grant REST meta `auth_callback` cho `_yoast_*`/`rank_math_*` keys. Nếu user không thấy meta xuất hiện → cần plugin "Yoast SEO REST API" patch hoặc Application Password user có role Editor+. Document trong UI nếu user báo lỗi.
- Block ` ```seo-meta ``` ` PHẢI được tách trước khi lưu — KHÔNG để leak ra body publish (sẽ hiện literal trên WordPress site).
