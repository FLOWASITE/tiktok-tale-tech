
# Có, làm được: 2 user trong cùng 1 tổ chức có thể dùng Telegram song song

## Mục tiêu
Đảm bảo mỗi user trong cùng workspace có **private binding riêng** với bot, để cả 2 người có thể:
- chat DM với bot cùng lúc
- bot nhận diện đúng từng user
- không ai bị “đá” binding của người kia khi reconnect hoặc confirm link

## Tình trạng hiện tại trong code
Qua code hiện có, nền tảng này **đã gần đúng**:
- `telegram-webhook` đã rehydrate theo `chat_id`, rồi fallback `telegram_user_id + chat_type='private'`
- `lookupUserBinding()` đã ưu tiên private binding đúng org
- `useTelegramBinding()` đã đọc binding theo `organization_id + user_id + chat_type='private'`
- Ghost cleanup trong `handleConfirmLinkCallback` hiện đã có `chat_type='private'`, tức là **không còn xóa lan sang group binding**

Điều đó nghĩa là về nguyên tắc, **2 user khác Telegram trong cùng org phải cùng dùng được**.

## Vấn đề còn phải xử lý dứt điểm
Khả năng cao lỗi còn lại nằm ở dữ liệu/runtime hơn là business rule:
1. Có binding cũ/stale của một trong hai user
2. Một user đang chat ở `chat_id` khác với row binding hiện hành
3. Có race khi confirm/reconnect khiến row mới chưa trở thành binding mà bot đang rehydrate tới
4. Có query `.maybeSingle()` ở nhánh phụ nào đó vẫn giả định chỉ có 1 row trong tình huống thực tế

## Cách xử lý dứt điểm

### 1) Khóa invariant rõ ràng cho mô hình multi-user same-org
Giữ rule chuẩn:
- 1 Telegram user chỉ map tới 1 Flowa account ở DM
- nhưng 1 organization có thể có **nhiều private bindings**, miễn là khác `user_id` và khác `telegram_chat_id`

Kiểm tra lại các unique/index và các nhánh upsert để bảo đảm:
- không có logic app-level nào vô tình cưỡng ép “1 org chỉ có 1 user Telegram”
- không có cleanup nào xóa binding của user khác cùng org

### 2) Audit toàn bộ luồng confirm/reconnect theo “per-user private binding”
Rà kỹ trong `supabase/functions/telegram-webhook/index.ts`:
- `handleStart`
- `handleConfirmLinkCallback`
- `lookupUserBinding`
- default-bot rehydrate đầu `Deno.serve`

Mục tiêu:
- mọi lookup DM phải dựa trên `chat_id` hoặc `telegram_user_id + organization_id + chat_type='private'`
- mọi cleanup chỉ được phép động vào:
  - chính Telegram user đang relink
  - hoặc chính `(organization_id, user_id)` đang reconnect
- tuyệt đối không ảnh hưởng active private binding của user khác cùng org

### 3) Thêm regression test thật cho case 2 user cùng org
Bộ test cần cover đúng case user đang gặp:

#### Case A
- User A đã linked DM vào org Flowa
- User B linked DM vào cùng org Flowa
- Kết quả:
  - A còn active
  - B active
  - bot trả lời được cho cả A và B

#### Case B
- User B reconnect từ chat mới
- Kết quả:
  - chỉ row cũ của B bị dọn
  - A không bị ảnh hưởng

#### Case C
- Có group binding trong org
- User B confirm lại
- Kết quả:
  - group binding vẫn còn
  - private bindings của A/B vẫn đúng

#### Case D
- Non-`/start` message sau khi link
- Rehydrate phải resolve đúng org theo `chat_id`
- Không fallback sai sang user khác

### 4) Tăng log chẩn đoán để bắt đúng lỗi thực tế
Thêm log rõ cho các điểm:
- trước và sau ghost cleanup
- trước và sau stale cleanup
- rehydrate resolved by `chat_id` hay `telegram_user_id`
- `organization_id`, `user_id`, `telegram_user_id`, `telegram_chat_id`, `chat_type`

Mục tiêu: nếu vẫn lỗi, nhìn log sẽ biết ngay:
- user bị miss vì chat_id khác
- hay row bị cleanup
- hay query trả sai binding

### 5) Thêm recovery UX rõ hơn cho user thứ 2
UI hiện đã có hướng reconnect. Cần đảm bảo flow recovery này đủ rõ:
- nếu bot báo “Chưa kết nối” nhưng UI xanh:
  - user bấm `Kết nối lại`
  - hệ thống tạo deeplink `/start` mới
  - chỉ refresh binding của chính user hiện tại
  - không đụng người còn lại trong cùng org

## Files cần rà/sửa
- `supabase/functions/telegram-webhook/index.ts`
- `supabase/functions/telegram-webhook/__tests__/multi-user-same-org.test.ts`
- `src/hooks/useTelegramBinding.ts` (chỉ nếu phát hiện conflict/reconnect flow còn rộng quá)
- `src/components/agents/TelegramLinkCard.tsx` (chỉ nếu cần làm rõ recovery UX)

## Kết quả mong muốn sau khi xong
Trong cùng một tổ chức:
- User A có thể chat Telegram với bot
- User B có thể chat Telegram với bot cùng lúc
- reconnect của B không làm A mất kết nối
- bot luôn nhận diện đúng người theo DM binding riêng

## QA sau implement
1. User A link thành công, gửi `/help`
2. User B link thành công trong cùng org, gửi `/help`
3. Xác nhận cả A và B đều được bot trả lời
4. User B reconnect từ chat mới
5. A vẫn chat bình thường
6. Kiểm tra DB:
   - có 2 row `private + active` trong cùng org
   - mỗi row có `user_id`, `telegram_chat_id`, `telegram_user_id` riêng
