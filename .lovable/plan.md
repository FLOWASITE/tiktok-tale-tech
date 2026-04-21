

# Fix: `/start` lần 2 hiện onboarding mơ hồ + instruction sai UI

## Nguyên nhân (đã xác định qua log + DB)

User `/start` lần 2 trong chat đã link → đúng ra phải hiện "👋 Chào @user! Tài khoản đã kết nối" (line 516-525 đã có sẵn).

Nhưng trong screenshot, chat `8709703794` **CHƯA hề có binding trong DB** (`telegram_chat_bindings` không có row nào cho chat này), nên rơi xuống nhánh onboarding (line 528) là **đúng logic**.

→ Lỗi không phải ở routing, mà là **UX onboarding message hiện tại sai/lạc hậu**:
- Hướng dẫn "*Bấm Tạo link kết nối*" — UI thực tế ở `/agents/telegram` không có nút tên này; nút thật là **"Mở Telegram"** (deeplink mang sẵn token).
- Không có CTA inline → user phải copy link, mở browser, đăng nhập, navigate 3 cấp menu mới link được.

## Giải pháp

Sửa `handleStart` (line 527-543) — **chỉ thay text + thêm 1 inline button** dẫn thẳng đến trang link.

```ts
await sendMessage(
  botConfig.botToken,
  chatId,
  [
    "👋 *Chào mừng đến với Flowa Bot!*",
    "",
    "Tài khoản Telegram này chưa được kết nối với Flowa.",
    "",
    "🔗 *Cách kết nối (30 giây):*",
    "1. Bấm nút bên dưới để mở app Flowa",
    "2. Đăng nhập (nếu chưa)",
    "3. Bấm *Mở Telegram* — bot tự động link",
    "",
    "_Sau khi link xong, quay lại đây và chat tự nhiên._",
  ].join("\n"),
  {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔗 Mở Flowa để kết nối", url: "https://app.flowa.one/agents/telegram" }],
        [{ text: "❓ Hướng dẫn chi tiết", url: "https://help.flowa.one/telegram" }],
      ],
    },
  },
);
```

**Lý do chọn giải pháp này thay vì fix routing:**
- Behavior hiện tại của handler đã đúng (có check binding, có welcome-back). Chỉ message khi **chưa link** là vấn đề.
- Inline button URL → 1 cú bấm là tới đúng trang, không lạc.
- Khớp với UI thực tế của `/agents/telegram` (nút "Mở Telegram" deeplink).

## Thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/telegram-webhook/index.ts` | Sửa block onboarding (line 528-542): viết lại text + thêm 2 inline URL button |

## Test E2E
1. User mới `/start` (chưa link, không token) → thấy message mới + 2 button "🔗 Mở Flowa để kết nối" và "❓ Hướng dẫn chi tiết"
2. Bấm button → mở `/agents/telegram` → bấm "Mở Telegram" → quay lại bot tự động link → confirm
3. Chat đã link `/start` → vẫn thấy welcome-back "👋 Chào @user!" như cũ (không đụng)
4. `/start <token>` flow 2-step (Link Account button) — không đụng, vẫn chạy

## Ước tính
**3 phút** — sửa 1 file, ~15 dòng.

## Rủi ro
Không. Chỉ thay text + reply_markup; không động routing/DB.

