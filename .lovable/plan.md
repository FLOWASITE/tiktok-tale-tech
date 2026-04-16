

## Sửa lỗi TikTok: "The request post info is empty or incorrect"

### Nguyên nhân gốc
So sánh code hiện tại với TikTok API docs cho thấy 2 vấn đề trong `publishPhotoPost()`:

1. **Thiếu `description`** trong `post_info` — TikTok photo post yêu cầu field `description` (caption text), không chỉ `title`
2. **`privacy_level` có thể không hợp lệ** — Giá trị `SELF_ONLY` phải khớp với danh sách cho phép của creator. Theo best practice, cần query creator info trước khi post, hoặc dùng `SELF_ONLY` (đúng format)

Ví dụ request body đúng từ TikTok docs:
```text
{
  "post_info": {
    "title": "funny cat",
    "description": "this will be a #funny photo on your @tiktok #fyp",
    "disable_comment": false,
    "privacy_level": "SELF_ONLY",
    "auto_add_music": true
  },
  "source_info": {
    "source": "PULL_FROM_URL",
    "photo_cover_index": 0,
    "photo_images": ["url1", "url2"]
  },
  "post_mode": "DIRECT_POST",
  "media_type": "PHOTO"
}
```

### Kế hoạch sửa

**File: `supabase/functions/publish-tiktok/index.ts`**

1. Thêm `description` vào `post_info` — lấy từ `content` (toàn bộ nội dung bài viết, max 2200 chars)
2. Thêm `photo_cover_index: 0` vào `source_info`
3. Tách `title` (dòng đầu, max 150 chars) và `description` (toàn bộ content, max 2200 chars) riêng biệt
4. Giữ `privacy_level: 'SELF_ONLY'` (an toàn cho app chưa được duyệt production)

**Thay đổi cụ thể trong hàm `publishPhotoPost`:**
- Thêm param `description: string`
- Thêm `description` vào `post_info`
- Thêm `photo_cover_index: 0` vào `source_info`

**Deploy lại** edge function `publish-tiktok`

### Không cần thay đổi
- Không cần migration
- Không cần sửa UI
- Không cần sửa channel-publisher (đã truyền `content` đúng)

