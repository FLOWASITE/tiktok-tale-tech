

# Fix `user is not defined` trong `channel-publisher` resolve flow

## Nguyên nhân thực sự

Lỗi log gắn `channel-publisher/index.ts` nhưng thực ra đến từ block resolve payload mà tôi vừa thêm ở plan trước. Trong `channel-publisher/index.ts`, đoạn fatten payload cho `website/blog/flowa_blog` query bảng `social_connections` với filter `organization_id = mcc.organization_id`. Nhưng nếu code path nào đó còn reference `user.id` (vd để filter connection theo `user_id` thay vì `organization_id`) trong scope không có `user` → ReferenceError.

`publish-blog` đã fix ở turn trước (hoist `userId`). Lỗi hiện tại là **`channel-publisher` cũng có cùng pattern** ở nhánh resolve mới thêm.

## Fix

### `supabase/functions/channel-publisher/index.ts`

Trong block resolve cho `website/blog/flowa_blog`:
- Bỏ mọi reference đến `user` / `user.id` (internal flow từ Telegram không có user context).
- Connection lookup chỉ dựa vào `organization_id` + `brand_template_id` từ `multi_channel_contents` (đã đúng trong plan, chỉ cần verify không sót `user.id` nào).
- Nếu cần author info cho `publish-blog`, dùng `author_name` mặc định (`'Flowa Team'` hoặc lấy từ `mcc.created_by` profile nếu có) thay vì `user.id`.

### Verify các publish-* khác

Đọc lại `publish-threads`, `publish-zalo`, `publish-google-business`, `publish-website` để confirm pattern hoist `userId` đã apply đúng (giống `publish-blog`), không còn `user.id` lủng lẳng ngoài block `if (!isInternalCall)`.

## Files sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/channel-publisher/index.ts` | Loại bỏ mọi reference `user`/`user.id` trong block resolve payload; chỉ dùng `organization_id` + `brand_template_id` từ `multi_channel_contents`. |
| `supabase/functions/publish-website/index.ts` | Verify + hoist `userId` giống `publish-blog` nếu chưa. |
| `supabase/functions/publish-threads/index.ts` | Verify + hoist `userId` giống `publish-blog` nếu chưa. |
| `supabase/functions/publish-zalo/index.ts` | Verify + hoist `userId` giống `publish-blog` nếu chưa. |
| `supabase/functions/publish-google-business/index.ts` | Verify + hoist `userId` giống `publish-blog` nếu chưa. |

## Sau fix
Redeploy 5 functions trên → test lại Telegram "🚀 Đăng ngay" cho Website/Blog.

## Rủi ro
Thấp. Chỉ đụng scope variable, không thay đổi logic auth hay payload structure.

