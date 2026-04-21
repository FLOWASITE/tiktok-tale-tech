

# Fix: Thêm chế độ "Tạo 1 bài đơn lẻ" cho Telegram bot

## Vấn đề

Hiện tại mọi yêu cầu "tạo content" qua chat tự nhiên đều rơi vào intent **`generate_campaign`** → tạo `agent_goals` với 6 bài (14 ngày × 3/tuần) → cần approve plan → tạo nhiều bài hàng loạt.

**Không có đường nào để tạo nhanh 1 bài lẻ cho 1 kênh** — đúng case bạn vừa hỏi: *"Tạo 1 content cho kênh Facebook"*.

## Giải pháp: thêm intent `generate_single` + `single_mode` trong extract

### 1. Mở rộng intent classifier (`telegram-intent.ts`)

Thêm intent mới **`generate_single`** vào enum + system prompt:

```ts
- "generate_single": user muốn TẠO NGAY 1 BÀI ĐƠN LẺ cho 1 kênh cụ thể (không phải campaign nhiều bài). 
  Dấu hiệu: "tạo 1 bài/post/content cho [kênh]", "viết 1 bài Facebook", "1 caption Instagram", "single post". 
  Trích "prompt" = mô tả bài, "channel" = tên kênh (lowercase). Nếu user không nói rõ kênh, để channel="".

- "generate_campaign": user muốn TẠO CHIẾN DỊCH nhiều bài theo lịch (campaign). 
  Dấu hiệu: "campaign", "chiến dịch", "X bài/tuần", "kế hoạch 2 tuần", "nhiều idea". 
  KHÔNG dùng intent này khi user nói rõ "1 bài"/"1 post".
```

Thêm field `channel?: string` vào `ClassifyResult` + tool schema.

### 2. Route intent mới trong `telegram-webhook` switch (line ~1423)

```ts
case "generate_single": {
  const prompt = result.prompt?.trim() || text;
  const channel = (result.channel || "").toLowerCase();
  await handleGenerateSingle({ supabase, botConfig, chatId, binding, prompt, channel });
  break;
}
```

### 3. Thêm handler mới `handleGenerateSingle`

Logic:
1. Validate channel — nếu thiếu/invalid → hỏi lại với inline keyboard 4 nút (Facebook / Instagram / Website / TikTok) callback `single:ch:<channel>:<promptHash>` (cache prompt vào `telegram_example_cache` để consistency với pattern hôm trước).
2. Nếu có channel hợp lệ → **bypass `agent_goals` + campaign plan** hoàn toàn. Gọi thẳng edge function `generate-multichannel` với:
   - `channels: [channel]` (1 phần tử)
   - `topic: prompt`
   - `brand_template_id: activeBrandGen.id`
   - `organization_id`, `user_id` từ binding
3. Trả về cho user message "🎯 Đang viết 1 bài cho **Facebook**…" → khi xong, format preview content (trích 200 chars đầu) + link mở Mini App `/multichannel/{id}` để xem full + approve/publish.
4. **Không tạo `agent_goals`, không cần approve plan, không tạo 6 bài.**

### 4. Mini "menu chọn kênh" khi user không nói rõ kênh

Trường hợp user chỉ nói "tạo 1 bài cho tôi" (không có kênh):

```
🤔 Bạn muốn đăng kênh nào?
[📘 Facebook] [📸 Instagram]
[🌐 Website]  [🎵 TikTok]
[➕ Kênh khác]
```

Callback `single:pick:<channel>` → resume với prompt đã cache trong `telegram_chat_state`.

### 5. Cập nhật `/help` + Quick Launchpad

Thêm 1 dòng mô tả vào `/help`:
> • **Tạo 1 bài**: "viết 1 bài Facebook về [chủ đề]"  
> • **Tạo campaign**: "campaign 2 tuần cho spa, 3 bài/tuần"

Trong Quick Launchpad (`STARTER_PROMPTS`), đổi 1 trong 4 starter thành "Viết 1 bài Facebook giới thiệu sản phẩm" để demo flow mới.

## Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/_shared/telegram-intent.ts` | Thêm intent `generate_single` + field `channel` vào schema + classification rules |
| `supabase/functions/telegram-webhook/index.ts` | Thêm `case "generate_single"` route, handler `handleGenerateSingle`, callback `single:ch:` + `single:pick:`, cập nhật `/help`, đổi 1 starter prompt |

**Không cần migration DB mới** — tận dụng `telegram_example_cache` đã có để cache prompt giữa các callback.

## Test E2E

1. **"Tạo 1 content cho kênh Facebook về spa"** → bot detect `generate_single` + channel=facebook → gọi thẳng `generate-multichannel` cho Facebook → trong ~30s trả 1 bài + link mini app. **Không có `agent_goals`, không có 6 bài**.
2. **"Viết 1 bài cho tôi"** (thiếu kênh) → bot hiện 4 nút chọn kênh → bấm Facebook → resume sinh 1 bài.
3. **"Campaign 2 tuần cho spa, 3 bài/tuần"** → vẫn rơi vào `generate_campaign` cũ → tạo goal + plan → approve flow như trước (không phá luồng cũ).
4. **"Tạo 5 bài Instagram"** (giáp ranh) → classifier sẽ chọn `generate_campaign` vì có "5 bài" (>1) → đúng kỳ vọng.

## Ước tính
**15-20 phút** — sửa 2 files, ~80 dòng (chính là handler mới + 1 case route + cập nhật prompt classifier).

## Rủi ro
Thấp. Intent mới hoàn toàn additive, không đụng `generate_campaign` flow cũ. Bypass `agent_goals` cho single post nghĩa là không tốn 1 slot quota goal — phù hợp với bản chất "tạo nhanh".

