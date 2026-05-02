## Vấn đề
Hiện tại kênh `blogger` dùng chung `WebsiteMockup` (`channelToMockupType.blogger = 'general'`) → preview trông giống hệt Website corporate (browser bar, breadcrumb, FAQ, schema markup). Không phản ánh đúng cảm giác "blog cá nhân Blogspot": header tối giản, post-title to, meta dòng "Posted by … on …", labels chip dưới cuối, không có browser chrome corporate.

## Mục tiêu
- Mockup Blogger riêng, look-and-feel giống template mặc định Blogger (Notable / Soho / Contempo): header brand-name center, post hero, title sans-serif đậm, meta line, body, labels footer, comment placeholder.
- Vẫn giữ: dark mode, brand `primaryColor` accent, `channelImage` hero, `seoData` (title/meta/keywords), score bar, normalize markdown.
- Bỏ: browser address bar Apple-style, schema FAQ, breadcrumb shop-style, "Read more articles" CTA corporate.

## Thiết kế mockup mới

```text
┌─────────────────────────────────────────┐
│   [logo]  BRAND NAME · BLOGSPOT         │  ← header center, serif tagline
│   ─────────────────────────────────     │
├─────────────────────────────────────────┤
│  [ hero image — channelImage / fallback]│
│                                         │
│   Post Title Here Goes Big              │  ← 2xl, font-serif (Georgia-ish)
│   ─────                                 │
│   Posted by Brand · 2 May 2026 · 5 min  │  ← meta line muted
│                                         │
│   <article body — prose, markdown>      │
│   ...                                   │
│                                         │
│   Labels:  [tag1] [tag2] [tag3]         │  ← chip outline
│                                         │
│   ── Comments (0) ──────────            │
│   [💬 Post a Comment]                   │
└─────────────────────────────────────────┘
│  © Brand · Powered by Blogger           │  ← footer
```

Khác biệt với Website:
- Không có browser tab/URL bar
- Title dùng `font-serif` (Blogger classic) thay vì sans corporate
- Meta line kiểu "Posted by … · date · read time" thay vì breadcrumb
- "Labels" chips outline (Blogger gọi tag là Labels) thay vì keyword pill
- Footer "Powered by Blogger" small caps
- Background trắng hoặc cream nhẹ, không có dark hero overlay corporate
- Bỏ FAQ schema, TOC mạnh (giữ TOC nhẹ optional)

## Thay đổi code

1. **Tạo `src/components/preview/BloggerMockup.tsx`**
   - Standalone component, props giống `WebsiteMockup` (`content`, `brandName`, `logoUrl`, `primaryColor`, `isGenerating`, `seoData`, `channelImage`).
   - Render header / hero / title / meta / prose body (dùng `react-markdown` + `remark-gfm` như WebsiteMockup) / labels / comments stub / footer.
   - Tận dụng `seoData.seo_title`, `seoData.meta_description`, `seoData.secondary_keywords` cho title + labels.
   - Title format: nếu có `seoData.seo_title` → dùng, fallback dòng heading đầu tiên trong content.

2. **Cập nhật `src/components/preview/ChannelMockupFrame.tsx`**
   - Thêm `'blogger'` vào union `ChannelType`.
   - Thêm `case 'blogger'` trong switch → render `<BloggerMockup />`.

3. **Cập nhật `src/components/viewer/ContentMockupToggle.tsx`**
   - `channelToMockupType.blogger = 'blogger'` (thay vì `'general'`).
   - Giữ `isWebsiteLike` cho score bar (vẫn cần SEO score cho long-form).

4. **Memory**
   - Cập nhật `mem://ui-ux/multichannel/mockup-preview-specs-vn` để ghi nhận Blogger có mockup riêng (không còn share WebsiteMockup).

## Files chỉnh sửa
- `src/components/preview/BloggerMockup.tsx` — **mới**
- `src/components/preview/ChannelMockupFrame.tsx` — thêm type + case
- `src/components/viewer/ContentMockupToggle.tsx` — đổi mapping
- `.lovable/memory/ui-ux/multichannel/mockup-preview-specs-vn.md` — ghi spec

## Out of scope
- Không động đến `WordPressMockup` (vẫn share `general` cho bây giờ — có thể tách sau khi user yêu cầu).
- Không đổi prompt generation (Blogger content vẫn dùng `blogger_content` column riêng đã có).
- Không đổi publishing logic.

Confirm để mình code nhé.
