
User đang xem trang `/agent/telegram` ở viewport 707px (tablet/mobile-ish). UI hiện tại có nhiều card nested + nhiều thông tin dồn dập → rối. Cần đơn giản hóa.

## Vấn đề cụ thể

1. **Card-trong-card**: `AgentTelegramPage` wrap mỗi step trong `<Card>` → bên trong `TelegramBotConfigCard` và `TelegramLinkCard` lại có thêm border/box → 2 lớp viền không cần thiết
2. **Quá nhiều badge & icon**: header có Badge status + StepHeader có icon status + bên trong có Badge "Active" lặp lại
3. **First setup quá tải**: BotFather callout 4 dòng + 2 input + nút lưu → user mới nhìn thấy nhiều thứ
4. **Webhook URL field**: hiển thị URL dài + nút copy → user không bao giờ cần dùng (đã auto-register), chỉ làm rối → ẩn vào "Chi tiết kỹ thuật" collapse
5. **Autonomy select**: thuật ngữ khó (`human_in_loop`) → hiển thị mặc định, ẩn vào advanced
6. **Group binding**: 1 section riêng dưới personal link → ở viewport hẹp nhồi nhét; nên collapse mặc định
7. **Command list accordion**: tốt rồi nhưng 3 group + icon + badge → giảm noise
8. **Step badges trùng lặp**: "Sẵn sàng kết nối" / "Đã kết nối" ở header + "Đã kết nối" lặp lại trong card

## Hướng đơn giản hóa

### A. Bỏ card-trong-card
- `AgentTelegramPage`: bỏ wrap `<Card>` quanh mỗi step. Dùng section đơn giản: số thứ tự + heading + content trực tiếp (không border).
- Chỉ giữ 1 Card ngoài cùng cho header tổng quan.

### B. Progressive disclosure (ẩn cái không cần)
- **TelegramBotConfigCard**:
  - First setup: chỉ hiện BotFather callout (rút gọn 1-2 dòng) + 2 input + 1 nút "Lưu & kích hoạt". Ẩn autonomy + webhook URL.
  - Sau khi có config: hiện trạng thái compact (1 dòng "✓ @bot_name • Active") + nút "Cập nhật token" (mở dialog/expand) + accordion "Cài đặt nâng cao" chứa autonomy + webhook URL + nút đăng ký lại + xóa.
- **TelegramLinkCard**:
  - Group binding → bỏ vào accordion "Group tổ chức (tùy chọn)" collapse mặc định.
  - Bot direct link → giữ nhưng compact hơn (inline với username, không box riêng).

### C. Giảm trùng lặp status
- Bỏ Badge "Active" trong BotConfigCard (status đã thể hiện ở header page).
- Step icon (✓ vs số) đủ → bỏ icon Circle/AlertCircle phụ bên cạnh title.

### D. Command list
- Bỏ icon group (UserPlus/Users/Send) cho gọn.
- Giữ 3 group nhưng dùng heading text-xs đơn giản.

### E. Mobile/narrow viewport
- 707px hiện đang ổn, nhưng sau khi bỏ card lồng nhau sẽ thoáng hơn nhiều.
- Bot username + "Mở chat" button: đảm bảo wrap tốt khi narrow.

## Files sửa

| File | Thay đổi |
|---|---|
| `src/pages/AgentTelegramPage.tsx` | Bỏ `<Card>` wrap quanh từng step, dùng section flat với divider. Bỏ icon trùng. Giảm noise command list (bỏ icon group). |
| `src/components/agents/TelegramBotConfigCard.tsx` | First setup: minimal (callout rút gọn + 2 input + 1 nút). Sau khi có config: compact status + accordion "Cài đặt nâng cao" chứa autonomy/webhook/đăng ký lại/xóa. Bỏ Badge "Active" duplicate. |
| `src/components/agents/TelegramLinkCard.tsx` | Group binding → wrap accordion collapse mặc định. Bot direct link inline gọn hơn. |

## Kết quả
- Trang ngắn hơn ~40%, ít border lồng nhau
- User mới chỉ thấy đúng 2-3 thứ cần làm thay vì 8-10 element
- Power user vẫn truy cập được webhook URL/autonomy qua "Cài đặt nâng cao"
- Mobile/narrow viewport thoáng, không bị nhồi nhét
