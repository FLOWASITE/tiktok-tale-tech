

# Fix: Bài blog không hiển thị sau khi đăng thành công

## Nguyên nhân gốc

Hai vấn đề khiến bài viết không xuất hiện trên `/blog`:

1. **`status` luôn là `'draft'`**: Edge function `publish-blog` mặc định `status = 'draft'`, nhưng frontend không gửi `status: 'published'` khi người dùng nhấn đăng bài.

2. **`is_public` luôn là `false`**: Frontend gửi `action: 'blog'` thay vì `'flowa_blog'` khi `blogIsPublic = true`, nên `channel-publisher` không inject `is_public: true`. Đồng thời, frontend cũng không truyền `is_public` trực tiếp trong body.

**Kết quả**: Bài viết được lưu với `status = 'draft'` + `is_public = false`, trong khi trang `/blog` chỉ hiển thị bài có `status = 'published'` AND `is_public = true`.

## Giải pháp

### 1. Sửa `useDirectPublish.ts` — Gửi `status: 'published'`

Thêm `status: 'published'` vào body khi gọi `channel-publisher`, vì người dùng nhấn "Đăng" có nghĩa là muốn xuất bản, không phải lưu nháp.

### 2. Sửa `useDirectPublish.ts` — Truyền `is_public` trong body

Đảm bảo khi `isPublic = true`, giá trị `is_public: true` được gửi trực tiếp trong body (ngoài việc chọn đúng action `flowa_blog`).

## Files thay đổi

- **Edit**: `src/hooks/useDirectPublish.ts` — thêm `status: 'published'` và `is_public: options.isPublic` vào body của `publishToBlog`

