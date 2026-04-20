

User hỏi mở — cần đề xuất các improvement cho Telegram bot. Dựa vào context hiện tại:

**Đã có:**
- Free chat (intent classifier qwen-plus)
- `/start`, `/status` (mini dashboard mới), `/help`, `/generate`, `/link_group`
- Permission fallback owner/admin

**Gaps tôi thấy:**
1. Không có notification push từ Flowa → Telegram (pipeline done, approval needed, publish success/fail)
2. Không có inline buttons (approve/reject ngay trên Telegram)
3. Không nhận ảnh/file (upload brand reference, logo qua chat)
4. Không có `/campaigns` để list nhanh campaign
5. Không group chat support đầy đủ (mention bot, multi-user trong team)
6. Free chat chưa có context brand (bot không biết user đang làm brand nào)
7. Không có rate limit per user → dễ abuse credits
8. Không có quick reply keyboard cho action thường dùng

Đề xuất dạng menu để user chọn priority.

---

# Đề xuất cải thiện Telegram Bot

Hiện bot đã có: free chat AI, `/status` dashboard, `/generate`, permission auto cho owner/admin. Dưới đây là các hướng nâng cấp xếp theo **mức độ tác động**.

## 🔥 High impact — đáng làm trước

### 1. Push notification từ Flowa → Telegram
Bot đang **một chiều** (user hỏi → bot trả). Thiếu chiều ngược: khi có sự kiện trong app, đẩy về Telegram.
- Pipeline hoàn tất → "✅ Campaign 'Spa trẻ hóa' đã sẵn sàng duyệt"
- Cần approval → ping admin kèm inline button **Duyệt / Từ chối / Xem chi tiết**
- Publish thành công/thất bại → báo ngay
- Quota chạm 80% / 100% → cảnh báo

→ Cho phép user **rời app vẫn nắm hết** mọi thứ quan trọng.

### 2. Inline buttons (Telegram InlineKeyboard)
Thay vì user phải mở app để duyệt, gắn button trực tiếp vào message:
```
[✅ Duyệt] [❌ Từ chối] [👁 Xem]
[📅 Lên lịch đăng]
```
Click → bot xử lý ngay qua callback_query, không cần rời chat.

### 3. Brand context trong free chat
Hiện chat AI không biết user đang dùng brand nào → trả lời chung chung.
- Lệnh `/brand` → list brand, chọn active brand cho phiên chat
- Free chat ngầm prepend brand context (tone, industry, USP) vào prompt
- `/generate` tự dùng brand đang active

## ⚡ Medium impact

### 4. Rate limit per user
Hiện 1 user spam free chat → đốt credits cả tổ chức.
- Giới hạn ~20 free-chat msg / giờ / user
- Vượt → bot báo "đã đạt giới hạn, thử lại sau X phút"
- Lệnh `/`, `/status`, `/help` không tính

### 5. Quick reply keyboard
Khi user `/start`, hiện keyboard cố định 2-3 nút:
```
[📊 Status] [🚀 Tạo campaign]
[📅 Lịch đăng] [💡 Help]
```
→ User không phải nhớ lệnh.

### 6. `/campaigns` list nhanh
Tương tự `/status` nhưng focus campaigns:
- 5 campaign mới nhất + status
- Inline button "Xem tất cả" → mở app deeplink

### 7. Nhận ảnh / file
User gửi ảnh logo / sample → bot upload vào brand assets.
User gửi PDF brief → bot đọc và tự `/generate`.

## 🌱 Nice to have

### 8. Group chat nâng cao
- Mention `@flowa_bot` trong group team mới phản hồi (không spam)
- Notification chỉ gửi tới group đã link, theo organization
- Hỗ trợ thread reply giữ context

### 9. Daily/weekly digest
Mỗi sáng 8h gửi tóm tắt: "Hôm qua publish 3 bài, hôm nay 2 bài lên lịch, quota còn 18/30".

### 10. Voice message → command
User gửi voice → Whisper transcribe → route như text message.

---

## Câu hỏi cho bạn

Mình đề xuất **chọn 1-2 hướng làm trước** thay vì làm tất cả. Bạn muốn ưu tiên hướng nào?

- **A)** Push notification + inline approve buttons (mục 1+2) — biến Telegram thành "remote control" cho Flowa
- **B)** Brand context + rate limit (mục 3+4) — chat AI thông minh & an toàn hơn
- **C)** Quick keyboard + `/campaigns` (mục 5+6) — UX gọn cho user mới
- **D)** Bạn có hướng khác / kết hợp riêng

Cho mình biết lựa chọn, mình sẽ viết plan chi tiết để triển khai.

