
# Sửa luồng Telegram khi UI báo “Đã kết nối” nhưng bot vẫn nói “Chưa kết nối”

## Vấn đề đã xác định

Có 3 điểm đang tạo cảm giác “mở chat vẫn không được”:

1. `TelegramLinkCard` ở trạng thái đã kết nối chỉ mở `https://t.me/<bot>` bằng nút **Mở chat**.  
   Điều này **không tạo lại deeplink `/start` có token**, nên không thể tự sửa binding bị stale.

2. `telegram-webhook` khi confirm link private chat chỉ dọn “ghost binding” của **user khác**, nhưng **không dọn binding private cũ của chính cùng user trong cùng workspace**.  
   Kết quả: có thể tồn tại nhiều active binding cho cùng user/workspace theo các `chat_id` khác nhau.

3. `useTelegramBinding` đang `.maybeSingle()` trên active private binding của user trong org, tức là đang giả định luôn chỉ có 1 row. Khi dữ liệu bị stale/trùng, UI có thể vẫn xanh nhưng không phản ánh binding thực sự bot đang dùng.

## Cách sửa

### 1) Thêm luồng “Kết nối lại” rõ ràng trên UI
Mục tiêu: user không phải đoán rằng phải gỡ rồi kết nối lại.

**File: `src/components/agents/TelegramLinkCard.tsx`**
- Ở trạng thái `binding` tồn tại, thêm action rõ ràng:
  - `Mở chat`
  - `Kết nối lại`
  - `Gỡ kết nối`
- `Kết nối lại` sẽ là CTA recovery chính, không ẩn trong menu `...`.
- Thêm note nhỏ:
  - “Nếu bot báo chưa kết nối, bấm Kết nối lại để làm mới liên kết chat hiện tại.”

### 2) Thêm helper reset + deeplink mới trong hook
**File: `src/hooks/useTelegramBinding.ts`**
- Thay query personal binding từ `maybeSingle()` sang:
  - `select('*')`
  - filter active/private/current org/current user
  - order `linked_at desc`
  - chọn row mới nhất làm binding chính
- Nếu có >1 row active:
  - set cờ `hasBindingConflict`
  - ưu tiên row mới nhất
- Thêm helper mới, ví dụ:
  - `reconnectCurrentWorkspace()`
- Flow của helper:
  1. Xóa toàn bộ active private bindings của `currentOrganization.id + user.id`
  2. clear state local (`binding`, `prefetchedDeeplink`)
  3. tạo deeplink mới bằng `ensureDeeplink(true)`
  4. mở Telegram với deeplink mới

Như vậy user bấm một nút là ra đúng flow “gỡ + kết nối lại”.

### 3) Dọn stale private bindings ở backend khi confirm link
**File: `supabase/functions/telegram-webhook/index.ts`**

Trong nhánh confirm link private chat:
- Trước khi `upsert` binding mới, dọn các row active private cũ của:
  - cùng `organization_id = pending.payload_org`
  - cùng `user_id = pending.payload_uid`
  - `chat_type = 'private'`
  - khác `telegram_chat_id` hiện tại
- Giữ cleanup “ghost binding” hiện có cho trường hợp Telegram user đang gắn với account khác.
- Bổ sung log rõ ràng:
  - số row stale đã cleanup
  - org/user/chat hiện tại
  - resolved path (`chat_id`, `telegram_user_id`, `reconnect`)

Mục tiêu là mỗi user trong mỗi workspace chỉ còn **1 active private binding đúng chat hiện tại**.

### 4) Khóa invariant ở database để không tái diễn
**Database migration mới**
- Thêm partial unique index:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_tg_bindings_active_private_org_user
ON public.telegram_chat_bindings (organization_id, user_id)
WHERE chat_type = 'private' AND user_id IS NOT NULL AND is_active = true;
```

Tác dụng:
- ngăn cùng một user trong cùng workspace có nhiều active private binding
- khớp đúng business rule hiện tại của UI/hook

Lưu ý:
- không đụng group bindings (`user_id IS NULL`)
- không đổi RLS hiện có

## Test cần thêm

### Backend
Tạo test regression cho `telegram-webhook` hoặc extract helper để test riêng:
1. Có binding private cũ cùng org+user → confirm link mới phải xóa row cũ
2. Có ghost binding user khác cùng `telegram_user_id` → vẫn cleanup đúng
3. Sau reconnect chỉ còn 1 active private binding cho org+user

### Frontend
Test cho `TelegramLinkCard`:
1. Khi đang connected phải hiện nút `Kết nối lại`
2. Khi `hasBindingConflict=true` phải hiện warning recovery
3. Bấm `Kết nối lại` gọi đúng helper recovery flow

## Kết quả sau khi làm xong

User có 2 cách rõ ràng:
- `Mở chat` để vào bot
- `Kết nối lại` để refresh binding nếu bot báo “Chưa kết nối”

Đồng thời hệ thống backend + DB sẽ đảm bảo:
- không còn nhiều active private bindings cho cùng user/workspace
- UI xanh sẽ phản ánh đúng binding hiện hành
- reconnect sẽ thực sự sửa lỗi, không chỉ mở bot như hiện tại

## Files sẽ sửa

- `src/hooks/useTelegramBinding.ts`
- `src/components/agents/TelegramLinkCard.tsx`
- `supabase/functions/telegram-webhook/index.ts`
- `supabase/functions/telegram-webhook/__tests__/*` hoặc helper test tương ứng
- `supabase/migrations/<new_migration>.sql`

## Rủi ro
Thấp đến trung bình:
- Thay đổi an toàn vì chỉ siết invariant cho private binding
- Cần test kỹ case multi-org + default bot để không làm hỏng flow “switch workspace”

## QA sau implement
1. Tạo trạng thái stale binding
2. Vào `/agents/telegram`
3. Bấm `Kết nối lại`
4. Telegram mở deeplink `/start` mới
5. Confirm/start xong:
   - bot trả lời bình thường
   - DB chỉ còn 1 active private binding cho user trong workspace
   - UI vẫn hiện đúng “Đã kết nối”
