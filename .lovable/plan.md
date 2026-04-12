

# Fix: Loại bỏ "SEO Title" và "Meta Description" khỏi nội dung blog

## Nguyên nhân

AI model đôi khi nhúng các dòng như `**SEO Title:** ...` và `**Meta Description:** ...` trực tiếp vào phần nội dung bài viết (field `content` trong JSON response). Khi bài được đăng lên blog, những dòng này hiển thị như nội dung bình thường vì chúng nằm trong Markdown content.

Mặc dù `website_content` DB column chỉ lưu phần `content` (đã tách khỏi SEO metadata object), AI vẫn đôi khi viết lại metadata trong chính body text.

## Giải pháp

### 1. Thêm hàm `stripSeoMetadata` vào `src/utils/contentFormatter.ts`

Hàm này sẽ loại bỏ các dòng metadata phổ biến m