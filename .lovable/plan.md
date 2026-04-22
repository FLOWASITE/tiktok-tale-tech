
# Dọn lại toàn bộ copy Telegram cho gọn, dễ đọc hơn

## Mục tiêu
Làm toàn bộ phần text Telegram bớt rối mắt, nhất quán hơn, đặc biệt ở các message dạng status/onboarding/reconnect:

- bỏ tình trạng “vừa có bullet vừa có icon” trong cùng 1 dòng
- giảm icon trang trí thừa ở các dòng nội dung
- giữ icon chỉ ở level tiêu đề/section khi thực sự cần
- wording ngắn hơn, quét mắt dễ hơn trên mobile

## Vấn đề đang thấy
Từ screenshot và code hiện tại, phần Telegram đang bị rối vì:

1. **Header/section có icon, nhưng từng bullet con vẫn có thêm icon**
   - ví dụ `• 🎨 Brand đang xem`
   - vừa bullet vừa emoji nên nhìn nặng mắt

2. **Status message dùng quá nhiều marker khác nhau**
   - `📊`, `👤`, `📈`, `🚀`, `✅`, `💡`, `👉`, `•`
   - mỗi section một kiểu, thiếu hệ thống thị giác rõ ràng

3. **Một số câu dài, nhiều vế**
   - nhất là onboarding / reconnect / not-connected
   - mobile Telegram nhìn bị đặc chữ

## Phạm vi cần đồng bộ

### 1) Status message trong bot
File: `supabase/functions/telegram-webhook/index.ts`

Hiện `handleStatus()` đang render kiểu:
- section có icon
- các dòng con bắt đầu bằng `•`
- có dòng lại thêm icon bên trong bullet

Sẽ format lại theo nguyên tắc:

#### Cấu trúc mới
```text
Trạng thái Flowa — Tháng 4/2026

Tài khoản
• Tổ chức: ...
• Gói: ...
• Quyền agent: ...
• Brand đang xem: ...

Sử dụng tháng này
• Pipeline (toàn org): ...
• Còn ... lượt

Pipeline đang chạy (4)
• ...
• ...
```

#### Quy tắc áp dụng
- giữ tối đa **1 icon cho dòng tiêu đề lớn** hoặc bỏ luôn nếu không cần
- **mọi dòng bullet con chỉ là `•` + text**, không chèn thêm emoji
- bỏ các icon trong bullet như:
  - `• 🎨 Brand đang xem` → `• Brand đang xem`
  - `• ♾️ Không giới hạn` → `• Không giới hạn` hoặc gộp thành câu gọn hơn
- giữ câu ngắn, tách section rõ bằng dòng trống

### 2) Help text
File: `supabase/functions/telegram-webhook/index.ts`

`helpText()` hiện có nhiều dòng ví dụ mở bằng `•`, phần này ổn hơn status nhưng vẫn cần tinh gọn:

- bỏ icon nếu đã có tiêu đề section
- tách rõ:
  - Lệnh chính
  - Ví dụ chat tự nhiên
  - Kênh hỗ trợ
- dùng wording ngắn hơn, ít dấu nhấn markdown thừa

Định hướng:
```text
Lệnh hỗ trợ
/start <token> — Kết nối tài khoản
/status — Xem quota tháng này
...

Ví dụ chat tự nhiên
• Viết 1 bài Facebook về spa giảm 30%
• Tạo caption Instagram xây thương hiệu cho spa
...
```

### 3) Onboarding / not-linked / reconnect messages
File: `supabase/functions/telegram-webhook/index.ts`

Các message này đang đúng positioning, nhưng vẫn hơi nhiều icon và câu hơi dày.

Sẽ đồng bộ theo format:
- 1 dòng chào
- 1 đoạn giá trị ngắn
- 1 block hướng dẫn 2–3 bước
- 1 CTA cuối

Ví dụ hướng:
```text
Chào bạn!

Mình là AI Marketing Agent, trợ lý giúp bạn tạo nội dung, xây dựng và quản lý campaign, đồng thời theo dõi hiệu quả ngay trên Telegram.

Cách kết nối:
1. Mở app Flowa
2. Bấm “Kết nối tài khoản & bắt đầu ngay”
3. Quay lại Telegram và chat với bot

Bắt đầu thử ngay!
```

Quy tắc:
- không dùng icon ở từng dòng step nếu đã đánh số
- giữ tối đa 1 icon ở câu chào nếu cần
- message reconnect/not-linked dùng cùng cấu trúc wording để nhất quán

### 4) Telegram link card trong app
File: `src/components/agents/TelegramLinkCard.tsx`

Card hiện đã đúng positioning nhưng vẫn có vài chỗ có thể “dọn copy” để đồng bộ với bot:

- bỏ icon trong title text nếu title đã có icon ở phần visual card
  - `🎉 Chào bạn!` có thể đổi thành `Chào bạn!`
- footer note gọn hơn, bớt cảm giác slogan chồng slogan
- connected state note/reconnect note ngắn hơn, ít nhấn mạnh lặp

Định hướng:
- **UI icon để ở component icon**
- **text thuần để đọc nhanh**
- tránh “icon trong text + icon component” cùng lúc

## Cách triển khai

### A. Thiết lập quy chuẩn copy Telegram
Áp dụng chung cho mọi message:

- **Title/section:** không quá 1 icon
- **Bullet lines:** chỉ dùng `•`, không kèm emoji
- **Steps:** dùng số `1. 2. 3.`, không thêm icon
- **CTA:** giữ đúng câu `Bắt đầu thử ngay`
- **Tone:** ngắn, rõ, ít khoa trương

### B. Refactor các text builder trong webhook
Trong `telegram-webhook/index.ts`:
- sửa `handleStatus()` để render text theo format sạch hơn
- sửa `helpText()` theo cấu trúc rõ hơn
- rà lại toàn bộ message:
  - not linked
  - onboarding
  - reconnect guidance
  - success/welcome
  - fallback invalid command

### C. Đồng bộ frontend card
Trong `TelegramLinkCard.tsx`:
- bỏ icon bên trong copy nếu UI đã có icon riêng
- rút gọn note ở trạng thái connected / not connected
- giữ CTA button hiện tại, không đổi logic

## Files sẽ sửa
- `supabase/functions/telegram-webhook/index.ts`
- `src/components/agents/TelegramLinkCard.tsx`

## Không đổi
- logic binding/reconnect
- deep link flow
- quyền / phân quyền / DB
- positioning “AI Marketing Agent”
- CTA cuối “Bắt đầu thử ngay”

## Kết quả mong muốn
Sau khi làm xong, mọi copy Telegram sẽ:

- sạch và dễ quét mắt hơn trên mobile
- không còn kiểu “bullet + emoji” chồng nhau
- đồng bộ giữa bot và card trong app
- vẫn giữ được branding “AI Marketing Agent”, nhưng nhìn chuyên nghiệp hơn và bớt rối
