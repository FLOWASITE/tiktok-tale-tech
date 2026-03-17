

# Rà soát SEO: Các điểm cần chỉnh cho UI và backend

## Đã hoàn thành tốt
- SEOHead component với dynamic title, description, OG tags, Twitter cards, canonical URL
- JSON-LD: Article, BreadcrumbList, Organization, WebSite, FAQPage schemas
- sitemap.xml, robots.txt đã chuẩn
- `lang="vi"` trong index.html

## Cần chỉnh (6 vấn đề)

### 1. Ảnh blog thiếu `loading="lazy"` và kích thước cố định
Tất cả `<img>` trong BlogPostFlowa, BlogPostMultiChannel thiếu `loading="lazy"`, `width`, `height` — ảnh hưởng Core Web Vitals (CLS score).

**Fix:** Thêm `loading="lazy" width={1200} height={600}` cho hero images trong 4 file BlogPost.

### 2. Thiếu `<article>` semantic wrapper
Không có `<article>` tag nào trong các trang blog. Google và screen readers cần tag này để nhận diện nội dung chính.

**Fix:** Wrap phần nội dung chính trong `<article>` tag cho 4 BlogPost pages.

### 3. Thiếu `<time datetime="...">` cho ngày đăng
Các bài blog hiển thị "Tháng 1, 2026" nhưng dùng `<div>` thay vì `<time datetime="2026-01-15">`. Google cần `<time>` để hiểu ngày xuất bản.

**Fix:** Đổi `<div>` chứa ngày thành `<time datetime="ISO_DATE">` trong 4 BlogPost pages.

### 4. Duplicate meta tags giữa index.html và SEOHead
`index.html` có hardcoded OG/Twitter meta tags + title. Khi SEOHead render, sẽ tạo **duplicate tags** — crawler có thể lấy sai giá trị.

**Fix:** Xóa các meta tags OG/Twitter khỏi `index.html`, chỉ giữ charset, viewport, favicon. SEOHead sẽ quản lý toàn bộ.

### 5. Blog list page: Ảnh dùng CSS background thay vì `<img>` tag
Trang `/blog` dùng images trong card nhưng không có alt text SEO-friendly vì render qua CSS. Cần kiểm tra và đảm bảo dùng `<img>` với alt text.

**Fix:** Kiểm tra Blog.tsx cards, đảm bảo ảnh dùng `<img>` tag có alt text mô tả rõ nội dung.

### 6. Sitemap thiếu `<lastmod>` tag
Sitemap hiện chỉ có `<changefreq>` và `<priority>` nhưng thiếu `<lastmod>` — Google ưu tiên `<lastmod>` để quyết định re-crawl.

**Fix:** Thêm `<lastmod>2026-01-15</lastmod>` cho mỗi URL trong sitemap.xml.

## Tổng hợp thay đổi

| File | Thay đổi |
|------|----------|
| `index.html` | Xóa duplicate OG/Twitter meta tags |
| `public/sitemap.xml` | Thêm `<lastmod>` cho mỗi URL |
| `BlogPostFlowa.tsx` | Thêm `<article>`, `<time>`, img lazy+dimensions |
| `BlogPostMultiChannel.tsx` | Tương tự |
| `BlogPostAIContent.tsx` | Tương tự |
| `BlogPostRepurposing.tsx` | Tương tự |
| `Blog.tsx` | Kiểm tra img alt text trong cards |

Không cần migration hay thay đổi backend. Tổng ~7 files, mỗi file thay đổi nhỏ (5-15 dòng).

