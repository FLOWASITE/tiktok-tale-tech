

## Câu hỏi của user
"Tại sao phải cần Link kết nối?" — user thắc mắc tại sao bot Telegram cần bước "Tạo link kết nối" thay vì cho phép chat thẳng.

## Trả lời (research, không cần plan implementation)

### Lý do kỹ thuật

**1. Telegram chỉ biết `chat_id`, không biết user là ai trong app**
- Khi user nhắn bot, Telegram gửi cho ta payload chứa `telegram_chat_id` (vd: `123456789`) và optionally `username` (vd: `@john`).
- Ta KHÔNG có cách nào biết `chat_id 123456789` thuộc về user nào trong Flowa (user A hay user B trong cùng tổ chức?).

**2. Link kết nối = cầu nối danh tính**
- Deeplink chứa **token đã ký** (HMAC) bao gồm: `user_id` + `organization_id` + thời hạn 10 phút.
- Khi user click link → Telegram mở bot với lệnh `/start <token>` → webhook ta verify token → ghi vào bảng `telegram_chat_bindings`: "chat_id X = user Y trong org Z".
- Từ đó về sau, mọi tin nhắn từ chat_id X đều được map ngược về user Y → biết quota, brand, quyền hạn của ai.

**3. Bảo mật**
- Không thể giả mạo: token có chữ ký HMAC, chỉ server tạo được.
- Không thể replay: hết hạn sau 10 phút.
- Không cho phép random user nhắn bot rồi tự xưng "tôi là admin org ABC" → phải có proof.

### Giải pháp thay thế (nếu user không thích)

| Cách | Ưu | Nhược |
|---|---|---|
| **Link kết nối (hiện tại)** | An toàn, 1 click | Cần thao tác 1 lần |
| Nhập username Telegram trong app | Không cần link | Dễ giả mạo (ai cũng claim được @username), Telegram username có thể đổi |
| OAuth Telegram Login Widget | Chuẩn OAuth | Phức tạp hơn, cần widget JS, không work trên mobile app |
| Gõ mã 6 số trong chat | Đơn giản hơn deeplink? | Vẫn cần ra app lấy mã → tương đương link |

→ **Deeplink là cách chuẩn industry** (Linear, Notion, Vercel bot đều dùng cách này).

### Đề xuất UX (nếu muốn rõ ràng hơn cho user)

Hiện tại UI chỉ ghi "Tạo link kết nối" mà không giải thích tại sao. Có thể bổ sung:

1. **Tooltip/helper text** dưới nút "Tạo link kết nối":
   > "Link này gắn tài khoản Telegram của bạn với Flowa để bot biết bạn là ai khi chat."

2. **One-time only** — sau khi link 1 lần, không cần link lại trừ khi đổi tài khoản Telegram. Nhấn mạnh điều này.

3. **So sánh với Slack/Discord bot** — user quen với mô hình "add bot vào workspace" có thể không nhận ra sự khác biệt.

## Có cần code change không?

User chỉ hỏi *tại sao*, không yêu cầu thay đổi. Em sẽ trả lời câu hỏi + đề xuất nhỏ về UX (thêm 1 dòng helper text giải thích) — user quyết định có muốn implement không.

