
User đang ở trang Telegram setup. Lỗi `NO_BOT_CONFIG` không phải bug — nhưng UX hiện tại tệ: user bấm "Tạo link kết nối" rồi mới biết cần admin cấu hình bot trước. Cần redesign để dẫn dắt user theo đúng thứ tự.

## Vấn đề UX hiện tại

1. 2 card nằm song song, user không biết phải làm card nào trước
2. User thường (non-admin) bấm "Tạo link" → lỗi → không biết phải làm gì
3. Admin không thấy guidance: "tạo bot ở đâu?", "lấy token kiểu gì?"
4. Trạng thái "chưa cấu hình bot" không hiển thị rõ ngay từ đầu — phải bấm mới biết
5. Webhook URL đọc khó, không có nút copy
6. Lệnh bot ở dưới rời rạc với phần config

## Plan sửa UI

### 1. `AgentTelegramPage.tsx` — Stepper layout
Thay grid 2 cột bằng layout tuần tự có trạng thái:
- **Header card**: tiêu đề "Telegram Agent" + mô tả ngắn + badge trạng thái tổng (Chưa cấu hình / Sẵn sàng / Đã kết nối)
- **Step 1 — Cấu hình Bot** (admin) — hiện trạng thái ✓/✗
- **Step 2 — Kết nối tài khoản cá nhân** — disabled + tooltip "Cần admin hoàn tất Step 1" nếu chưa có bot config
- **Step 3 — Link group (tùy chọn)**
- Lệnh bot: chuyển thành Accordion/Collapsible để bớt rối

### 2. `TelegramBotConfigCard.tsx` — Onboarding rõ ràng
- Thêm callout "Chưa có bot? Tạo qua @BotFather" + link `https://t.me/botfather` + 3 bước ngắn (1. Chat /newbot 2. Đặt tên 3. Copy token)
- Webhook URL: thêm nút **Copy** + ẩn bớt prefix dài (truncate giữa)
- Khi chưa có config: ẩn field "Autonomy" + "Webhook" — chỉ show username + token để giảm friction lần đầu
- Nút primary đổi label theo state: "Lưu & kích hoạt bot" (lần đầu) / "Cập nhật" (đã có)
- Sau khi save lần đầu → tự động gọi `registerWebhook()` luôn (không bắt user bấm 2 lần)

### 3. `TelegramLinkCard.tsx` — Empty state thông minh
- Nếu chưa có bot config (truyền prop `botReady` từ page): hiện empty state "Chờ admin cấu hình bot" + (nếu là admin) nút "Đi tới cấu hình"
- Nếu bot ready & chưa link: nút "Tạo link" + sau khi gen → hiện QR code (dùng `qrcode.react` đã có hoặc chỉ link `https://api.qrserver.com/v1/create-qr-code/?data=...`) cạnh deeplink để user mobile scan nhanh
- Group binding: tách thành step riêng với hướng dẫn 2 dòng "1. Add @bot vào group  2. Gõ /link_group"

### 4. Bảng lệnh bot
- Chuyển sang Accordion mặc định đóng
- Nhóm theo: Cá nhân (`/start`, `/status`, `/help`) vs Tạo nội dung (`/generate`) vs Admin (`/link_group`)
- Mỗi lệnh có badge quyền yêu cầu

### 5. Shared state
`AgentTelegramPage` lift state: lấy `useTelegramBotConfig()` ở page-level, truyền `config` xuống cả 2 card → `TelegramLinkCard` biết bot đã ready chưa để render empty state đúng (không cần đợi user bấm mới biết).

## Files cần sửa
- `src/pages/AgentTelegramPage.tsx` — layout stepper, lift bot config state, accordion lệnh
- `src/components/agents/TelegramBotConfigCard.tsx` — BotFather callout, copy webhook, auto-register lần đầu, conditional fields
- `src/components/agents/TelegramLinkCard.tsx` — nhận prop `botReady`, empty state, QR code

## Kết quả
- User mới vào: thấy ngay "đang ở step nào", không bấm mò
- Non-admin: được dẫn rõ "chờ admin", không gặp toast lỗi khó hiểu
- Admin: có hướng dẫn tạo bot từ @BotFather + auto register webhook (1 click thay 2)
- Mobile user: scan QR thay vì copy link dài
