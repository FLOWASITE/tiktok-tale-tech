

# Telegram Bot UX Overhaul — Cho user dễ dùng

## 🎯 Mục tiêu
- **Onboarding zero-friction**: User vừa link xong biết ngay phải làm gì
- **Discoverability liên tục**: Bot tự "show" năng lực qua context, không bắt user phải nhớ lệnh
- **Giảm typing**: Inline buttons + Mini App thay cho gõ command dài

---

## Phase 1 — Smart Onboarding ⭐

### 1.1 Welcome message giàu context (sau `/start <token>`)
```
🎉 Chào [Tên]! Đã kết nối với Flowa.
Mình là AI Marketing Agent — tạo content, quản campaign, theo dõi quota từ Telegram.

👇 Thử ngay:
[🚀 Tạo campaign đầu tiên]  [📊 Xem brand hiện tại]
[💡 Xem ví dụ thực tế]      [📚 Hướng dẫn 30s]
```
4 inline buttons → callback dẫn vào sub-flow.

### 1.2 Interactive tutorial 3 bước
- Step 1: "Chat tự nhiên — thử gõ *'tạo bài cho spa làm đẹp'*"
- Step 2: "Lệnh nhanh — bấm /status"
- Step 3: "Mini App — bấm nút mở giao diện đầy đủ"
- Track: `telegram_chat_bindings.onboarded_at`, `tutorial_step`

### 1.3 `/examples` — Example library
7 prompt mẫu kèm button "Thử ngay" → click tự fill prompt:
- "Tạo campaign Black Friday cho thẩm mỹ viện"
- "Viết 3 caption Facebook cho sản phẩm A"
- "Phân tích hiệu quả campaign tuần này"
- ...

---

## Phase 2 — Discoverability

### 2.1 Contextual hints sau mỗi reply
Append "💡 Bạn cũng có thể:" + 2 button gợi ý:
- Vừa tạo campaign → "Duyệt ngay" / "Xem lịch đăng"
- Vừa `/status` → "Mua thêm quota" / "Xem báo cáo"

### 2.2 `/help` redesign — grouped by use case
```
🎯 Bạn muốn làm gì?
[✍️ Tạo nội dung]  [📊 Xem báo cáo]
[⚙️ Quản lý brand]  [💳 Quota & gói cước]
[👥 Group team]    [❓ Cần hỗ trợ]
```
Mỗi button → drill-down list lệnh + ví dụ.

### 2.3 Smart fallback khi bot không hiểu
Reuse intent classifier có sẵn:
- Detect intent gần nhất → "Có phải bạn muốn *tạo campaign*?" + button confirm
- Hoặc gợi ý template: "Thử: *'tạo bài cho [sản phẩm]'* hoặc /help"

### 2.4 Daily/Weekly digest (proactive push)
Cron 8h sáng → "📅 Hôm nay có 3 bài chờ duyệt [📋 Duyệt ngay]"
Tuần 1 lần → tóm tắt reach/engagement. Toggle qua `/settings`.

---

## Phase 3 — Telegram Mini App (WebApp) 🚀

### 3.1 Setup
- Đăng ký Mini App URL với BotFather
- URL: `https://app.flowa.one/telegram-app`
- Auto-auth: verify HMAC `Telegram.WebApp.initData` → mint Supabase session
- New edge function `telegram-webapp-auth`

### 3.2 Scope (mobile-first, 3 màn)
- **Dashboard**: Quota, pipeline đang chạy, campaign chờ duyệt
- **Quick Create**: Form tạo campaign 1 màn (chọn brand → topic → Generate)
- **Approve queue**: Swipe duyệt/từ chối, preview ảnh full-screen

### 3.3 `web_app` button trong replies
```ts
{ text: "📋 Duyệt nhanh", web_app: { url: ".../approve" } }
```
Mở overlay trong Telegram, không leave app.

### 3.4 Persistent menu button
`setChatMenuButton` → thay icon "/" bằng "🚀 Mở Flowa" launch Mini App.

---

## Phase 4 — Settings & Personalization

### 4.1 `/settings` panel
```
⚙️ Cài đặt
[🔔 Daily digest: BẬT]    [🌐 Ngôn ngữ: VI]
[🎨 Brand mặc định: ABC]  [🤖 Verbose: TẮT]
[🔓 Gỡ kết nối]
```
Toggle inline → update `telegram_user_preferences`.

### 4.2 Brand quick-switch
`/brand` → inline list nhiều brand → click switch active brand cho session.

---

## 📦 Files thay đổi

### Database
- **NEW** `telegram_user_preferences` (user_id, org_id, daily_digest, language, default_brand_id, verbose_mode)
- `telegram_chat_bindings` thêm cột: `onboarded_at`, `tutorial_step`, `tutorial_completed_at`
- **NEW** `telegram_example_prompts` (seed 7 examples)

### Edge functions
- `telegram-webhook/index.ts` — major refactor:
  - `handleStart` smart welcome 4 buttons
  - New: `handleExamples`, `handleSettings`, `handleTutorial`
  - Smart fallback unknown intent
  - Append contextual hints sau mọi reply
- **NEW** `telegram-webapp-auth/index.ts` — validate initData HMAC
- **NEW** `telegram-daily-digest/index.ts` — cron 8h
- `_shared/telegram-client.ts`:
  - `BOT_COMMANDS` thêm `/examples`, `/settings`, `/tutorial`
  - Helpers: `appendContextualHints`, `buildWelcomeKeyboard`, `buildHelpKeyboard`
- `telegram-bot-admin/index.ts` — action `set_menu_button`

### Frontend (Mini App)
- **NEW** `src/pages/TelegramApp.tsx` route `/telegram-app/*`
- **NEW** `src/components/telegram-app/`: Layout, Dashboard, QuickCreate, ApproveQueue
- **NEW** `src/hooks/useTelegramWebApp.ts` — init SDK + auth
- `src/app/routes.tsx` — đăng ký route (KHÔNG ProtectedRoute, dùng webapp auth)
- `index.html` — script `telegram-web-app.js` conditional

### i18n + Cron
- `vi/en/th.json` — namespace `telegramApp.*` (60-80 keys)
- pg_cron 8h ICT → `telegram-daily-digest`

---

## 🧪 Test sau triển khai

1. **Welcome**: Link mới → 4 buttons → click "Hướng dẫn" → 3 step → completed
2. **Examples**: `/examples` → 7 prompts → click → bot generate
3. **Fallback**: Gõ "abc xyz" → suggest "Có phải bạn muốn…"
4. **Hints**: Sau `/status` → buttons "Mua quota" / "Báo cáo"
5. **Mini App**: Menu button → webapp mở trong Telegram → auto-login
6. **Approve**: Mini App tab Approve → swipe → DB update
7. **Digest**: Trigger manual → nhận tóm tắt
8. **Settings**: Toggle digest off → DB update

---

## ⏱ Ước tính

| Phase | Time | Priority |
|---|---|---|
| Phase 1 (Onboarding) | 2-3h | ⭐⭐⭐ Must |
| Phase 2 (Discoverability) | 2-3h | ⭐⭐⭐ Must |
| Phase 3 (Mini App) | 5-7h | ⭐⭐ High impact |
| Phase 4 (Settings) | 1-2h | ⭐ Nice |
| **Tổng** | **10-15h** | Deploy theo phase |

**Đề xuất**: Phase 1+2 trước (deploy + validate 2-3 ngày với user thật), rồi mới làm Phase 3 (Mini App là đầu tư lớn).

