

# Fix SEO cho SPA — Nội dung tĩnh cho Google Bot

## Vấn đề

Toàn bộ site là React SPA — Google bot không chạy JavaScript nên chỉ thấy `<div id="root"></div>` trống. Điều này ảnh hưởng tất cả trang: homepage, `/privacy`, `/terms`, v.v.

## Giải pháp

### 1. `index.html` — Thêm meta tags OG và nội dung `<noscript>`

- Bổ sung đầy đủ Open Graph meta tags (`og:title`, `og:description`, `og:url`, `og:image`, `og:site_name`, `og:locale`)
- Thêm Twitter Card meta tags
- Thêm block `<noscript>` chứa nội dung tĩnh mô tả Flowa:
  - Tên: Flowa — AI Content & Copywriting Platform
  - Mô tả ngắn về sản phẩm
  - Link đến các trang chính (Pricing, Terms, Privacy, Blog)
  - Thông tin liên hệ: info@flowa.one
  - URL: https://flowa.one

### 2. `index.html` — Thêm nội dung Privacy Policy tĩnh trong `<noscript>`

- Duplicate toàn bộ text nội dung 10 section của Privacy Policy vào block `<noscript>` dưới dạng HTML thuần (headings + paragraphs + lists)
- Điều này đảm bảo crawler đọc được đầy đủ nội dung chính sách bảo mật ngay từ HTML response

### Cấu trúc `<noscript>` block

```text
<noscript>
  <div>
    <h1>Flowa — AI Content & Copywriting Platform</h1>
    <p>Mô tả sản phẩm...</p>
    <nav>Links: Pricing | Terms | Privacy | Blog</nav>
    <hr/>
    <h2>Chính sách bảo mật</h2>
    <h3>1. Giới thiệu</h3>
    <p>Nội dung section 1...</p>
    ...tất cả 10 sections...
    <hr/>
    <p>Liên hệ: info@flowa.one | https://flowa.one</p>
  </div>
</noscript>
```

## Lưu ý

- `<noscript>` content chỉ hiển thị khi JS bị tắt hoặc cho crawler — không ảnh hưởng UI bình thường
- Helmet/SEOHead vẫn hoạt động cho trình duyệt có JS — hai layer bổ trợ nhau
- Giải pháp này là tạm thời nhưng hiệu quả cho SPA. Giải pháp lý tưởng dài hạn là SSR/SSG (không khả dụng trên Lovable)

## File thay đổi

| File | Thay đổi |
|------|----------|
| `index.html` | Thêm OG meta tags, Twitter tags, và `<noscript>` block với nội dung tĩnh homepage + privacy |

