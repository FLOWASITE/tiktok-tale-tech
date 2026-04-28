## Vấn đề

Hiện tại OAuth Facebook tự động chọn `pages[0]` và chỉ tạo **1** connection cho brand. Không có cách nào chọn / kết nối thêm Fanpage thứ 2, 3...

Bằng chứng:
- `supabase/functions/facebook-oauth-callback/index.ts` line 198: `const selectedPage = pages[0];` — auto pick page đầu tiên.
- Toàn bộ danh sách pages đã được lưu sẵn vào `metadata.available_pages` (line 243) nhưng UI không dùng.
- `FacebookCallback.tsx` chỉ hiển thị thành công, không có bước chọn page.

Tin tốt: bảng `social_connections` không có UNIQUE constraint trên `(brand_template_id, platform)` → có thể chèn nhiều dòng Facebook cho cùng 1 brand miễn `platform_user_id` (page_id) khác nhau.

## Giải pháp

Tách OAuth thành 2 bước: **(1) lấy long-lived user token + danh sách pages**, **(2) user chọn page nào để lưu**. Cho phép quay lại bước 2 bất cứ lúc nào để thêm fanpage mới mà không cần OAuth lại.

### 1. Edge function `facebook-oauth-callback` (sửa)
- Sau khi đổi long-lived user token, KHÔNG auto-tạo page connection.
- Lưu user token tạm vào bảng mới `facebook_oauth_sessions` (id, user_id, organization_id, brand_template_id, encrypted_user_token, pages JSONB, expires_at = +10 phút).
- Redirect về `/auth/facebook/callback?session_id=...&pages_count=N&brand_template_id=...`.

### 2. Edge function mới `facebook-attach-page`
- Input: `{ session_id, page_id, brand_template_id }`.
- Validate session còn hạn + thuộc về user đang đăng nhập.
- Lấy `page_access_token` tương ứng từ `pages` JSON, encrypt GCM, upsert vào `social_connections` (key: `brand_template_id + platform_user_id`).
- Subscribe webhook (giữ logic hiện tại).
- Trả về `{ connection_id, page_name }`.

### 3. UI: `FacebookCallback.tsx` (sửa)
- Khi có `session_id`: gọi edge function `facebook-list-session-pages` → render danh sách Page (avatar + tên + category + badge "Đã kết nối" nếu page_id đã có trong `social_connections` của brand).
- Mỗi page có nút "Kết nối" hoặc "Đã kết nối ✓".
- Sau khi kết nối ≥1 page → button "Hoàn tất" về `/brands/:id`.

### 4. UI: `BrandViewConnectionsTab.tsx` (sửa)
- Trong card Facebook: nếu đã có ≥1 fanpage kết nối, hiển thị danh sách dạng list (avatar + name + status badge).
- Thêm button **"+ Thêm Fanpage"** → mở lại OAuth flow (hoặc nếu session còn hạn thì mở thẳng picker).
- Mỗi fanpage có menu "Ngắt kết nối" riêng.

### 5. Hooks/utils
- Cập nhật `useSocialConnections` để return list fanpages (không còn giả định 1 connection / platform / brand).
- Cập nhật `DirectPublishButton` & `useRetryPublish`: nếu brand có nhiều fanpage → hiện dropdown chọn page khi publish (mặc định page được đánh dấu `is_default` trong metadata).

### 6. Migration
- Tạo bảng `facebook_oauth_sessions`:
  ```sql
  CREATE TABLE facebook_oauth_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id uuid,
    brand_template_id uuid,
    encrypted_user_token text NOT NULL,
    pages jsonb NOT NULL DEFAULT '[]'::jsonb,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE facebook_oauth_sessions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users see own sessions" ON facebook_oauth_sessions
    FOR ALL TO authenticated USING (user_id = auth.uid());
  CREATE INDEX ON facebook_oauth_sessions (expires_at);
  ```
- pg_cron: dọn session hết hạn mỗi giờ.

## Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/migrations/<new>.sql` | Tạo bảng `facebook_oauth_sessions` + RLS |
| `supabase/functions/facebook-oauth-callback/index.ts` | Bỏ auto-pick page, lưu session, redirect kèm `session_id` |
| `supabase/functions/facebook-list-session-pages/index.ts` (mới) | Trả pages của session cho UI |
| `supabase/functions/facebook-attach-page/index.ts` (mới) | Tạo connection cho page user chọn |
| `src/pages/FacebookCallback.tsx` | Thêm bước Page Picker |
| `src/components/brand/BrandViewConnectionsTab.tsx` | List nhiều fanpage + nút "Thêm Fanpage" |
| `src/components/social/DirectPublishButton.tsx` + `useRetryPublish.ts` | Chọn page khi publish nếu có ≥2 |
| `src/hooks/useSocialConnections.ts` | Trả list thay vì single |
| `mem://features/brand/multi-fanpage-connection-vn.md` (mới) | Document rule mới |

## Tóm tắt cho user

Sau khi xong, OAuth Facebook sẽ hiện bảng chọn Page → bạn tick page nào thì page đó được kết nối vào brand. Quay lại tab "Kết nối" sẽ thấy danh sách tất cả fanpage đã link, kèm nút "+ Thêm Fanpage" để gắn thêm page khác. Khi đăng bài mà brand có nhiều page sẽ có dropdown chọn page đích.
