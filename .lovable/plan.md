
Mình đã rà lại logs + code hiện tại, và nguyên nhân chính của lỗi “vẫn lỗi” đã rõ:

- `connect-social` chạy và OAuth callback đã đi vào `zalo-oauth-callback` (không còn kẹt ở bước redirect URI).
- Lỗi thật sự đang xảy ra ở `zalo-oauth-callback` khi giải mã credentials:
  - `TypeError: Invalid initialization vector`
  - sau đó ném `Invalid Zalo credentials`.
- Dữ liệu trong `social_platform_settings` của `zalo_oa` đang ở format mới (AES-GCM/base64), nhưng các function Zalo vẫn dùng decrypt CBC cũ ở nhiều chỗ.

## Kế hoạch xử lý

### 1) Chuẩn hóa mã hóa/giải mã cho toàn bộ luồng Zalo OA
**Files:**
- `supabase/functions/zalo-oauth-callback/index.ts`
- `supabase/functions/publish-zalo/index.ts`
- `supabase/functions/test-zalo-connection/index.ts`
- `supabase/functions/refresh-zalo-token/index.ts`

**Thực hiện:**
- Bỏ helper CBC cục bộ (`createDecipheriv/createCipheriv` kiểu cũ) trong 4 function trên.
- Dùng shared helper:
  - `decryptCredential(...)` để đọc `consumer_key`, `consumer_secret`, `access_token`, `refresh_token`
  - `encrypt(...)` để lưu token mới
- Giữ khả năng tương thích ngược nhờ fallback CBC có sẵn trong `_shared/crypto.ts`.

**Kết quả mong đợi:**
- Không còn lỗi `Invalid initialization vector`.
- OAuth callback giải mã được App ID/Secret và lưu connection thành công.

---

### 2) Sửa callback UI để tương thích đúng với proxy flow mới
**File:** `src/pages/ZaloCallback.tsx`

**Vấn đề hiện tại:**
- Page này vẫn yêu cầu `code/state` và gọi lại function lần 2.
- Nhưng proxy (`/api/zalo/callback`) đã gọi function rồi, sau đó điều hướng về `/auth/zalo/callback?success=true...`.
- Vì vậy page đang tự báo lỗi “Thiếu thông tin xác thực từ Zalo” dù flow có thể đã thành công.

**Thực hiện:**
- Đổi logic giống pattern `XCallback`:
  - Nếu có `success=true` thì hiển thị thành công ngay.
  - Nếu có `error` thì hiển thị lỗi từ query.
  - Chỉ fallback gọi function khi thực sự nhận `code/state` trực tiếp.
- Redirect về đúng brand (`/brands/:brandTemplateId`) thay vì route cũ `/settings/connections`.

---

### 3) Cải thiện thông báo lỗi ở proxy để dễ debug
**File:** `src/pages/ZaloOAuthProxy.tsx`

**Thực hiện:**
- Khi function trả lỗi, giữ nguyên message gốc từ backend và điều hướng về callback page với `success=false&error=...` thay vì chỉ hiển thị generic.
- Đồng bộ cách hiển thị với `ZaloCallback` mới để user thấy đúng nguyên nhân thay vì lỗi mơ hồ.

---

### 4) Checklist xác minh sau khi sửa
1. Từ Brand -> Kết nối Zalo OA -> popup OAuth mở bình thường.
2. Callback chạy qua `https://app.flowa.one/api/zalo/callback`.
3. Edge logs `zalo-oauth-callback` không còn `Invalid initialization vector`.
4. Bảng `social_connections` có bản ghi `platform='zalo_oa'`, `is_active=true`.
5. Nút **Test** Zalo OA pass.
6. Thử publish Zalo OA không còn lỗi decrypt token.

## Chi tiết kỹ thuật (tóm tắt)
- Đây là lỗi **mismatch crypto format** (GCM mới vs CBC cũ), không phải lỗi OAuth redirect ở bước hiện tại.
- Không cần migration DB.
- Trọng tâm là đồng bộ toàn bộ Zalo functions sang shared crypto helper để nhất quán với cách credentials đang được lưu bởi admin settings.
