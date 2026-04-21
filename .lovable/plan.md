
# Fix còn thiếu: Mini App đang fail vì `organizationId` bị rỗng khi đã có session sẵn

## Vấn đề đã xác nhận từ code hiện tại

Lỗi còn tồn tại dù backend `telegram-webapp-auth` đã có fallback default-bot, vì frontend vẫn có một nhánh fail riêng:

- `src/hooks/useTelegramWebApp.ts`
  - nếu `supabase.auth.getSession()` đã có session thì hook **return ngay**
  - lúc đó `organizationId` chỉ lấy từ:
    - `?org=...`
    - `Telegram.WebApp.initDataUnsafe.start_param`
    - `localStorage['flowa_tg_app_org']`
- nếu cả 3 đều không có, state sẽ là:
  - `authenticated: true`
  - `userId: có`
  - `organizationId: null`

Trong khi `src/pages/TelegramApp.tsx` lại chặn bằng điều kiện:

```ts
if (!authenticated || !userId || !organizationId) {
  // render "Không xác thực được"
}
```

=> nghĩa là **không cần backend lỗi** vẫn hiện “Không xác thực được”.

Điều này cũng giải thích vì sao:
- logs `telegram-webapp-auth` không có gì mới
- checklist page có thể pass vài case backend nhưng người dùng vẫn lỗi thật trong Telegram
- bug chỉ xuất hiện ở flow “đã có session sẵn + mở từ nút Xem & duyệt nhưng thiếu org context”

## Cần build gì

### 1) Sửa hook `useTelegramWebApp` để không early-return quá sớm
File: `src/hooks/useTelegramWebApp.ts`

Thay logic:
- nếu đã có session nhưng **chưa có `candidateOrgId`**
  - vẫn phải gọi `telegram-webapp-auth` với `init_data`
  - lấy `organization_id` từ response
  - **không cần** `verifyOtp` lại nếu session đã tồn tại
- nếu đã có session và đã có `candidateOrgId`
  - mới được return ngay
- nếu chưa có session
  - giữ flow hiện tại: invoke edge function → `verifyOtp`

Mục tiêu:
```text
existing session + missing org
→ still resolve org from backend
→ organizationId được điền
→ TelegramApp không còn tự block
```

### 2) Tách rõ 2 bước trong hook: “resolve org” và “sign in”
Thiết kế lại flow trong hook:

```text
A. Đọc initData + org candidate
B. Kiểm tra session hiện tại
C. Gọi telegram-webapp-auth khi cần lấy organization_id
D. Nếu chưa có session thì mới verifyOtp
E. Luôn dùng organization_id từ response làm source of truth
```

Quy tắc sau fix:
- `payload.organization_id` luôn ưu tiên cao nhất
- sau đó mới fallback `candidateOrgId`
- lưu `resolvedOrg` vào `localStorage`

### 3) Parse lỗi edge function đầy đủ thay vì chỉ hiện lỗi generic
File: `src/hooks/useTelegramWebApp.ts`

Hiện tại hook chỉ `throw error`, dễ mất JSON body của edge function khi `invoke()` trả non-2xx.

Sẽ bổ sung pattern giống chỗ khác trong app:
- đọc `error.context?.json()` nếu có
- lấy ra:
  - `error`
  - `code`
  - `status`
- map thành message hiển thị chính xác hơn

Ví dụ:
- `not_linked`
- `ambiguous_org`
- `invalid initData signature`
- `initData expired`

### 4) Hiển thị diagnostic rõ hơn trên `TelegramApp`
File: `src/pages/TelegramApp.tsx`

Giữ card lỗi hiện tại nhưng thêm:
- thông điệp gốc từ hook
- nếu có `organizationId === null` nhưng `authenticated === true`
  - hiện riêng một thông báo kiểu:
  - “Đã nhận session nhưng chưa resolve được workspace từ Telegram”
- tránh gộp mọi case thành cùng một câu “Không xác thực được”

Điều này giúp phân biệt:
- lỗi Telegram initData
- lỗi link bot
- lỗi thiếu org context
- lỗi session có sẵn nhưng chưa resolve org

### 5) Nâng cấp checklist page để cover đúng bug thực tế
File: `src/pages/AdminTelegramAuthCheck.tsx`

Hiện checklist mới test raw edge function, nhưng **không test case gây lỗi thật** là:
- đã có session sẵn
- mở Mini App không có `org`
- frontend tự fail vì `organizationId` null

Sẽ thêm 2 bài test mới:

#### Test A — Raw function response
Giữ như hiện tại:
- exact HTTP status
- exact JSON body

#### Test B — Hook-level simulated flow
Mô phỏng logic frontend:
- with existing session
- without `?org`
- without localStorage
- with real `init_data`
- verify rằng vẫn resolve được `organization_id`

Checklist sau fix sẽ cho thấy rõ:
```text
Function OK
Frontend flow OK
Existing-session fallback OK
```

### 6) Kiểm tra thêm nút “Xem & duyệt” sau khi auth xong
File: `src/pages/TelegramApp.tsx`

Nút trong bot đang mở Mini App với hash path:
```text
#/multichannel/<contentId>
```

Nhưng `TelegramApp.tsx` hiện chưa đọc hash/path để auto mở đúng tab hay đúng content.
Sau khi xử lý auth xong, sẽ thêm bước đọc route intent để:
- ít nhất chuyển thẳng sang tab `approve`
- hoặc lưu pending target để mở màn hình phù hợp

Mục tiêu:
- không chỉ hết lỗi auth
- mà còn vào đúng flow “xem & duyệt”

## Files sẽ sửa

- `src/hooks/useTelegramWebApp.ts`
- `src/pages/TelegramApp.tsx`
- `src/pages/AdminTelegramAuthCheck.tsx`

## Cách verify sau khi implement

### Case 1 — đúng bug hiện tại
- user đã đăng nhập Flowa từ trước
- mở Telegram Mini App bằng nút “Xem & duyệt”
- URL không có `org`
- expected:
  - không còn hiện “Không xác thực được”
  - hook vẫn resolve được `organization_id`

### Case 2 — chưa có session
- mở từ Telegram lần đầu
- expected:
  - edge function trả `token_hash`
  - `verifyOtp` thành công
  - vào app bình thường

### Case 3 — chưa link bot
- expected:
  - hiện message rõ ràng yêu cầu `/start` trong DM

### Case 4 — nhiều org
- expected:
  - hiện lỗi `ambiguous_org` rõ ràng

### Case 5 — checklist admin
- `/admin/telegram-auth-check`
- thấy:
  - raw status
  - raw body
  - frontend-flow pass/fail
  - existing-session fallback pass/fail

## Rủi ro

Thấp đến trung bình:
- không đụng DB schema
- không đổi webhook logic
- chủ yếu sửa flow frontend auth
- phần cần cẩn thận nhất là tránh gọi `verifyOtp` lặp lại khi session đã tồn tại

## Kết quả mong đợi

Sau khi sửa:
- nút “Xem & duyệt” không còn rơi vào lỗi cũ
- default-bot auth hoạt động cả khi user đã có session sẵn
- app hiển thị đúng lỗi chi tiết nếu backend thực sự fail
- checklist page phản ánh đúng cả backend lẫn frontend flow
