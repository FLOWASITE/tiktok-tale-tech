# Pinterest Sandbox Toggle (test mode)

Cho phép kết nối Pinterest ở chế độ **Sandbox** bằng access token sinh thủ công từ Pinterest Developer Portal (như ảnh), để test code path publish mà không cần chờ Standard access. Sandbox **không tạo Pin thật** — chỉ để verify flow.

## 1. Database
Migration mới: thêm cột `is_sandbox boolean default false` vào `social_connections` (chỉ ý nghĩa với platform `pinterest`).
- Không đổi RLS, không đổi index.

## 2. Edge function: `publish-pinterest/index.ts`
- Đọc `connection.is_sandbox` từ row `social_connections` đang publish.
- Nếu `true` → đặt `PINTEREST_API = 'https://api-sandbox.pinterest.com/v5'`; ngược lại giữ production.
- Khi sandbox và gặp lỗi 403 trial-access (đã handle ở turn trước) → vẫn return 200 + `requiresAction` nhưng message khác: "Token sandbox hợp lệ, code path OK. Khi nào có Standard access thì bỏ sandbox để publish thật."
- Trong response success, gắn `data.sandbox = true` để FE biết đây là Pin sandbox (không hiển thị trên Pinterest thật).

## 3. Edge function mới: `connect-pinterest-sandbox/index.ts`
- Auth: `verify_jwt = true` (user phải đăng nhập). Khai báo trong `supabase/config.toml`.
- Input: `{ accessToken, organizationId, brandTemplateId? }`.
- Gọi `GET https://api-sandbox.pinterest.com/v5/user_account` với token để verify + lấy `username`, `id`.
- Nếu OK → upsert vào `social_connections`:
  - `platform='pinterest'`, `is_sandbox=true`, `access_token=<token>` (encrypt như flow OAuth hiện tại), `account_name=username`, `account_id=id`, `expires_at = now() + 30 days` (như Pinterest hiển thị).
- Trả `{ success: true, account: {...} }`.

## 4. Frontend
**`src/components/brand/PinterestConnectionCard.tsx`** (hoặc nơi đang render nút "Kết nối Pinterest"):
- Thêm 1 link nhỏ phía dưới nút OAuth: "Dùng Sandbox token để test →" → mở dialog.

**Component mới `PinterestSandboxDialog.tsx`**:
- Mô tả ngắn: "Sandbox dùng để test khi app chưa có Standard access. Pin tạo ra **không hiển thị trên Pinterest thật**."
- Link `https://developers.pinterest.com/apps/` + hướng dẫn 3 bước (vào app → tab "Configure" → chọn Sandbox → bấm "Create access token" → copy → dán vào đây).
- Input password-style cho token + nút "Kết nối sandbox".
- Gọi edge `connect-pinterest-sandbox` qua `supabase.functions.invoke`.
- Toast success/fail + invalidate query `social_connections`.

**Badge sandbox**:
- Trong list connection (vd `SocialConnectionsList.tsx`), nếu `connection.is_sandbox === true` → hiện badge nhỏ `Sandbox` (variant outline, màu muted) cạnh tên account.

## 5. Types
- Sau khi migration apply, `src/integrations/supabase/types.ts` auto-regen → có `is_sandbox`.
- Không tự sửa file này.

## Out of scope
- Không đổi PinterestBoardSelector — sandbox API trả board giả tự động.
- Không đổi production OAuth flow.
- Không thêm env var global `PINTEREST_USE_SANDBOX` (per-connection sạch hơn, cho phép giữ song song cả 2 connection).
