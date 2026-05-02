# Nâng cấp Internal Links: Duyệt & Lưu

## Mục tiêu
Biến `InternalLinksPanel` từ "chỉ gợi ý + copy" thành workflow **Quét → Duyệt (chọn + sửa anchor) → Lưu vào DB**, có quản lý liên kết đã duyệt.

## Migration: bảng `internal_links`
Lưu các liên kết user đã duyệt giữa 2 content.

**Cột:**
- `id`, `organization_id`, `created_by`, `created_at`, `updated_at`
- `source_content_id` → `multi_channel_contents(id)` ON DELETE CASCADE
- `target_content_id` → `multi_channel_contents(id)` ON DELETE CASCADE
- `anchor_text` TEXT (user có thể edit trước khi lưu)
- `url` TEXT
- `similarity` NUMERIC (snapshot tại lúc duyệt)
- `status` TEXT default `'approved'` (approved | inserted | dismissed)
- UNIQUE `(source_content_id, target_content_id)` — chống duplicate

**Index:** `source_content_id`, `organization_id`

**RLS:** SELECT/INSERT/UPDATE/DELETE chỉ cho thành viên `organization_members` cùng `organization_id`.

## UI: `src/components/seo/InternalLinksPanel.tsx` (rewrite)

### Bố cục
1. **Header** — nút "Gợi ý liên kết nội bộ" (đổi tên rõ ràng theo yêu cầu user) + badge "X đã lưu"
2. **Danh sách "Đã duyệt"** (load từ DB) — mỗi link: anchor, URL, nút Copy MD, nút Xóa (xanh nhạt highlight)
3. **Danh sách "Gợi ý mới"** sau khi quét:
   - Checkbox mỗi item, "Chọn tất cả"
   - Khi check → hiện ô input anchor có sẵn `anchor_suggestion` để user sửa
   - Hiển thị similarity %, URL, nút Copy MD lẻ
   - Filter bỏ những target đã có trong `internal_links` (tránh re-suggest)
4. **Nút "Lưu N liên kết đã chọn"** — bulk insert vào `internal_links`, refresh "Đã duyệt"

### Flow
- Mount → load saved từ DB
- Click "Gợi ý liên kết nội bộ" → invoke edge `suggest-internal-links` (match_count: 8) → filter ra targets chưa có saved
- Tick → optionally edit anchor → "Lưu" → bulk insert (status='approved') → suggestions list cập nhật, removed items biến mất
- Saved item: nút Copy markdown `[anchor](url)` hoặc Xóa

### Copy markdown
`[anchor_text](/blog/<target_id>)` — user paste vào content editor để chèn link thực sự.

## Files
- **Mới**: migration `internal_links` table
- **Rewrite**: `src/components/seo/InternalLinksPanel.tsx`
- **Không đổi**: `CoverageTab.tsx` (đã có dialog gọi panel này), edge function `suggest-internal-links`

## Out of scope
- Không tự động chèn anchor vào nội dung bài viết (user copy markdown thủ công). Nếu sau này cần auto-insert sẽ build separate "Apply links to content" action update `website_content`.
