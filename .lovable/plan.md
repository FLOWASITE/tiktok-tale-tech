
Mình đã kiểm tra code + logs và lỗi trong ảnh là đúng với backend hiện tại:

- Edge log trả về `reason: "client-not-enrolled"` từ API `users/me` của X.
- Callback page đang hiển thị nguyên `error_description` nên user thấy cả JSON dài, khó hiểu (và toast đỏ cũng bị tràn).

## Kế hoạch xử lý (2 phần: bắt buộc + cải thiện UX)

### 1) Bắt buộc bên X Developer (không thể fix hoàn toàn chỉ bằng code)
1. Gắn App vào một **Project** trong X Developer Portal.
2. Bật quyền App tối thiểu **Read and Write**.
3. Đảm bảo Redirect URI đúng với callback function hiện tại.
4. Sau khi cấu hình xong, chạy lại flow kết nối X.

> Nếu chưa làm bước này, OAuth vẫn fail dù frontend/backend đúng.

### 2) Sửa code để lỗi rõ ràng, không lộ JSON thô

#### A. `supabase/functions/x-oauth-callback/index.ts`
- Thêm hàm chuẩn hoá lỗi X API (`normalizeXError`):
  - Parse JSON từ `tokenText` / `userText`.
  - Map lỗi known:
    - `client-not-enrolled` → `error=x_client_not_enrolled`
    - `access_denied` → `error=access_denied`
    - token exchange fail → `error=x_token_exchange_failed`
    - fallback → `error=x_callback_failed`
- Redirect về frontend chỉ gửi:
  - `error` (mã ngắn, ổn định)
  - `error_description` (message thân thiện, ngắn)
  - optional `error_hint` (hướng dẫn ngắn)
- Không nhét raw payload JSON vào query string nữa.

#### B. `src/pages/XCallback.tsx`
- Map `error` code → nội dung tiếng Việt dễ hiểu:
  - `x_client_not_enrolled`: “Ứng dụng X chưa được gắn vào Project…”
  - `x_token_exchange_failed`: “Không đổi được mã xác thực…”
  - `access_denied`: “Bạn đã từ chối quyền truy cập…”
- Nếu có `error_hint`, hiển thị dưới dạng note/action items.
- Toast dùng bản rút gọn (1 dòng), card hiển thị chi tiết thân thiện.
- Tránh `decodeURIComponent` thẳng thành JSON hiển thị ra UI.

#### C. (Tuỳ chọn nhưng nên làm) `src/components/brand/BrandViewConnectionsTab.tsx`
- Khi popup đóng mà không có connection mới:
  - show toast “Kết nối chưa hoàn tất. Kiểm tra cấu hình X Developer nếu gặp lỗi client-not-enrolled.”
- Giúp user không bị “im lặng” sau khi popup đóng.

---

## Kết quả mong đợi
- User không còn thấy chuỗi JSON dài trong card/toast.
- Lỗi được hiển thị theo ngôn ngữ dễ hiểu + hướng dẫn hành động rõ.
- Sau khi app được gắn Project trên X Developer, flow kết nối sẽ hoàn tất bình thường.

## Files sẽ chỉnh
- `supabase/functions/x-oauth-callback/index.ts`
- `src/pages/XCallback.tsx`
- (tuỳ chọn) `src/components/brand/BrandViewConnectionsTab.tsx`
