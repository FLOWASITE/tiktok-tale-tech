

# Xác định Brand nào được tích hợp với /blog của Flowa

## Vấn đề hiện tại

- Trang `/blog` fetch **tất cả** bài từ `blog_posts` có `status = 'published'`, không lọc theo brand hay organization
- `publish-blog` edge function chấp nhận mọi request có auth, lưu `organization_id` nhưng không kiểm tra quyền đăng lên blog Flowa
- Không có cơ chế phân biệt: bài nào là blog **chính thức** của Flowa vs bài nội bộ của user

## Giải pháp: Thêm cột `is_public` + lọc theo organization

### 1. Migration — Thêm cột `is_public` vào `blog_posts`

```sql
ALTER TABLE blog_posts ADD COLUMN is_public boolean NOT NULL DEFAULT false;
```

- `is_public = true` → Hiển thị trên `/blog` landing page (blog chính thức Flowa)
- `is_public = false` → Blog nội bộ, chỉ hiển thị trong dashboard của org đó

### 2. Cập nhật Blog.tsx — Chỉ fetch bài `is_public = true`

Thêm filter `.eq('is_public', true)` vào query fetch blog list, đảm bảo chỉ bài được duyệt mới lên trang landing.

### 3. Cập nhật publish-blog — Cho phép set `is_public`

Thêm field `is_public` vào body input. Mặc định `false`. Chỉ admin Flowa (kiểm tra qua `has_role(user.id, 'admin')`) mới được set `is_public = true`.

### 4. UI trong BrandViewConnectionsTab — Thêm option "Đăng lên Blog Flowa"

Trong phần kết nối Website/Blog, thêm option mới `flowa_blog` vào dropdown `integrationType`:
- Label: "Blog Flowa (flowa.vn/blog)"
- Không cần nhập URL/API key — kết nối trực tiếp qua database
- Khi chọn option này, hệ thống tự động route publish qua `publish-blog` với `is_public = true` (nếu user là admin)

### 5. Luồng hoạt động

```text
Brand A (admin) chọn kênh "Blog Flowa"
  → Agent tạo content → channel-publisher → publish-blog
  → is_public = true (vì admin)
  → Hiển thị trên /blog landing

Brand B (user thường) chọn kênh "Blog"  
  → Agent tạo content → channel-publisher → publish-blog
  → is_public = false (mặc định)
  → Chỉ hiển thị trong dashboard
```

## Files thay đổi

- **Migration**: Thêm cột `is_public` vào `blog_posts`
- **Edit**: `src/landing/pages/Blog.tsx` — thêm filter `is_public = true`
- **Edit**: `src/landing/pages/BlogPost.tsx` — thêm filter `is_public = true` khi fetch single post
- **Edit**: `supabase/functions/publish-blog/index.ts` — xử lý `is_public`, kiểm tra admin role
- **Edit**: `src/components/brand/BrandViewConnectionsTab.tsx` — thêm option `flowa_blog`
- **Edit**: `supabase/functions/channel-publisher/index.ts` — phân biệt `blog` vs `flowa_blog`

