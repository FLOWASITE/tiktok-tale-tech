
# Viết lại lời giới thiệu Telegram theo copy mới

## Mục tiêu
Đồng bộ phần giới thiệu/CTA theo thông điệp mới, để user thấy bot hấp dẫn và rõ giá trị hơn ngay từ lần đầu tương tác:

- “🎉 Chào bạn!”
- “Mình là AI Marketing Agent – trợ lý giúp bạn tạo nội dung, xây dựng và quản lý campaign, đồng thời theo dõi hiệu quả ngay trên Telegram.”
- “👉 Tối ưu quy trình marketing nhanh chóng, dễ sử dụng, phù hợp cho cả người mới bắt đầu.”
- “Bắt đầu thử ngay!”

## Những chỗ cần cập nhật

### 1) Card kết nối Telegram trong app
File: `src/components/agents/TelegramLinkCard.tsx`

Cập nhật phần copy ở trạng thái chưa kết nối:
- thay title ngắn hiện tại “Kết nối Telegram để chat AI Agent”
- thay đoạn mô tả “1 click → bấm Start...”
- thay dòng footer mô tả phía dưới card

Mục tiêu là biến card này thành phần giới thiệu rõ lợi ích, không chỉ là hướng dẫn kỹ thuật.

### 2) Tin nhắn onboarding khi user chat bot nhưng chưa link
File: `supabase/functions/telegram-webhook/index.ts`

Có 2 cụm copy đang dùng cho onboarding:
- nhánh default-bot rehydrate fail (đoạn “Chưa kết nối tài khoản Flowa với chat này...”)
- nhánh `/start` hoặc not-linked flow (đoạn “Chào mừng đến với Flowa Bot!...”)

Cần viết lại để:
- mở đầu bằng lời chào mới
- giới thiệu bot bằng đúng positioning “AI Marketing Agent”
- giữ hướng dẫn kết nối rõ ràng
- kết bằng CTA mạnh hơn kiểu “Bắt đầu thử ngay”

## Cách triển khai

### A. App card: ưu tiên copy marketing + vẫn giữ hành động rõ
Trong `TelegramLinkCard.tsx`:
- phần heading đổi sang lời giới thiệu thân thiện hơn
- phần body mô tả giá trị bot theo đúng copy user cung cấp
- CTA chính vẫn giữ nút hiện tại “Kết nối tài khoản & bắt đầu ngay” vì đã mạnh và phù hợp
- phần note cuối card đổi sang thông điệp action-oriented thay vì chỉ mô tả tính năng rời rạc

Định hướng hiển thị:
```text
🎉 Chào bạn!

Mình là AI Marketing Agent – trợ lý giúp bạn tạo nội dung, xây dựng và quản lý campaign, đồng thời theo dõi hiệu quả ngay trên Telegram.

👉 Tối ưu quy trình marketing nhanh chóng, dễ sử dụng, phù hợp cho cả người mới bắt đầu.
```

### B. Bot onboarding message: giữ cấu trúc Telegram-friendly
Trong `telegram-webhook/index.ts`:
- viết lại message not-linked thành 3 phần:
  1. Greeting + giới thiệu giá trị
  2. Hướng dẫn kết nối 2–3 bước
  3. CTA cuối “Bắt đầu thử ngay”

Vì Telegram hiển thị tốt với message ngắn, sẽ format lại để:
- dễ đọc trên mobile
- không quá dài
- vẫn giữ các bước thao tác cụ thể

Ví dụ cấu trúc:
```text
🎉 Chào bạn!

Mình là AI Marketing Agent – trợ lý giúp bạn tạo nội dung, xây dựng và quản lý campaign, đồng thời theo dõi hiệu quả ngay trên Telegram.

👉 Tối ưu quy trình marketing nhanh chóng, dễ sử dụng, phù hợp cho cả người mới bắt đầu.

🔗 Cách kết nối:
1. Mở app Flowa
2. Bấm “Kết nối tài khoản & bắt đầu ngay”
3. Quay lại Telegram và chat với bot

Bắt đầu thử ngay!
```

## Files sẽ sửa
- `src/components/agents/TelegramLinkCard.tsx`
- `supabase/functions/telegram-webhook/index.ts`

## Lưu ý triển khai
- Giữ nguyên logic hiện có, chỉ thay copy/UI text
- Không đổi flow deeplink, reconnect, binding
- Giữ tone “thân thiện nhưng hook”, đúng ngữ cảnh Telegram/mobile
- Nếu cùng một ý xuất hiện ở nhiều nơi, dùng wording đồng bộ để tránh mỗi chỗ nói một kiểu

## Kết quả sau khi làm xong
User sẽ thấy cùng một thông điệp giới thiệu ở cả:
- card kết nối trong app
- message bot khi chưa liên kết

Nhờ đó onboarding rõ hơn, mạnh hơn và nhất quán hơn, thay vì thiên về kỹ thuật như hiện tại.
