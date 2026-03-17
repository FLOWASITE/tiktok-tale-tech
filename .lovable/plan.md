

# Gợi ý phát triển bài viết website chuẩn SEO — Phân tích & Kế hoạch

## Đánh giá hiện trạng (Audit)

Sau khi review toàn bộ hệ thống blog, tôi phát hiện **7 vấn đề SEO nghiêm trọng** cần xử lý:

| # | Vấn đề | Mức độ |
|---|--------|--------|
| 1 | **Không có dynamic `<title>` và meta tags cho từng trang** — Tất cả trang đều dùng chung `<title>Flowa - AI Content Platform</title>` từ `index.html`. Google sẽ index sai tiêu đề | 🔴 Critical |
| 2 | **Không có JSON-LD structured data** — Bài blog không có Article schema, BreadcrumbList schema. Google không hiện rich snippets | 🔴 Critical |
| 3 | **Không có `sitemap.xml`** — Google không biết có những URL nào để crawl | 🔴 Critical |
| 4 | **Không có canonical URL** — Có thể bị duplicate content issues | 🟡 High |
| 5 | **Ảnh thiếu `loading="lazy"`, thiếu `width/height`** — Ảnh hưởng Core Web Vitals (CLS) | 🟡 High |
| 6 | **`robots.txt` thiếu Sitemap directive** — Bot không tìm được sitemap | 🟡 High |
| 7 | **Blog posts hardcoded** — Không thể scale, không có URL động cho bài mới | 🟠 Medium |

## Kế hoạch triển khai

### 1. SEO Head Component — Dynamic meta tags per page
Tạo `src/components/SEOHead.tsx` dùng `react-helmet-async`:
- Nhận props: `title`, `description`, `canonicalUrl`, `ogImage`, `articleData` (author, publishDate, section)
- Set dynamic `<title>`, `<meta description>`, Open Graph tags, Twitter Card tags, canonical URL
- Inject JSON-LD structured data (Article, BreadcrumbList)

**Cài thêm**: `react-helmet-async`

### 2. JSON-LD Structured Data
Tạo `src/components/SEOJsonLD.tsx`:
- **Article schema** cho blog posts (headline, author, datePublished, image, publisher)
- **BreadcrumbList** cho breadcrumb navigation
- **Organization** schema cho Landing page
- **WebSite** schema với SearchAction (cho sitelinks searchbox)
- **FAQPage** schema cho FAQ section

### 3. Sitemap + Updated robots.txt
- Tạo `public/sitemap.xml` chứa tất cả public URLs: `/`, `/blog`, `/blog/:slug`, `/about`, `/contact`, `/careers`
- Cập nhật `public/robots.txt`: thêm `Sitemap: https://tiktok-tale-tech.lovable.app/sitemap.xml`

### 4. Tích hợp SEOHead vào từng page
- **Landing.tsx**: title "Flowa - Nền Tảng AI Tạo Content Đa Kênh | Tự Động Hóa Marketing"
- **Blog.tsx**: title "Blog | Flowa - Chiến Lược Content Marketing & AI"
- **BlogPostFlowa.tsx**: title từ bài viết, full Article schema
- **BlogPostMultiChannel.tsx**, **BlogPostAIContent.tsx**, **BlogPostRepurposing.tsx**: tương tự
- **About.tsx**, **Contact.tsx**, **Careers.tsx**: title riêng

### 5. Image SEO optimization
- Thêm `loading="lazy"` cho tất cả ảnh blog
- Thêm `width` + `height` attributes để tránh CLS
- Alt text đã tốt, giữ nguyên

### 6. Cải thiện cấu trúc HTML semantic
- Đảm bảo mỗi blog post chỉ có 1 `<h1>`
- Heading hierarchy đúng: h1 > h2 > h3
- Sử dụng `<article>`, `<time datetime="...">`, `<address>` tags

## Chi tiết kỹ thuật

### SEOHead component (core)
```tsx
// Props: title, description, canonical, ogImage, article?, breadcrumbs?
// Renders: <Helmet> with all meta + JSON-LD scripts
```

### Files mới
- `src/components/SEOHead.tsx` (~120 dòng)
- `src/components/SEOJsonLD.tsx` (~80 dòng)
- `public/sitemap.xml` (~40 dòng)

### Files sửa
- `src/main.tsx` — wrap App với `HelmetProvider`
- `src/pages/Landing.tsx` — thêm SEOHead + Organization schema
- `src/pages/Blog.tsx` — thêm SEOHead
- `src/pages/BlogPostFlowa.tsx` — SEOHead + Article schema + image lazy loading
- `src/pages/BlogPostMultiChannel.tsx` — tương tự
- `src/pages/BlogPostAIContent.tsx` — tương tự
- `src/pages/BlogPostRepurposing.tsx` — tương tự
- `src/pages/About.tsx`, `Contact.tsx`, `Careers.tsx` — SEOHead
- `public/robots.txt` — thêm Sitemap directive
- `index.html` — thêm `lang="vi"` (hiện đang là `lang="en"`)

### Ước lượng
~200 dòng code mới, ~10-15 dòng sửa mỗi blog page. Tổng ~12 files.

