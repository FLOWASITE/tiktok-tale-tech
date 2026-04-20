

# Hiện menu lệnh native trên Telegram

## Vấn đề
Hiện tại bot có Quick Reply Keyboard (4 nút text dưới input) và list lệnh trong app, nhưng **không có menu lệnh native của Telegram** — tức là nút "Menu" (icon `/`) bên trái input box không hiện danh sách lệnh để user click.

→ User mới phải nhớ tự gõ `/status`, `/brand`, `/campaigns`...

## Giải pháp
Telegram có API `setMyCommands` để đăng ký danh sách lệnh chính thức. Sau khi gọi 1 lần, **tất cả user của bot** sẽ thấy:
- Icon menu (☰) bên trái ô nhập tin nhắn
- Bấm vào hiện popup list lệnh + mô tả ngắn
- Khi user gõ `/`, autocomplete dropdown các lệnh
- Mobile: nút "Menu" bên dưới hiện luôn

## Phạm vi triển khai

### 1. Thêm helper `setMyCommands` vào `telegram-client.ts`
Wrapper gọi `POST /bot{token}/setMyCommands` với danh sách:
```
/start       — Bắt đầu / kết nối
/status      — Xem quota & pipeline
/brand       — Chọn thương hiệu active
/campaigns   — 5 campaign gần nhất
/generate    — Tạo campaign mới
/help        — Hướng dẫn
```

### 2. Tự động đăng ký khi admin register webhook
Trong `telegram-bot-admin/index.ts`, ngay sau `setWebhook(...)` thành công → gọi `setMyCommands(botToken, COMMANDS)`. Nếu fail chỉ log warning, không block flow (vì menu là enhancement, không critical).

### 3. Mỗi org = 1 bot riêng → chạy per-bot
Vì kiến trúc đã là multi-tenant 1 bot/org, mỗi lần admin register/re-register webhook sẽ tự sync menu cho bot đó.

### 4. (Optional) Nút "Re-sync menu" trong UI
Trong `TelegramBotConfigCard.tsx` thêm 1 nút nhỏ "Đồng bộ menu lệnh" gọi action `sync_commands` của edge function — phòng khi muốn update menu mà không cần re-register webhook.

## Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/_shared/telegram-client.ts` | + `setMyCommands()` + const `BOT_COMMANDS` |
| `supabase/functions/telegram-bot-admin/index.ts` | Gọi `setMyCommands` sau `setWebhook`; thêm action `sync_commands` |
| `src/hooks/useTelegramBotConfig.ts` | + `syncCommands()` method |
| `src/components/agents/TelegramBotConfigCard.tsx` | + button "Đồng bộ menu lệnh" |

## Behavior sau khi deploy
- Admin nào đã register webhook trước đó → bấm "Đồng bộ menu lệnh" 1 lần để áp dụng cho bot của họ
- Admin mới register → menu tự được set, không cần thao tác thêm
- User mở chat bot → thấy ngay nút Menu hiện list 6 lệnh

## Test sau khi triển khai
1. Vào Agent → Telegram → bấm "Đồng bộ menu lệnh"
2. Mở chat bot trong Telegram → thấy icon menu (☰) bên trái input
3. Bấm vào → hiện 6 lệnh + mô tả
4. Click 1 lệnh (vd `/status`) → tự gửi lệnh, bot phản hồi đúng

