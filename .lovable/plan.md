

# Flow kết nối 2 bước kiểu Manus (Welcome → Confirm Link)

## Vấn đề hiện tại
Flow hiện tại: User bấm "Mở Telegram" trên web → Telegram mở bot với `?start=<token>` → user bấm **Start** → bot **link ngay lập tức** + gửi welcome đã connected.

→ Thiếu bước xác nhận, user không cảm nhận được "đang link cái gì". Manus làm 2 bước: Start → welcome + nút **🔗 Link Account** → bấm nút mới link thật.

## Flow mới (như screenshot Manus)

```text
[Web] User bấm "Mở Telegram"
   │
   ▼
[Telegram] User bấm "Start"
   │
   ▼
[Bot] 👋 Chào mừng đến với Flowa Bot!
      Để tiếp tục, bạn cần liên kết tài khoản Telegram với Flowa.
      Bấm nút bên dưới để bắt đầu. Link sẽ hết hạn sau 10 phút.
      
      [ 🔗 Link Account ]   ← inline button (callback_query)
   │
   ▼  user bấm nút
   │
[Bot] 🎉 Chào @user! Đã kết nối với Flowa.
      [welcome keyboard như cũ]
```

## Thay đổi cụ thể

### `supabase/functions/telegram-webhook/index.ts`

**1. `handleStart` (line 463-628)**: thay vì link ngay khi có token, **stash token vào DB** và gửi welcome + inline button.

```ts
// Sau khi verifyLinkToken thành công + check org collision:
// KHÔNG upsert binding ngay. Stash pending link.
await supabase.from("telegram_pending_links").upsert({
  telegram_chat_id: chatId,
  telegram_user_id: telegramUserId ?? null,
  telegram_username: telegramUsername ?? null,
  token,                        // signed token, sẽ verify lại khi confirm
  payload_uid: payload.uid,
  payload_org: payload.org,
  expires_at: new Date(Date.now() + 10*60_000).toISOString(),
}, { onConflict: "telegram_chat_id" });

await sendMessage(botConfig.botToken, chatId, [
  "👋 *Chào mừng đến với Flowa!*",
  "",
  "Để tiếp tục, bạn cần liên kết tài khoản Telegram với Flowa.",
  "",
  "Bấm nút bên dưới để xác nhận. Link này sẽ hết hạn sau 10 phút.",
].join("\n"), {
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [[
      { text: "🔗 Link Account", callback_data: `confirm_link:${chatId}` }
    ]],
  },
});
```

**2. Thêm callback handler `confirm_link`** (vào switch xử lý `callback_query` đã có):

```ts
if (cbData.startsWith("confirm_link:")) {
  // Lookup pending link by chat_id (+ optional telegram_user_id để chặn spoof)
  const { data: pending } = await supabase
    .from("telegram_pending_links")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  
  if (!pending) {
    await answerCallback(botConfig.botToken, cbId, 
      "❌ Link đã hết hạn. Quay lại app để lấy link mới.", true);
    return;
  }
  
  // Re-verify token (defense in depth — token có thể đã bị revoke phía web)
  try { await verifyLinkToken(pending.token); }
  catch { 
    await answerCallback(botConfig.botToken, cbId, "❌ Token không hợp lệ", true);
    return;
  }
  
  // Upsert binding (logic copy từ handleStart cũ)
  await supabase.from("telegram_chat_bindings").upsert({...});
  await supabase.from("telegram_pending_links").delete().eq("telegram_chat_id", chatId);
  
  // Edit message gốc để bỏ button + show success
  await editMessageText(botConfig.botToken, chatId, msgId,
    "✅ Đã kết nối thành công với Flowa!");
  
  // Gửi welcome keyboard riêng
  await sendMessage(botConfig.botToken, chatId, 
    `🎉 Chào ${pending.telegram_username ? "@"+pending.telegram_username : "bạn"}!...`,
    { reply_markup: { inline_keyboard: buildWelcomeKeyboard() } });
}
```

### Migration mới: `telegram_pending_links` table

```sql
CREATE TABLE public.telegram_pending_links (
  telegram_chat_id BIGINT PRIMARY KEY,
  telegram_user_id BIGINT,
  telegram_username TEXT,
  token TEXT NOT NULL,
  payload_uid UUID NOT NULL,
  payload_org UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.telegram_pending_links ENABLE ROW LEVEL SECURITY;
-- Service role only — user/anon không cần access
CREATE POLICY "service role only" ON public.telegram_pending_links
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_telegram_pending_links_expires ON public.telegram_pending_links(expires_at);
```

Optional: pg_cron job dọn rác mỗi giờ:
```sql
SELECT cron.schedule('cleanup-pending-telegram-links', '0 * * * *',
  $$DELETE FROM public.telegram_pending_links WHERE expires_at < now()$$);
```

### Helper mới: `editMessageText` trong telegram-client (nếu chưa có)
Check `_shared/telegram-client.ts` — nếu chưa có thì add wrapper gọi `/editMessageText`.

## File thay đổi

| File | Loại |
|---|---|
| `supabase/migrations/<ts>_telegram_pending_links.sql` | mới |
| `supabase/functions/telegram-webhook/index.ts` | sửa `handleStart` + thêm callback `confirm_link` |
| `supabase/functions/_shared/telegram-client.ts` | thêm `editMessageText` nếu chưa có |

Không động FE — UX phía web `/agents/telegram` giữ nguyên (đã có sẵn nút "Mở Telegram" + onboarding).

## Tại sao 2-step tốt hơn

- **UX rõ ràng**: user thấy bot welcome trước, biết "à đây là Flowa Bot", rồi mới chủ động bấm xác nhận → cảm giác kiểm soát
- **Anti-confusion**: Telegram auto-fire `/start <token>` ngay khi mở deeplink, user nhiều khi chưa kịp đọc đã connected. 2-step bắt user đọc.
- **Defense in depth**: nếu user mở deeplink nhầm chat (forward link cho người khác), người đó vẫn phải bấm xác nhận → vẫn có 1 lớp consent. Nếu muốn paranoid: stash thêm `telegram_user_id` ban đầu, callback chỉ accept nếu `cbq.from.id === pending.telegram_user_id`.

## Test E2E
1. Vào `/agents/telegram` chưa link → bấm "Mở Telegram"
2. Telegram mở bot → bấm Start → **chỉ thấy welcome + nút "🔗 Link Account"** (không tự link)
3. Bấm nút → message update thành "✅ Đã kết nối thành công" + tin nhắn welcome keyboard mới gửi xuống
4. Web FE realtime morph sang connected (như cũ)
5. Edge case: chờ > 10 phút rồi mới bấm nút → toast "Link đã hết hạn"
6. Edge case: bấm nút 2 lần → lần 2 báo "đã hết hạn" (vì đã delete pending) — acceptable
7. BYOB bot vẫn hoạt động: token org A vào bot org B → vẫn bị reject ở `handleStart` trước khi stash
8. Group chat: `/start` không có token vẫn show hướng dẫn cũ (không stash pending cho group)

## Ước tính
**25-35 phút** — 1 migration nhỏ, 1 callback handler mới, refactor `handleStart`. Không động FE.

## Rủi ro
- Token đã verify ở step 1 nhưng user delay > 10min → re-verify ở step 2 sẽ fail (signed JWT TTL = 600s). → tăng pending expire = TTL của signed token (10 phút) cho đồng bộ; hoặc dùng pending expire ngắn hơn.
- Nếu user mở deeplink mới khi đang có pending cũ → upsert overwrite pending bằng `onConflict telegram_chat_id` → behavior đúng (always lấy token mới nhất).

