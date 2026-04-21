

# Fix: Telegram bot vẫn dùng brand của tài khoản cũ sau khi đổi tài khoản web

## Nguyên nhân (đã xác định qua DB)

Trong `telegram_chat_bindings` hiện có 2 binding tách biệt:

| telegram_chat_id | telegram_user_id | linked → user | Org | Brand |
|---|---|---|---|---|
| 8709703794 | 8709703794 | `duy@gmail.com` | TAF | (chưa set) |
| 8002956073 | 8002956073 | `flowasite@gmail.com` | Flowa | Flowa Agentic |

→ `telegram_user_id` của bạn trên Telegram là **8709703794** (chính là Telegram account `duy`). Khi bạn nhắn bot, bot tra `chat_id = 8709703794` → ra binding cũ của `duy@gmail.com` → load brand TAF, **bất kể bạn đăng nhập web bằng tài khoản nào**.

Điều này đúng theo logic — Telegram bot không biết về session web. Nhưng UX hiện tại cho phép tình trạng "ghost binding" tồn tại mà user không thấy được.

## 2 vấn đề cần sửa

### Vấn đề A: Không có ràng buộc 1 Telegram user → 1 account
DB hiện cho phép cùng `telegram_user_id` link đến nhiều `(organization_id, user_id)` khác nhau → Telegram chat của bạn có thể "thuộc về" 2 account web cùng lúc (bot chọn 1 cách deterministic theo chat_id, không phải theo session web).

### Vấn đề B: UI Telegram không thấy "binding xung đột"
Trang `/agents/telegram` chỉ query binding theo `currentOrganization.id` → khi login `flowasite@gmail.com` view org Flowa, bạn chỉ thấy binding chat `8002956073` (✅ Đã kết nối), **không thấy** chat `8709703794` đang link sang account khác.

## Giải pháp

### 1. Tự re-link khi `/start` từ chat đã có binding khác

**File:** `supabase/functions/telegram-webhook/index.ts` — trong `handleConfirmLink` (line ~1940-2000)

Trước khi `upsert` binding mới, **delete mọi binding cũ có cùng `telegram_user_id` ở các org/user khác**:

```ts
// Bước trước upsert: gỡ "ghost bindings" của cùng Telegram user ở account khác
await supabase
  .from("telegram_chat_bindings")
  .delete()
  .eq("telegram_user_id", telegramUserId)
  .neq("user_id", pending.user_id);  // giữ binding cùng user (nếu có)
```

→ Lần sau bạn `/start` deeplink từ tab `flowasite@gmail.com`, binding cũ trỏ về `duy@gmail.com` tự bị gỡ → bot từ giờ trở thành "thuộc về" `flowasite@gmail.com`.

### 2. Hiện cảnh báo "ghost binding" trên trang /agents/telegram

**File mới truy vấn:** `src/hooks/useTelegramBinding.ts` — thêm query phụ tìm binding của cùng `telegram_user_id` thuộc org khác.

**File mới UI:** thêm 1 banner cảnh báo trong `TelegramLinkCard.tsx`:

> ⚠️ Telegram của bạn (@{username}) đang được liên kết với 1 tài khoản/workspace khác (`{org_name}`). Bot sẽ trả lời theo workspace đó. Bấm "Chuyển sang workspace này" để re-link.

Nút **"Chuyển sang workspace này"** → gọi edge function `telegram-link-token` (đã có) → user `/start` lại → handler ở bước 1 tự dọn binding cũ.

→ User hiểu ngay vấn đề và self-fix trong 10 giây.

### 3. Nút "Đăng xuất Telegram" (logout chủ động)

Thêm vào `TelegramLinkCard.tsx` (khi đã link) nút phụ **"Gỡ kết nối khỏi tất cả workspace"** → gọi RPC mới hoặc xóa trực tiếp tất cả binding theo `telegram_user_id`. Hữu ích khi user muốn dứt khoát reset.

## Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/telegram-webhook/index.ts` | Trong `handleConfirmLink`, delete ghost bindings cùng `telegram_user_id` trước khi upsert |
| `src/hooks/useTelegramBinding.ts` | Thêm query tìm `ghostBinding` (cùng telegram_user_id, khác org/user) + return về |
| `src/components/agents/TelegramLinkCard.tsx` | Thêm banner cảnh báo + nút "Chuyển sang workspace này" + nút "Gỡ tất cả" |

**Không cần migration mới** — RLS hiện tại cho phép user xóa binding theo `auth.uid() = user_id` của chính họ, đủ cho flow này.

## Test E2E

1. Đăng nhập `flowasite@gmail.com` → vào `/agents/telegram` → thấy binding "✅ Đã kết nối" (chat 8002956073) **+ banner cảnh báo** vì Telegram user 8709703794 đang link sang TAF/duy.
2. Bấm "Chuyển sang workspace này" → mở deeplink → `/start` → backend tự xóa binding TAF/duy → upsert binding mới flowasite@gmail.com/Flowa cho chat 8709703794.
3. Trong Telegram chat lại với bot → bot dùng brand "Flowa Agentic" (không còn TAF).
4. Đăng nhập `duy@gmail.com` lại → thấy binding TAF đã mất (đã bị gỡ ở bước 2) → muốn link lại thì bấm "Mở Telegram" như bình thường.

## Ước tính
**10-15 phút** — sửa 1 edge function + 1 hook + 1 component.

## Rủi ro
Thấp. Logic delete trước khi upsert là idempotent. Banner UI chỉ hiển thị khi phát hiện xung đột, không ảnh hưởng flow chính.

