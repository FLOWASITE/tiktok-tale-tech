---
name: Long-form Channel Separation
description: Website/Blogger/WordPress/Shopify là 4 long-form channel độc lập, mỗi cái có cột DB + prompt + length riêng
type: feature
---

4 long-form channels ĐỘC LẬP (không collapse, không alias):

| Channel | Column | Length | Tone |
|---|---|---|---|
| website | website_content + website_seo_data | 1000-2000 từ | Corporate SEO, H1/H2/H3, schema-friendly |
| blogger | blogger_content + blogger_seo_data | 500-900 từ | Casual, ngôi 'tôi/mình', kể chuyện |
| wordpress | wordpress_content + wordpress_seo_data | 1200-2200 từ | Expert E-E-A-T, FAQ, callout |
| **shopify** | **shopify_content + shopify_seo_data** | **800-1500 từ** | **E-commerce storytelling, HTML-ready, CTA Shop now** |

Publish columns: `<channel>_post_url` + `<channel>_post_id` cho từng kênh.

Channel-publisher routing: `website→publish-website`, `blogger→publish-blogger`, `wordpress→publish-wordpress`, `shopify→publish-shopify-blog`.

Generate-multichannel: `CHANNEL_COLUMN_MAP` + `LONGFORM_MIN_CHARS` + 2 channelDescriptions maps + 2 nơi save (extract `seo-meta` block qua `extractSeoMetaBlock`) + dedup SELECT + embedText + post-verify.

Fallback đọc `website_content` chỉ áp dụng cho data cũ (pre-2026-05). Data mới luôn ghi vào cột riêng của channel.
