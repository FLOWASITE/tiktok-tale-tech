
# Fix: nút “Xem & duyệt” trong Telegram mở Mini App nhưng thiếu `organization_id`

## Vấn đề đã xác định

Ảnh lỗi khớp đúng với logic hiện tại của `useTelegramWebApp`:

- `src/hooks/useTelegramWebApp.ts` chỉ xác thực được khi URL có `?org=<uuid>` hoặc đã có `localStorage['flowa_tg_app_org']`
- nếu không có `org`, hook trả lỗi:
  - `Thiếu organization id. Mở từ menu bot Telegram.`
- nút Telegram hiện tại mở Mini App bằng:
```ts
web_app: { url: `${MINI_APP_URL}#/multichannel/${contentId}` }
```
trong `supabase/functions/telegram-webhook/index.ts:1282-1285`

Do app dùng `BrowserRouter`, phần `#/multichannel/...` chỉ là fragment; query string không được set. Kết quả:
- Mini App mở ra
- `useTelegramWebApp()` không tìm thấy `org`
- hiện card lỗi “Không xác thực được”

Ngoài ra, nút menu bot và vài entry khác cũng đang trỏ tới bare URL `https://app.flowa.one/telegram-app` nên lần mở đầu tiên từ Telegram cũng có thể fail tương tự.

## Cách sửa

### 1) Luôn truyền `org` vào mọi URL Web App do bot tạo ra
Tạo helper trong `telegram-webhook/index.ts` hoặc utility cục bộ kiểu:

```ts
function buildMiniAppUrl(base: string, orgId: string, path?: string) {
  const u = new URL(base);
  u.searchParams.set("org", orgId);
  if (path) u.hash = path.startsWith("#") ? path : `#${path}`;
  return u.toString();
}
```

Áp dụng cho:
- nút `📝 Xem & duyệt`
- nút `🚀 Mở Mini App`
- mọi `web_app` keyboard khác trong `telegram-webhook`

Ví dụ sửa:
```ts
web_app: { url: buildMiniAppUrl(MINI_APP_URL, botConfig.organizationId!, `/multichannel/${contentId}`) }
```

### 2) Sửa menu button để mở Mini App kèm `org`
Trong `supabase/functions/telegram-bot-admin/index.ts`:
- chỗ seed bot mới
- chỗ action `set_menu_button`

Cần set:
```ts
https://app.flowa.one/telegram-app?org=<organization_id>
```

Vì menu button là per-bot/per-org nên hoàn toàn phù hợp để embed org cố định.

### 3) Tăng độ bền ở client hook
Cập nhật `src/hooks/useTelegramWebApp.ts` để resolve org theo thứ tự:

1. `?org=...`
2. `Telegram.WebApp.initDataUnsafe.start_param` hoặc equivalent nếu Telegram cung cấp
3. `localStorage['flowa_tg_app_org']`

Nếu Telegram SDK typings chưa có `start_param`, chỉ cần thêm optional field vào interface.  
Mục tiêu: giảm phụ thuộc tuyệt đối vào localStorage và giúp deep link hoạt động ổn định hơn.

### 4) Sửa đường dẫn Web App cho các route hash hiện tại
Hiện code đang dùng:
```ts
${MINI_APP_URL}#/multichannel/${contentId}
```

Sau fix nên chuẩn hóa thành:
```ts
https://app.flowa.one/telegram-app?org=<org>#/multichannel/<id>
```

Như vậy:
- query phục vụ auth/org resolution
- hash phục vụ điều hướng nội bộ Mini App

### 5) Kiểm tra các chỗ mở Mini App khác để tránh lỗi lặp lại
Rà lại các điểm sau:
- `telegram-webhook/index.ts`
- `telegram-bot-admin/index.ts`
- `_shared/telegram-client.ts` với các keyboard có `web_app`
- welcome/tutorial/brand-management buttons

Mục tiêu: không còn bất kỳ `web_app: { url: MINI_APP_URL }` trần nào khi context org là bắt buộc.

## Files cần sửa

- `supabase/functions/telegram-webhook/index.ts`
- `supabase/functions/telegram-bot-admin/index.ts`
- `src/hooks/useTelegramWebApp.ts`
- có thể thêm chỉnh nhẹ ở `supabase/functions/_shared/telegram-client.ts` nếu muốn truyền vào URL đã được build sẵn từ caller

## Test E2E

1. Telegram bot gửi bài đơn lẻ → bấm `📝 Xem & duyệt`
   - mở Mini App vào đúng trang
   - không còn lỗi `Thiếu organization id`

2. Mở từ menu bot `🚀 Mở Flowa`
   - Mini App vào được ngay từ lần đầu
   - authenticate thành công, không cần dựa vào localStorage cũ

3. Đổi brand rồi bấm lại `Xem & duyệt`
   - vẫn vào đúng org
   - không quay về màn hình lỗi

4. User mới chưa từng mở Mini App trước đó
   - bấm menu bot hoặc `Xem & duyệt`
   - vẫn authenticate OK

## Rủi ro

Thấp. Đây là bug ghép URL/context, không đụng DB schema hay logic approve.  
Phần cần cẩn thận nhất là chuẩn hóa URL builder để không làm hỏng hash route hiện có.

## Kết quả mong đợi

Khi người dùng nhấn nút “Xem và duyệt” trong Telegram:
- Mini App mở đúng URL có `org`
- `useTelegramWebApp()` xác thực được
- không còn hiện “Không xác thực được”
- vào thẳng flow xem/duyệt nội dung như mong muốn
