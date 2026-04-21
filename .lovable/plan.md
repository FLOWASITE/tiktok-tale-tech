

# Fix: Nút "Link Account" trên default bot không hoạt động

## Nguyên nhân (đã xác định)

Tại `telegram-webhook/index.ts` line 188-225, khi bot là **default bot** (`organizationId === null`), webhook cố rehydrate `organizationId` bằng cách lookup `telegram_chat_bindings` theo `chat_id`.

Vấn đề: Khi user mới `/start` lần đầu và bấm "Link Account", **chưa hề có binding nào** → lookup trả null → webhook return sớm (line 221 `return okResponse()`) → **callback `confirm_link:*` không bao giờ tới được handler**.

Đây là lý do user bấm "Link Account" và không có gì xảy ra (bot không phản hồi, không có toast, không có edit message).

Logic hiện chỉ xử lý fallback cho `update.message` private chat (line 214: gửi onboarding text), nhưng **không xử lý callback_query** → silent drop.

## Giải pháp

### File: `supabase/functions/telegram-webhook/index.ts`

Trước khi rehydrate qua `telegram_chat_bindings`, **ưu tiên rehydrate từ `telegram_pending_links`** nếu update là `callback_query` với data bắt đầu bằng `confirm_link:`. Bảng pending đã có `payload_org` từ lúc /start.

Pseudo-code chèn vào block `if (botConfig.organizationId === null)`:

```ts
// NEW: callback confirm_link cần rehydrate từ pending_links (chưa có binding)
const cbData = update.callback_query?.data || "";
const cbChatId = update.callback_query?.message?.chat?.id;
if (cbData.startsWith("confirm_link:") && cbChatId) {
  const { data: pending } = await supabase
    .from("telegram_pending_links")
    .select("payload_org")
    .eq("telegram_chat_id", cbChatId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (pending?.payload_org) {
    botConfig.organizationId = pending.payload_org;
    // skip phần rehydrate qua bindings bên dưới
  }
}
```

Đặt **trước** đoạn `if (!isStartCmd) { ... }` hiện tại (line 195). Nếu pending hit, set `organizationId` rồi skip nhánh binding-lookup.

## Thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/telegram-webhook/index.ts` | Thêm ~12 dòng rehydrate từ `telegram_pending_links` trước nhánh binding-lookup hiện có |

## Test E2E
1. Tài khoản mới chưa link → vào `/agents/telegram` → bấm "Mở Telegram" → bấm Start trong bot → bấm "Link Account" → bot phản hồi "✅ Đã kết nối!" + edit message
2. UI Flowa morph sang trạng thái "Đã kết nối" trong < 3s nhờ realtime
3. Đã link → các callback khác (cw:edit, brand:switch...) vẫn chạy đúng vì binding hiện hữu nên rehydrate qua nhánh cũ

## Ước tính
**3-5 phút** — sửa 1 file, ~12 dòng.

## Rủi ro
Không. Chỉ thêm nhánh fallback cho 1 trường hợp duy nhất (callback `confirm_link` trên default bot khi chưa có binding). Logic hiện tại của các callback khác và bot BYOB không bị ảnh hưởng.

