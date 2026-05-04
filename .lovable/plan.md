## Mục tiêu
Tối ưu bài viết WordPress sinh ra từ Flowa **chuẩn SEO** thật sự (không chỉ "in-depth"): đầy đủ on-page SEO + truyền meta lên `publish-wordpress` để post có Yoast/Rank Math metadata.

## Hiện trạng

**Prompt** (`generate-multichannel/index.ts` line 2685, 3571, 458): yêu cầu 1200-2200 từ, in-depth, bold keyword 3-5 lần — đủ về **độ dài** nhưng thiếu các yếu tố SEO chuẩn:
- Không sinh **meta title** (≤60 ký tự, có keyword đầu).
- Không sinh **meta description** (140-160 ký tự, có keyword + CTA).
- Không sinh **slug** SEO-friendly (không dấu, không stop-word).
- Không sinh **focus keyword + LSI keywords**.
- Không sinh **tags / categories** đề xuất.
- Không yêu cầu **alt text** cho ảnh trong bài.
- Heading H2/H3 không bắt buộc chứa keyword.
- Không có **internal link placeholder** (mặc dù có hệ thống suggest-internal-links đã build).
- Không có **schema FAQ** rõ ràng (chỉ "có thể thêm 2-4 FAQ").
- Không có **table of contents** cho bài dài.

**Pipeline publish:**
- `publish-wordpress` (line 97-104, 290-294) **đã hỗ trợ** `excerpt`, `slug`, `tags`, `categories`, `seoTitle`, `featuredImageUrl`.
- `channel-publisher` (line 185) cố đọc `mcc.seo_data` để truyền — **nhưng cột `seo_data` không tồn tại** trong DB; chỉ có `website_seo_data` (jsonb chứa duy nhất `content`, không có meta).
- → Hiện tại **không có meta nào** được truyền cho WordPress; bài lên WP thiếu excerpt/slug/tags → SEO score thấp.

## Giải pháp (3 lớp)

### Lớp 1 — Prompt nâng cấp: WordPress SEO-grade

Sửa block đặc tả WordPress (line 2684-2691 + 3571 + 457-470) thành **bộ rules SEO E-E-A-T** rõ ràng:

```
## ĐẶC TẢ BẮT BUỘC CHO WORDPRESS (SEO-GRADE)

### Cấu trúc bài
- 1500-2500 từ tiếng Việt, tone authority/expert.
- Intro 80-150 từ: nêu vấn đề + lời hứa giải quyết, có focus keyword trong 100 từ đầu.
- 5-7 section ## H2 (mỗi section 200-400 từ), có thể chia ### H3 sub-section.
- Conclusion 100-150 từ: tóm tắt 3 ý chính + CTA cụ thể.
- FAQ section ## (3-5 câu Q/A) cuối bài — dùng cho schema FAQPage.
- Có ít nhất 1 numbered list, 1 bulleted list, 1 blockquote, 1 bảng so sánh nếu hợp.

### On-page SEO
- Focus keyword "{KEYWORD}" xuất hiện: trong H1, slug, 100 từ đầu, ≥1 H2, conclusion. Tổng density 0.8-1.5%.
- LSI keywords (sinh từ topic): 5-8 cụm liên quan, rải đều, KHÔNG nhồi.
- Mỗi H2 chứa ≥1 keyword/LSI. KHÔNG H2 generic kiểu "Lời kết", "Tổng quan".
- **Bold** keyword/LSI 4-6 lần (không nhồi).
- Internal link: chèn 2-3 markdown link `[anchor text](INTERNAL_LINK_PLACEHOLDER)` để engine internal-links thay thế.
- External link: 1-2 link đến nguồn uy tín (.gov, .edu, brand lớn) nếu cần dẫn chứng.
- Ảnh: nếu nhắc đến ảnh, dùng cú pháp `![alt-text-có-keyword](IMAGE_PLACEHOLDER)`.

### Output JSON ở CUỐI bài (BẮT BUỘC)
Sau khi viết xong body, thêm block:

```seo-meta
{
  "metaTitle": "...",         // ≤60 ký tự, focus keyword đầu, có brand
  "metaDescription": "...",   // 140-160 ký tự, có keyword + CTA
  "slug": "...",              // không dấu, dùng -, ≤60 ký tự
  "focusKeyword": "...",
  "lsiKeywords": ["...", "..."],
  "tags": ["...", "..."],     // 4-6 tag, lowercase, không trùng
  "categories": ["..."],      // 1-2 category cha
  "excerpt": "..."            // 2-3 câu, 50-160 từ, hấp dẫn
}
```
```

