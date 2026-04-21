

# Telegram link UX — refactor "one-click" kiểu Manus

## Bối cảnh hiện tại (đã verify code)

- `TelegramLinkCard` mở `TelegramConnectDialog` (popup 320px) → trong dialog mới gọi `generateDeeplink` (lazy) → render QR + countdown + nút Continue + nút Copy + nút Tạo link mới.
- `useTelegramBinding` không cache deeplink, không subscribe realtime — phải đợi dialog mở mới fetch.
- Khi bind thành công: dialog show success state có nút Mini App, nhưng card chính phía sau cần đóng dialog mới thấy state mới.
- Token TTL 600s (`telegram-link-token` ký compact token).
- 6 trạng thái user phải xử lý (loading/error/ready/QR/copy/success) → quá nhiều bước cho một flow chỉ cần "click → start bot".

## Mục tiêu (đã chốt với user)

- Login flow "khác" liên quan AI agent → tức là cải tiến **link Telegram cho user hiện có**, đơn giản hoá UX về mức 1 click giống Manus.
- KHÔNG đụng tới signup/login Flowa qua Telegram (giữ nguyên Google/Email).
- Giữ nguyên backend `telegram-link-token`, backend webhook bind, schema `telegram_chat_bindings`.

## Thiết kế mới — inline, không dialog

### A. `TelegramLinkCard.tsx` — refactor hoàn toàn state "chưa link"

```text
┌──────────────────────────────────────────────────────┐
│  [Send icon]  Kết nối Telegram để chat AI Agent      │
│                                                      │
│  [ Mở Telegram → Start bot ]   ← nút primary lớn    │
│                                                      │
│  [ Scan QR ▾ ]    Bot @flowa_bot ↗                  │
│                                                      │
│  Sau khi Start: bạn chat tự nhiên với AI Agent      │
│  ngay trong Telegram (tạo campaign, hỏi quota…).    │
└──────────────────────────────────────────────────────┘
```

Chi tiết:
- **Prefetch token** ngay khi card mount nếu `!binding && botReady` → click không loading.
- Nút primary là `<Button asChild>` với `href={deeplink}` `target="_blank"` → 1 click, không qua dialog.
- "Scan QR" mở `<Popover>` chứa canvas QR (lazy render khi popover open) — dành cho user mở app web trên desktop nhưng dùng Telegram trên phone khác.
- Auto-refresh token sau 8 phút (TTL 10 phút) bằng `setTimeout` để click luôn fresh.
- Subscribe realtime `telegram_chat_bindings` ngay tại card → khi bind thành công, card morph sang state "đã kết nối" trong < 3s, không cần đóng dialog.

### B. State "đã kết nối" — giàu hơn, useful hơn

```text
┌──────────────────────────────────────────────────────┐
│  ● AI Agent đang lắng nghe trên @flowa_bot          │
│  @your_handle · Hoạt động: 2 phút trước             │
│                                                      │
│  [ Mở chat ↗ ]  [ Test ping ]  [ Gỡ ]               │
│                                                      │
│  Hint: "tạo campaign cho spa", "/campaign", …       │
└──────────────────────────────────────────────────────┘
```

- Đọc thêm `last_command_at` từ binding (đã có trong schema) → format relative time.
- `[ Test ping ]` gọi edge function mới `telegram-send-test` — gửi tin "🟢 Test từ Flowa lúc HH:mm" về DM, FE toast confirm. Cho user verify connection còn sống mà không cần mở Telegram.
- Hint câu lệnh tham khảo (`/campaign`, `/pause`, free chat) — kéo từ memory `features/telegram/free-chat-vn`.

### C. Group binding accordion — giữ nguyên

Không động tới phần group binding (đã ổn).

### D. `TelegramConnectDialog.tsx` — KHÔNG xoá

Giữ file để rollback nhanh nếu cần. Chỉ ngừng import từ `TelegramLinkCard`.

### E. Hook `useTelegramBinding` — bổ sung

- `prefetchedDeeplink: { url: string; expiresAt: number } | null`
- `ensureDeeplink()` → trả deeplink cached nếu còn > 60s, ngược lại gọi `generateDeeplink` mới.
- Auto cleanup timer khi unmount.

### F. Edge function mới `telegram-send-test`

```text
POST /telegram-send-test
Auth: JWT user (verify_jwt mặc định, validate trong code)
Body: { organization_id }
Logic:
  1. Verify user là member của org
  2. Load binding (chat_type=private, user_id, org)
  3. Load bot config (BYOB hoặc default) → decrypt bot_token
  4. Gọi Telegram sendMessage với "🟢 Test từ Flowa lúc HH:mm. AI Agent sẵn sàng."
  5. Trả { ok: true, sent_at }
Errors:
  - 404 nếu chưa bind → "Bạn chưa link Telegram"
  - 404 nếu bot inactive → "Bot tổ chức đang tắt"
```

**Lưu ý**: dùng cùng pattern decrypt bot_token như `telegram-webapp-auth` (`decryptCredential` từ `_shared/crypto.ts`) — KHÔNG đi qua connector gateway vì project dùng BYOB token per-org, không phải Telegram connector global.

## File thay đổi

| File | Loại | Mô tả |
|---|---|---|
| `src/components/agents/TelegramLinkCard.tsx` | refactor lớn | Inline button + popover QR + realtime subscribe + state đã-kết-nối giàu hơn |
| `src/hooks/useTelegramBinding.ts` | thêm field | `prefetchedDeeplink`, `ensureDeeplink`, expose `last_command_at` |
| `src/components/agents/TelegramConnectDialog.tsx` | giữ nguyên | Không import nữa, dùng cho rollback |
| `supabase/functions/telegram-send-test/index.ts` | mới | Gửi ping test qua bot |
| `mem://features/telegram/free-chat-vn.md` | update | Note thêm về one-click link UX |

## Test E2E

1. Settings → Agents khi chưa link → card hiện ngay nút "Mở Telegram → Start bot" (không loading)
2. Click → Telegram desktop/mobile mở thẳng với `?start=<token>` → bấm Start
3. Quay lại tab Flowa → card morph sang "AI Agent đang lắng nghe" trong < 3s qua realtime
4. Click `Test ping` → toast "Đã gửi" + Telegram nhận "🟢 Test từ Flowa lúc 14:32"
5. Mobile viewport 707px: nút full-width, popover QR ẩn mặc định
6. Để tab idle > 10 phút rồi click → token đã auto-refresh, click vẫn vào Telegram được
7. User chưa bind nhưng click `Test ping` từ DevTools → 404 "Bạn chưa link"
8. Bot config disabled → `Test ping` trả 404 rõ ràng, FE toast destructive

## Ước tính
**60–90 phút** — 1 component refactor + 1 hook update + 1 edge function nhỏ. Không migration, không đụng schema.

## Rủi ro
- Prefetch token thêm 1 call `telegram-link-token` mỗi lần card mount (chỉ khi `!binding`) — nhẹ, chấp nhận được.
- Realtime channel duplicate nếu card mount nhiều lần → đảm bảo `useEffect` cleanup `removeChannel`.
- `telegram-send-test` decrypt bot_token mỗi lần gọi — không cache để tránh leak; chấp nhận latency ~50ms.

