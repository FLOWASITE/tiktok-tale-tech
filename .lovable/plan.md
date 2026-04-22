

# Sửa "2 user Telegram khác nhau cùng org không vào được cùng lúc"

## Tình trạng

Hiện DB có 1 binding duy nhất (User A — flowasite). User B trong cùng org Flowa không link được, hoặc link xong vẫn bị bot báo "Chưa kết nối".

## 3 root causes đã xác định trong code

### Cause #1 — Ghost cleanup quá rộng (KHÔNG scope `chat_type`)
`telegram-webhook/index.ts` line 2843-2856 trong `handleConfirmLinkCallback`:

```ts
.delete()
.eq("telegram_user_id", effectiveTgUserId)
.neq("user_id", pending.payload_uid);
```

Vấn đề: `effectiveTgUserId` ở đây fallback về `fromTgId` — Telegram user của người vừa bấm Link Account. Nếu User B bấm xác nhận từ chat của họ, query này xóa **mọi binding khác của Telegram-user B** trên toàn hệ thống, kể cả group bindings hay binding ở org khác. Hợp lý cho ý đồ "1 Telegram user ↔ 1 Flowa account", **nhưng**:

- Không scope `chat_type='private'` → có thể xóa nhầm group bindings của user khác.
- Không scope `organization_id` → nếu User A và User B trong cùng 1 group đã bind, có thể bị xóa ngược.

### Cause #2 — Default-bot collision check chặn nhầm user thứ 2 trong cùng org
Line 697-714 trong `handleStart`:

```ts
if (isDefaultBot && bindingChatType === "private") {
  const { data: collision } = await supabase
    .from("telegram_chat_bindings")
    .select("organization_id")
    .eq("telegram_chat_id", chatId)
    .eq("is_active", true)
    .maybeSingle();
  if (collision && collision.organization_id !== payload.org) { … reject … }
}
```

Logic này dùng `.maybeSingle()` → nếu User A và User B vô tình share Telegram chat (hiếm) hoặc query trả 2 row sẽ throw. Nhưng **vấn đề thật**: nó chỉ check khác org, **không có gì sai logic ở case 2 user khác Telegram cùng org** — nên đây chỉ là noise. **BỎ QUA cause #2** cho lần sửa này.

### Cause #3 — Stale cleanup ở line 2858-2869 thiếu scope `is_active`
```ts
.delete()
.eq("organization_id", pending.payload_org)
.eq("user_id", pending.payload_uid)
.eq("chat_type", "private")
.neq("telegram_chat_id", chatId)
```

Đây là cleanup khi User B reconnect → xóa các private binding cũ của chính User B. Đúng intent. Nhưng **không filter `is_active=true`** → nếu User B từng có binding inactive với chat_id khác, vẫn delete (hơi rộng, nhưng không gây lỗi cross-user). **Để nguyên**.

### Cause #4 (THỰC SỰ — nguyên nhân chính) — Default bot rehydrate prefer chỉ 1 binding theo `chat_id`

Line 257-280 ở `Deno.serve`:

```ts
const { data: chatBinding } = await supabase
  .from("telegram_chat_bindings")
  .select("organization_id, linked_at")
  .eq("telegram_chat_id", peekChatId)
  .eq("is_active", true)
  .order("linked_at", { ascending: false })
  .limit(1)
  .maybeSingle();
```

Logic này resolve theo `telegram_chat_id` — đúng cho User A và User B vì 2 chat_id khác nhau. **Không có vấn đề.**

→ Tóm lại: code đường happy-path cho 2 user cùng org **đáng lẽ phải work**. Vấn đề thực tế đến từ **Cause #1** — khi User B confirm link, ghost cleanup có thể xóa nhầm row đang được upsert race-condition, hoặc xóa group binding cũ của User A khiến UI User A báo "Chưa kết nối".

## Cách sửa

### Fix A — Siết ghost cleanup (`telegram-webhook` line 2843-2856)

Thêm 2 filter:
- `chat_type = 'private'` — chỉ ảnh hưởng private DM bindings
- (giữ nguyên `neq user_id`)

```ts
.delete()
.eq("telegram_user_id", effectiveTgUserId)
.eq("chat_type", "private")          // ← thêm
.neq("user_id", pending.payload_uid);
```

Lý do: ý đồ "1 Telegram user ↔ 1 Flowa account" chỉ cần áp dụng cho private DM (mỗi Telegram user chỉ chat DM với bot dưới danh nghĩa 1 Flowa user). Group bindings không có khái niệm "1 Telegram user ↔ 1 Flowa user" vì nhiều người trong group cùng chat. Group bindings phải được giữ nguyên.

### Fix B — Verify business rule có cho phép 2 user cùng org link không

`uq_tg_bindings_active_private_org_user` là UNIQUE `(organization_id, user_id)` WHERE private+active. Đúng cho phép 2 user khác nhau cùng org có 2 binding → **DB không chặn**.

`telegram_chat_bindings_organization_id_telegram_chat_id_key` là UNIQUE `(organization_id, telegram_chat_id)`. Cho phép 2 chat_id khác trong cùng org → **DB không chặn**.

→ DB layer OK. Chỉ cần fix application layer.

### Fix C — Test regression
Tạo `supabase/functions/telegram-webhook/__tests__/multi-user-same-org.test.ts`:

1. Setup: User A đã có private binding `(orgFlowa, userA, chatA, tgUserA)`.
2. User B `/start` → confirm link với `(orgFlowa, userB, chatB, tgUserB)`.
3. Assert sau confirm:
   - Binding của User A vẫn `is_active=true` (không bị xóa).
   - Binding mới của User B tồn tại với `is_active=true`.
   - DB có đúng 2 row private active trong org Flowa.
4. Edge case: User A có thêm group binding `(orgFlowa, NULL, chatGroup, tgUserA)`. Sau khi User B confirm, group binding vẫn còn.

### Fix D — Reset state hiện tại để verify thủ công
Sau khi deploy fix A:
1. User B mở `/agents/telegram` → bấm "Get started on Telegram".
2. Confirm trong bot.
3. Mở SQL dashboard → expect 2 rows private active trong org Flowa với 2 user_id và 2 chat_id khác nhau.
4. User A gõ `/help` từ chat của họ → bot trả lời cho User A.
5. User B gõ `/help` từ chat của họ → bot trả lời cho User B.

## Files sẽ sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/telegram-webhook/index.ts` | Thêm `.eq("chat_type", "private")` vào ghost cleanup line 2848-2852. |
| `supabase/functions/telegram-webhook/__tests__/multi-user-same-org.test.ts` | (Mới) 4 test case multi-user same-org parity. |

KHÔNG động:
- DB schema (đã đúng)
- `useTelegramBinding` (logic đúng — chỉ filter theo user.id hiện tại)
- `lookupUserBinding` (đã prefer private + scope đúng org)
- Rehydrate logic (đã resolve đúng theo chat_id)

## Rủi ro

- **Rất thấp**: chỉ thêm 1 filter để cleanup chính xác hơn, không thay đổi flow chính.
- Test regression covers cả group binding để đảm bảo không gây side-effect.

## QA sau implement

1. User A: mở chat với bot → gõ `/help` → bot trả `/help` cho User A.
2. User B: mở app → `/agents/telegram` → bấm "Get started on Telegram" → confirm trong bot của User B.
3. User B gõ `/help` → bot trả `/help` cho User B.
4. User A gõ `/status` → bot vẫn nhận diện đúng User A (binding của A không bị xóa).
5. Check DB: 2 row active private trong `telegram_chat_bindings` cho org Flowa với 2 user_id khác nhau.

