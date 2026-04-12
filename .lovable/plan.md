

# Thêm nút "Đăng lên Blog Flowa" từ giao diện nội dung

## Vấn đề

Khi bạn tạo content cho kênh **website**, nút "Đăng ngay" (`DirectPublishButton`) không hoạt động vì frontend chỉ hỗ trợ publish cho Twitter, Facebook, Zalo OA. Kênh `website` rơi vào `default` case và bị bỏ qua.

Backend (`channel-publisher` → `publish-blog`) đã sẵn sàng, nhưng frontend chưa kết nối.

## Giải pháp

### 1. Thêm `publishToBlog` vào `useDirectPublish` hook

Trong `src/hooks/useDirectPublish.ts`, thêm action mapping cho website:
- `website` → action `blog` (blog nội bộ) hoặc `flowa_blog` (blog công khai)
- Truyền thêm fields: `title`, `excerpt`, `slug`, `category`, `tags` từ content metadata

### 2. Cập nhật `DirectPublishButton` — xử lý website channel

Trong `src/components/social/DirectPublishButton.tsx`:
- Thêm case `website` vào switch statement trong `handlePublish`
- Hiển thị dialog cho phép chọn: **Blog nội bộ** vs **Blog Flowa (công khai)**
- Thêm form fields: tiêu đề bài, excerpt, category — pre-fill từ content
- Gọi `channel-publisher` với action `blog` hoặc `flowa_blog`

### 3. UI publish dialog cho website channel

Khi nhấn "Đăng ngay" trên kênh website, dialog hiển thị:
- **Tiêu đề bài viết** (auto-fill từ dòng đầu content)
- **Excerpt** (auto-fill từ 2-3 dòng đầu)
- **Chọn đích**: Blog nội bộ / Blog Flowa (flowa.vn/blog) — option Blog Flowa chỉ hiện nếu user là admin
- Nút **Đăng bài**

### Files thay đổi

- **Edit**: `src/hooks/useDirectPublish.ts` — thêm publishToBlog method + mapping
- **Edit**: `src/components/social/DirectPublishButton.tsx` — thêm website case + blog publish dialog

