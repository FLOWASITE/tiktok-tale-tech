

# Hoàn thiện 4 button "Thử ngay" trong welcome message Telegram

## Hiện trạng

Sau khi `/start` thành công, bot gửi 4 button đề xuất:

| Button | Callback | Tình trạng |
|---|---|---|
| 🚀 Tạo campaign đầu | `ux:welcome:generate` | ⚠️ Chỉ trả text "Gõ `/generate <mô tả>`" — không actionable, người mới bí |
| 📊 Brand hiện tại | `ux:welcome:brand` | ✅ Mở brand switcher OK |
| 💡 Xem ví dụ thực tế | `ux:welcome:examples` | ✅ List 7 ví dụ + nút "Thử" để chạy ngay |
| 📚 Hướng dẫn 30s | `ux:welcome:tutorial` | ✅ 3-step interactive + Mini App |

→ **3/4 đã tốt, chỉ cần fix nút "🚀 Tạo campaign đầu"** để biến nó thành launchpad đầy đủ thay vì câu chỉ dẫn cụt.

## Giải pháp

### 1. Nâng cấp `ux:welcome:generate` thành "Quick Launchpad"

Thay vì gửi text khô, **gợi ý 4 prompt khởi đầu phổ biến** (mỗi prompt là 1 nút bấm-là-chạy luôn) + 1 nút "Xem thêm ví dụ" + 1 nút "Brand đang dùng".

**File:** `supabase/functions/telegram-webhook/index.ts` — block `case "generate":` (line 2351-2355)

Thay handler hiện tại bằng:

```ts
case "generate": {
  // 4 prompt phổ biến — pre-populate exampleCache để tái dùng cơ chế ux:ex:<idx>
  const starterPrompts = [
    { emoji: "🎁", title: "Campaign khuyến mãi cuối tháng", prompt: "Tạo campaign khuyến mãi cuối tháng cho thương hiệu của tôi, target khách hàng nữ 25-40" },
    { emoji: "📱", title: "3 caption Facebook bán hàng", prompt: "Viết 3 caption Facebook bán hàng cho sản phẩm chủ lực, tone thân thiện vui vẻ" },
    { emoji: "🎬", title: "5 idea content TikTok", prompt: "Cho 5 idea content TikTok cho thương hiệu, format storytime ngắn 30-60s" },
    { emoji: "✉️", title: "Email ra mắt sản phẩm mới", prompt: "Viết email sequence 3 email ra mắt sản phẩm mới cho khách hàng cũ" },
  ];
  exampleCache.set(chatId, starterPrompts.map(p => p.prompt));

  const lines = [
    "✍️ *Tạo campaign đầu tiên*",
    "",
    "Bấm 1 mẫu dưới để chạy ngay, hoặc chat tự nhiên ý tưởng của bạn:",
    "",
    "_VD: \"tạo campaign Tết cho spa làm đẹp giảm 30%\"_",
  ];
  const keyboard = [
    ...starterPrompts.map((p, idx) => [
      { text: `${p.emoji} ${p.title}`, callback_data: `ux:ex:${idx}` },
    ]),
    [
      { text: "💡 Xem thêm ví dụ", callback_data: "ux:welcome:examples" },
      { text: "📊 Brand đang dùng", callback_data: "ux:welcome:brand" },
    ],
  ];

  await sendMessage(botConfig.botToken, chatId, lines.join("\n"), {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard },
  });
  return;
}
```

**Tận dụng cơ chế sẵn có:**
- Reuse `exampleCache` + handler `ux:ex:<idx>` → bấm là `handleGenerate()` chạy luôn (không cần code mới)
- Reuse 2 callback `ux:welcome:examples` và `ux:welcome:brand` → cross-link giữa các flow

### 2. (Tùy chọn — recommended) Thêm "back to menu" cho `examples` và `tutorial:done`

Sau khi user xong tutorial hoặc xem examples, thêm 1 dòng nút quay lại 4 nút welcome ban đầu để loop UX khép kín. Cần thêm callback mới `ux:welcome:menu` trả về 4 nút gốc.

→ **Skip phần này nếu muốn tối giản** — flow chính đã hoạt động.

## File thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/telegram-webhook/index.ts` | Thay block `case "generate":` (~5 dòng) bằng quick launchpad (~30 dòng) |

## Test E2E

1. `/start` bot → bấm "🚀 Tạo campaign đầu" → thấy 4 prompt mẫu + 2 cross-link (ví dụ/brand)
2. Bấm 1 prompt → bot reply "🚀 Đang chạy: ..." → `handleGenerate` chạy đúng pipeline (đã có sẵn)
3. Bấm "💡 Xem thêm ví dụ" → mở handler `examples` (7 prompt từ DB)
4. Bấm "📊 Brand đang dùng" → mở brand switcher
5. 3 button còn lại (`brand`, `examples`, `tutorial`) — không đụng, vẫn hoạt động như cũ

## Ước tính
**5 phút** — sửa 1 file, ~30 dòng, không cần migration / DB / shared module.

## Rủi ro
Không. Tận dụng `exampleCache` + callback router `ux:ex:*` đã chạy ổn định. Không đổi schema, không đụng `_shared/`.

