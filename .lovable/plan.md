

# Thêm nút "Quay lại Blog" vào trang bài viết

## Vấn đề
Trang chi tiết bài viết (`DynamicBlogPost.tsx`) không có nút back để quay lại danh sách blog, gây khó khăn cho người đọc khi muốn quay lại.

## Giải pháp

Thêm nút "Quay lại" ngay dưới breadcrumb (dòng 97), trước hero image. Nút sử dụng icon `ArrowLeft` (đã import sẵn) và link về `/blog`.

```text
Breadcrumb
← Quay lại Blog          ← nút mới
[Cover Image]
[Title...]
```

## File thay đổi

- **Edit**: `src/landing/components/DynamicBlogPost.tsx` — Thêm `<Link to="/blog">` button với icon ArrowLeft ngay sau breadcrumb, style subtle (ghost variant) phù hợp soft luxury.

