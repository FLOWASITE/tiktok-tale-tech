## Vấn đề

Bấm "Đồng bộ" Pinterest board không hiện board nào, mặc dù API gọi thành công (status 200).

## Nguyên nhân

`PinterestBoardSelector.tsx` đọc danh sách board từ table `pinterest_boards` trong DB, nhưng edge function `pinterest-list-boards` chỉ fetch từ Pinterest API và return JSON — **không bao giờ upsert kết quả vào `pinterest_boards`**. Vì vậy table luôn rỗng → dropdown luôn hiển thị "Chưa có board nào".

## Giải pháp (1 file)

Sửa `supabase/functions/pinterest-list-boards/index.ts`:

1. Sau khi fetch xong toàn bộ boards từ Pinterest API (logic phân trang giữ nguyên), thêm bước **upsert vào `pinterest_boards`** với service client:
   - Map mỗi board thành row: `connection_id`, `organization_id` (lấy từ `social_connections.organization_id`), `board_id` (= Pinterest id), `name`, `privacy`, `pin_count`, `cover_image_url` (nếu API trả).
   - Dùng `upsert(..., { onConflict: 'connection_id,board_id' })` để idempotent.
2. (Tuỳ chọn nhỏ) Xoá những board đã không còn tồn tại trên Pinterest cho `connection_id` này (delete những row có `board_id NOT IN (...fetched ids)`), để dropdown không hiển thị board đã xoá.
3. Giữ nguyên response `{ success: true, boards }` để không phá client hiện tại.

Không cần đổi frontend, không cần migration (table + unique constraint đã có sẵn).

## Verify

1. Vào `/brands/...?tab=connections` → mở thẻ Pinterest → bấm nút Đồng bộ (icon refresh).
2. Toast "Đã đồng bộ board" xuất hiện, dropdown liệt kê các board của @flowasite.
3. Chọn 1 board → "Lưu board mặc định" → reload trang vẫn giữ.
4. Thử "Đăng ngay" 1 nội dung Pinterest → không còn lỗi "Chưa chọn Pinterest board".
