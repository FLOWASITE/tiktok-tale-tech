

# Tại sao vẫn chưa duyệt được — chẩn đoán cuối cùng

## Kết luận sau khi kiểm tra trực tiếp

Tôi vừa fetch HTML của `https://app.flowa.one/telegram-app` và phát hiện bundle **published vẫn là bundle CŨ**, bằng chứng:

- Trang hiện text hint:
  ```text
  Nếu bạn chưa link tài khoản: gõ /start trong DM với bot trước.
  ```
- Text này **không còn tồn tại** trong source hiện tại (`src/pages/TelegramApp.tsx`). Source mới đã đổi sang các hint khác nhau theo `errorCode` (`not_linked`, `ambiguous_org`, `no_init_data`, `token_hash and type`, …).

## Vì sao điều này gây ra lỗi

- Tất cả các fix vừa rồi (verifyMagicLinkTokenHash trực tiếp, bỏ `email` khỏi backend, cache-busting `v=tg-auth-v2`) đều đã có trong source code.
- Backend (`telegram-webapp-auth`, `telegram-webhook`, `telegram-bot-admin`) đã auto-deploy khi push (Lovable Cloud tự động).
- Nhưng **frontend không tự deploy** — phải bấm nút **Update** trong Publish dialog để bundle mới được đẩy lên `app.flowa.one`.
- Telegram WebView mở `app.flowa.one` → vẫn nhận bundle cũ → vẫn gọi `verifyOtp` kèm `email` → vẫn lỗi `400 Only the token_hash and type should be provided`.

## Bằng chứng phụ từ logs

- `auth_logs` không còn entry `/verify` 4xx mới nào trong khoảng gần đây — đúng kỳ vọng vì backend đã ngừng trả `email`, nhưng frontend cũ vẫn gửi field `email: undefined` nên Supabase reject.
- `telegram-webapp-auth` edge function log gần nhất: `200 OK` trong ~10s (cold start). Backend phía server hoạt động đúng.
- `telegram_chat_bindings` có 1 row active cho org `bccfec38-2d27-…` → bot binding OK.

## Hành động cần làm — 1 bước duy nhất

### Bấm Update trong Publish dialog

1. Mở Publish dialog (góc trên phải editor).
2. Bấm **Update** để đẩy bundle frontend mới nhất lên `app.flowa.one`.
3. Sau khi update xong, trong Telegram:
   - **Đóng hẳn Mini App** (vuốt xuống để close, không chỉ thu nhỏ).
   - Bấm lại nút "Xem & duyệt" mới (đã có `?v=tg-auth-v2`) — cache buster sẽ buộc Telegram WebView load HTML mới.
4. Mini App sẽ chạy bundle mới: gọi `verifyMagicLinkTokenHash` (direct fetch, chỉ gửi `type + token_hash`) → đăng nhập thành công → vào tab Duyệt.

## Verify sau khi update

- Mở `https://app.flowa.one/telegram-app` ngoài Telegram → text hint phải đổi thành câu mới (nói về việc mở từ trong bot).
- Mini App trong Telegram: không còn card "Không xác thực được", vào thẳng tab Duyệt.
- Auth logs: `/verify` mới sẽ trả `200`, không còn `400`.

## Nếu sau khi Update vẫn lỗi

Khi đó vấn đề thực sự nằm ở runtime — gửi lại screenshot, tôi sẽ debug tiếp dựa trên bundle MỚI. Hiện tại không thể fix thêm gì ở code vì code đã đúng; điểm nghẽn là deployment.

## Rủi ro

Không có. Đây chỉ là bước publish frontend — backend đã sẵn sàng từ trước.

<lov-actions>
<lov-link url="https://docs.lovable.dev/features/deploy">Hướng dẫn Publish</lov-link>
</lov-actions>

