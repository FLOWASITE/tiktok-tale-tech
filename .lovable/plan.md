

# Nâng cấp `/brand` — One-tap brand switching

## 🎯 Vấn đề hiện tại
- Lệnh `/brand` chỉ liệt kê text + bắt user gõ `/brand <tên>` để đổi → khó dùng trên mobile
- Không có visual feedback (logo, màu, industry) như header switcher trên web
- Không hỗ trợ **search** khi org có nhiều brand (>10)
- Không hiển thị brand đang active rõ ràng trong các reply khác (free-chat, /generate)

## ✨ Nâng cấp

### 1. `/brand` → Inline keyboard switcher
Thay vì list text, gửi message với **inline buttons**:
```
🎨 Brand đang dùng: ✨ Spa Hồng Ngọc

Chọn brand khác:
[🟣 Spa Hồng Ngọc ✓]  [🔵 Beauty Pro]
[🟢 Aesthetic Lab]    [🟡 Glow Center]
[🔴 Skin Studio]      [⚫ Premium Med]
                      
[🔍 Tìm brand...]  [➕ Tạo brand mới]
```
- Mỗi button = 1 brand, callback `brand:switch:<id>`
- Hiển thị emoji circle theo `primary_color` (map hex → 🔴🟠🟡🟢🔵🟣⚫⚪)
- Brand active có dấu `✓`
- Default brand có 👑
- Limit 8 brands/page; nếu >8 → thêm nút `[« Trước]` `[Sau »]` paginate

### 2. Callback handler `brand:switch:<id>`
- Update `telegram_chat_bindings.active_brand_template_id`
- `answerCallbackQuery` toast "✅ Đã đổi sang [tên brand]"
- `editMessageReplyMarkup` re-render keyboard với check mark mới (không cần gửi message mới)
- Optionally show 1 contextual hint: "💡 Thử ngay: [✍️ Tạo content] [📊 Xem campaign]"

### 3. Search mode khi >8 brand
- Click `[🔍 Tìm brand...]` → bot reply: "Gõ tên brand để tìm:"
- Dùng `force_reply: { selective: true }` để Telegram auto-focus reply
- Next message từ user → fuzzy match → trả lại keyboard filtered

### 4. Persistent brand badge trong replies khác
Sau mỗi `/generate`, `/status`, free-chat reply, append footer nhỏ:
```
─────────
🎨 Brand: Spa Hồng Ngọc · [Đổi]
```
- Button `[Đổi]` callback `brand:open` → mở keyboard switcher
- Helper `appendBrandFooter(text, brandName)` reusable

### 5. Smart auto-suggest khi free-chat detect brand mismatch
Reuse intent classifier — nếu user gõ "tạo bài cho **Beauty Pro**" nhưng active brand đang là "Spa Hồng Ngọc":
- Bot detect brand name trong prompt (fuzzy match `brand_templates.brand_name`)
- Reply: "🤔 Bạn nhắc tới *Beauty Pro* nhưng đang dùng brand *Spa Hồng Ngọc*. Đổi không?"
- 2 buttons: `[✅ Đổi sang Beauty Pro]` / `[❌ Giữ Spa Hồng Ngọc]`

### 6. Mini App hook (optional)
Trong inline keyboard `/brand`, thêm row cuối:
```
[🚀 Quản lý brand đầy đủ] (web_app: /telegram-app/brands)
```
Mở Mini App tab Brand → user xem chi tiết, edit voice, products, personas mà không leave Telegram.

## 📦 Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/telegram-webhook/index.ts` | Refactor `handleBrand` → inline keyboard; add callbacks `brand:switch:<id>`, `brand:open`, `brand:page:<n>`, `brand:search`; brand-mismatch detector trong free-chat handler |
| `supabase/functions/_shared/telegram-client.ts` | Helper mới: `buildBrandSwitcherKeyboard(brands, activeId, page)`, `colorToEmoji(hex)`, `appendBrandFooter(text, brandName)` |
| `src/pages/TelegramApp.tsx` | Thêm tab/route `/telegram-app/brands` (list + switch) — reuse `useCurrentBrand` |

## 🧪 Test
1. `/brand` → thấy inline keyboard với màu emoji + check mark đúng brand active
2. Click brand khác → toast confirm + keyboard update check mark **không gửi message mới**
3. Org có 12 brands → thấy nút Trước/Sau, pagination chạy đúng
4. Click `[🔍 Tìm brand...]` → bot prompt → gõ "spa" → keyboard filtered
5. Sau `/status` → thấy footer "🎨 Brand: X · [Đổi]" → click → mở switcher
6. Free-chat: "tạo bài cho Beauty Pro" khi đang ở brand khác → thấy suggest đổi
7. Mini App `/telegram-app/brands` → list brand, tap → switch + sync với DB

## ⏱ Ước tính
- Inline switcher + callbacks: 1.5h
- Pagination + search: 1h  
- Brand mismatch detector: 1h
- Persistent footer: 30m
- Mini App brand tab: 1h
- **Tổng: ~5h**, deploy 1 lần.