Engine parse block ` ```seo-meta ` ra khỏi body trước khi lưu, đẩy vào field mới.

### Lớp 2 — Lưu trữ: cột `wordpress_seo_data` (jsonb)

Migration:
```sql
ALTER TABLE multi_channel_contents
  ADD COLUMN wordpress_seo_data jsonb,
  ADD COLUMN blogger_seo_data jsonb;  -- tận dụng cho Blogger sau
```

Trong `generate-multichannel`:
- Sau khi sinh `wordpress_content`, parse khối ` ```seo-meta `, lưu JSON vào `wordpress_seo_data`, gỡ khỏi body trước khi lưu vào `wordpress_content`.
- Validate: nếu thiếu metaTitle/metaDescription → retry 1 lần với hint "MISSING_META".

### Lớp 3 — Publishing: truyền meta thật

`channel-publisher/index.ts` (line 134-186):
- Khi action='wordpress': SELECT thêm `wordpress_seo_data`; map:
  ```ts
  const wp_seo = mcc.wordpress_seo_data || {};
  finalPayload.title       = wp_seo.metaTitle || finalPayload.title;
  finalPayload.excerpt     = wp_seo.excerpt || wp_seo.metaDescription;
  finalPayload.slug        = wp_seo.slug;
  finalPayload.tags        = wp_seo.tags || [];
  finalPayload.categories  = wp_seo.categories || [];
  finalPayload.seoTitle    = wp_seo.metaTitle;
  finalPayload.metaDescription = wp_seo.metaDescription;
  finalPayload.focusKeyword = wp_seo.focusKeyword;
  ```
- Bỏ dòng `mcc.seo_data` (không tồn tại).

`publish-wordpress/index.ts`:
- Nhận thêm `metaDescription`, `focusKeyword`. Với **WordPress self-hosted** (REST v2): thêm vào `meta` field của Yoast/Rank Math:
  ```ts
  postPayload.meta = {
    _yoast_wpseo_metadesc: metaDescription,
    _yoast_wpseo_focuskw: focusKeyword,
    _yoast_wpseo_title: seoTitle,
    rank_math_description: metaDescription,
    rank_math_focus_keyword: focusKeyword,
    rank_math_title: seoTitle,
  };
  ```
  (set cả Yoast lẫn Rank Math, plugin nào active sẽ pick. Yoast/RM cần grant `edit_posts` meta — tài liệu hoá nếu user gặp lỗi.)
- Với **WordPress.com**: dùng `metadata` array `[{key:'_yoast_wpseo_metadesc', value:...}, ...]`.

### Lớp 4 — UI cho user xem/sửa SEO

`MultiChannelViewer` tab WordPress: thêm collapsible **SEO Panel** (Soft Luxury card):
- Show: meta title (live count /60), meta description (/160), slug (auto từ title nếu trống), focus keyword, tags chips, categories chips.
- Cho phép user edit từng field, lưu lại vào `wordpress_seo_data`.
- Score bar đơn giản: 5 tiêu chí (title length OK, desc length OK, keyword in H1, ≥3 H2, ≥1500 từ) → 0-100%.

## Phạm vi câu hỏi tôi cần xác nhận

1. **Có nên áp dụng cùng pattern cho Blogger không?** (Blogger SEO yếu hơn — chỉ cần meta description + tags là đủ vì Blogger.com ít custom). Plan này tập trung WordPress; Blogger sẽ làm sau theo issue riêng nếu user muốn.
2. **Yoast vs Rank Math vs cả hai?** Plan default set cả hai. Nếu user dùng plugin SEO khác (SEOPress, AIOSEO) cần thêm field mapping.
3. **Internal link**: tôi giữ placeholder `INTERNAL_LINK_PLACEHOLDER` để engine `suggest-internal-links` (đã có sẵn) thay thế khi publish, hay sinh ngay link thật trong AI call? Khuyến nghị: placeholder + thay khi publish (link mới được embed sau).

## Files sẽ sửa

- `supabase/migrations/<new>.sql` — thêm `wordpress_seo_data`, `blogger_seo_data`
- `supabase/functions/generate-multichannel/index.ts` — prompt mới (line 2684, 3571, 457-470) + parser block `seo-meta`
- `supabase/functions/channel-publisher/index.ts` — map seo_data đúng (line 134-186)
- `supabase/functions/publish-wordpress/index.ts` — nhận + đẩy Yoast/RM meta (line 94-104, 285-294, branch wordpress.com line 152-165)
- `src/components/MultiChannelViewer.tsx` (hoặc tab component WordPress) — thêm SEO Panel UI
- `src/components/seo/WordPressSeoPanel.tsx` (mới) — form + score
- `src/integrations/supabase/types.ts` — auto-regen sau migration

Không phá data cũ: `wordpress_content` không đổi cấu trúc; `wordpress_seo_data` nullable. Bài cũ vẫn publish được (fallback title gốc).
