# Plan: Tối ưu SEO cho Flowa

## Status
- ✅ Phase 1 (Critical fixes): domain align, og-image, base JSON-LD
- ✅ Phase 3 (Dynamic sitemap): edge function generate-sitemap
- ⏭️ Phase 2 (Prerender): SKIPPED — ROI thấp với SPA hiện tại
- ✅ Phase 4 (Structured Data nâng cao): SoftwareApplication, Review[], Organization, LocalBusiness, FAQPage
- ✅ Phase 5 (Performance): preconnect Supabase + storage CDN, preload favicon, lazy/decoding async cho images dưới fold, width/height tránh CLS, fetchPriority=high cho logo nav, manualChunks tách react/motion/embla/supabase/tanstack
- ⏳ Phase 6 (Content), Phase 7 (i18n hreflang), Phase 8 (GSC/GA4)

## Hiện trạng (đã có)
- `SEOHead` component với JSON-LD (Article, Breadcrumb, FAQ, HowTo, Organization, WebSite)
- Meta tags + OG/Twitter cards trong `index.html`
- `<noscript>` fallback chứa nội dung text cho crawler không chạy JS
- `robots.txt` + `sitemap.xml` tĩnh (9 URLs)
- `BlogPost.tsx` dynamic + `Pricing.tsx` (chưa có SEOHead)

## Vấn đề cần sửa

### 1. Domain mismatch nghiêm trọng (CRITICAL)
- `SEOHead.tsx` hard-code `https://tiktok-tale-tech.lovable.app`
- `sitemap.xml` + `robots.txt` cũng dùng domain Lovable preview
- `index.html` canonical lại trỏ `https://flowa.one`
- → Google index sai domain, canonical conflict, mất authority

**Fix**: Đổi tất cả sang `https://flowa.one` (primary domain).

### 2. SPA không prerender (CRITICAL cho SEO)
- React SPA → bot Google render được nhưng chậm; Bing/Facebook/LinkedIn crawler **không** chạy JS
- Mỗi route trả cùng 1 `index.html` với title/description giống nhau cho đến khi React mount
- `SEOHead` (react-helmet-async) chỉ chạy client-side → meta tags không có trong HTML response

**Fix**: Cài `vite-plugin-prerender` hoặc `react-snap` để build-time prerender các trang public (Landing, About, Pricing, Contact, Careers, Blog list, 4 blog posts, Terms, Privacy).

### 3. Sitemap tĩnh, không sync DB
- 9 URLs hardcode trong `public/sitemap.xml`
- `BlogPost.tsx` (dynamic từ DB?) không có trong sitemap
- Không có `lastmod` thực

**Fix**: Tạo edge function `generate-sitemap` query `multi_channel_contents` (hoặc bảng blog) → trả XML động. Route `/sitemap.xml` proxy qua function. Hoặc build-time script generate từ static blog list + DB.

### 4. Pricing page chưa có SEOHead
- Trang quan trọng convert nhất nhưng thiếu meta + JSON-LD
- Thiếu schema `Product`/`Offer` cho 4 tier (Free/Starter/Pro/Enterprise)

### 5. Thiếu structured data quan trọng
- `SoftwareApplication` schema cho Flowa (rating, price, features)
- `BreadcrumbList` chưa được dùng ở Pricing/About/Contact/Careers
- `LocalBusiness` (nếu có địa chỉ VN)
- `Review`/`AggregateRating` từ testimonials trong landing

### 6. Performance & Core Web Vitals
- Font không có `display=swap` hint
- Không có `<link rel="preconnect">` cho font/image CDN
- Không lazy-load images dưới fold
- Bundle lớn (chưa biết size) → cần code-split landing khỏi app

### 7. Internal linking & content
- `<noscript>` chứa nhiều text policy nhưng không có internal link tới blog posts
- Blog posts không có related posts section
- Không có HTML sitemap (`/sitemap` page) cho user

### 8. Multi-language SEO
- App có vi/en/th nhưng không có `hreflang` tags
- Không có route `/en/`, `/th/` cho landing

### 9. Image SEO
- OG image dùng googleapis URL (chậm, không cache CDN của mình)
- Blog images thiếu `alt` text consistent
- Không có image sitemap

### 10. Analytics & Search Console
- Chưa thấy GSC verification meta
- Chưa có GA4/Plausible tracking để đo organic traffic

## Implementation Plan

### Phase 1: Fix critical (1 commit)
1. Đổi `SITE_URL` trong `SEOHead.tsx` → `https://flowa.one`
2. Update `public/sitemap.xml` + `robots.txt` → flowa.one
3. Thêm `<SEOHead>` vào `Pricing.tsx` với schema `Product` + `Offer` cho 4 tiers
4. Thêm `BreadcrumbList` cho About, Pricing, Contact, Careers

### Phase 2: Prerender (1 commit)
1. Cài `vite-plugin-prerender-spa` hoặc dùng custom puppeteer script
2. Config prerender cho 11 routes public
3. Verify HTML response có title/meta/JSON-LD

### Phase 3: Dynamic sitemap (1 commit)
1. Edge function `generate-sitemap` → query blog posts từ DB
2. Tạo Vite plugin/middleware route `/sitemap.xml` proxy edge function
3. Submit sitemap mới lên GSC

### Phase 4: Structured data nâng cao (1 commit)
1. `SoftwareApplication` schema ở Landing (price, rating từ testimonials)
2. `Review` + `AggregateRating` schema từ TestimonialsSection
3. `LocalBusiness` schema nếu có địa chỉ VN trong Contact
4. FAQ schema mở rộng từ FAQSection (đã có FAQ component, chỉ cần wire)

### Phase 5: Performance (1 commit)
1. Preconnect cho fonts.googleapis.com, storage.googleapis.com
2. `loading="lazy"` cho images dưới fold
3. Self-host OG image vào `/public/og-image.jpg`
4. Code-split landing bundle (lazy chunks)
5. Add `font-display: swap`

### Phase 6: Content & links (ongoing)
1. Related posts section trong BlogPost
2. HTML sitemap page `/sitemap`
3. Footer internal links optimization
4. Add 4-6 blog posts mới (long-tail keywords VN)

### Phase 7: i18n SEO (optional)
1. `hreflang` tags trong SEOHead
2. Locale-prefixed routes nếu cần serve EN/TH

### Phase 8: Tracking (1 commit)
1. GSC verification meta tag (cần user cung cấp code)
2. GA4/Plausible script trong index.html
3. Track Core Web Vitals → reportWebVitals

## Câu hỏi cho user trước khi implement
- Domain chính xác để dùng làm canonical: `flowa.one` hay `app.flowa.one`?
- Đã verify GSC chưa? Có sẵn verification code?
- Có muốn prerender ngay (tăng build time ~30s) hay làm sau?
- Blog posts hiện hardcode trong code hay đã chuyển vào DB?

## Ưu tiên triển khai
**P0 (làm ngay)**: Phase 1 (fix domain) + Phase 4 partial (Pricing schema)
**P1 (tuần này)**: Phase 2 (prerender) + Phase 3 (dynamic sitemap) + Phase 5 (perf)
**P2 (tuần sau)**: Phase 6 (content) + Phase 8 (tracking)
**P3 (khi cần)**: Phase 7 (i18n)
