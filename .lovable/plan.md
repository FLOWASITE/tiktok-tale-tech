

# Mini App Telegram — Build đầy đủ chức năng

## Hiện trạng

Mini App `/app/telegram` hiện có 5 tab:
- **Tổng quan** (stats), **Tạo** (campaign goal), **Brand** (switch active brand), **Duyệt** (agent approvals), **Lịch** (scheduled posts).

Thiếu so với khả năng của bot Telegram + web app:
1. Không có **Quick Post** (1 bài / 1 kênh) — user phải dùng /generate trên chat
2. Không có **Posts viewer** — không xem lại được bài đã tạo
3. Không thấy **Connections status** — token Zalo/Facebook hết hạn không biết
4. Không có **Notifications** — bỏ lỡ event publish success/fail

## Phạm vi (theo lựa chọn của user)

### 1. Quick Post tab (mới, thay vị trí "Tạo" hiện tại — gộp 2 mode)

Đổi tab **Tạo** thành **Tạo** với 2 sub-mode (Tabs ngang):
- **Bài nhanh** (mới): chọn kênh (chip Facebook/Instagram/LinkedIn/Threads/Twitter/TikTok/Zalo OA/Website) + brand + textarea mô tả → gọi thẳng `generate-multichannel` qua `supabase.functions.invoke` với `{ action: 'generate', selected_channels: [channel], topic, brand_template_id, organization_id }`. Show progress, sau khi xong → preview text + thumbnail (nếu có) → 3 nút: **Đăng ngay** / **Lên lịch** (drawer chọn slot +1h/+3h/Mai 9h/Mai 14h/Tuỳ chỉnh) / **Xem trên web** (deeplink `/multichannel/<id>`).
- **Campaign** (giữ nguyên flow hiện tại — agent_goals + agent-pipeline)

**Đăng ngay** → invoke `channel-publisher` body `{ action: <publishAction>, contentId, channel }`. **Lên lịch** → upsert vào `content_schedules` `(content_id, channel, organization_id, scheduled_at, publish_status='scheduled', created_by=userId)`.

Token expired → toast + nút **Kết nối lại** chuyển sang tab Connections.

### 2. Posts tab (mới — thay tab Brand thành dropdown header switcher)

- Di chuyển **Brand switcher** lên header (icon Palette → bottom sheet chọn brand active, dùng cùng logic `telegram_chat_bindings.active_brand_template_id` hiện có).
- Tab mới **Posts**: list `multi_channel_contents` của org (filter theo active brand), 20 bài gần nhất, sort `created_at DESC`. Mỗi card: title, channel chips, status badge, thumbnail, actions: **Xem** (drawer hiện full text từng kênh + ảnh) / **Đăng** (mở quick publish menu) / **Mở web**.

### 3. Connections tab (mới)

- Read `social_connections` của brand active (filter theo `brand_template_id`), hiện list kênh + badge 3-state (Đã xác thực xanh / Hết hạn vàng / Chưa kết nối xám) — dùng pattern `mem://ui-ux/social-connection-management-vn`.
- Mỗi row: **Refresh token** (invoke `refresh-<platform>-token` nếu có) hoặc **Kết nối lại** (deeplink web `app.flowa.one/connections?platform=<channel>&brand=<brandId>` mở tab ngoài qua `tg.openLink`).
- **Banner đỏ** ở header Mini App khi có ≥1 kênh expired — link nhanh xuống tab Connections.

### 4. Notifications & Chat tab (mới, gộp)

Tab **Hộp thư** với 2 sub-mode:
- **Thông báo**: read `notifications` table (đã có schema, từ trigger `notify_industry_upgrade` + publish events). Realtime subscribe insert. Mark as read khi tap. Action button deeplink (vd: publish-failed → tab Connections + filter platform).
- **Chat bot**: textarea + send → gọi edge function mới `telegram-miniapp-chat` (wrap `flowa-chat` hoặc reuse `agent-orchestrator-chat`) với context `{ user_id, org_id, brand_id, source: 'miniapp' }`. Render markdown reply. Lưu lịch sử ở `chat_conversations` + `chat_messages` (đã có table). 6 message gần nhất gửi lên model làm context (theo pattern `mem://features/telegram/free-chat-vn`).

### 5. Header redesign

```
┌─────────────────────────────────────┐
│ ✦ Flowa  [Brand ▾]  🔔3   [Mini]   │
└─────────────────────────────────────┘
```
- Brand dropdown (bottom sheet chọn brand)
- Bell icon hiện badge số notification chưa đọc
- Banner conditional: token expired warning

### 6. Bottom nav (6 tab → grid-cols-6)

```
Tổng quan │ Tạo │ Posts │ Duyệt │ Lịch │ Hộp thư
                                   ↑
                              (Connections accessible từ banner + Settings menu trong header)
```

Connections không vào bottom nav (ít dùng) — vào qua icon ⚙️ header hoặc banner cảnh báo.

## Files thay đổi

| File | Thay đổi |
|---|---|
| `src/pages/TelegramApp.tsx` | Refactor: header có brand switcher + bell + settings menu; bottom nav 6 tab; thêm `QuickPostTab`, `PostsTab`, `ConnectionsTab`, `InboxTab` (notifications + chat sub-mode); giữ Dashboard/Approve/Scheduled. **Tách** thành nhiều file con vì sẽ vượt 1500 dòng. |
| `src/pages/telegram/QuickPostTab.tsx` | **NEW** — chip channel selector, textarea, gọi generate-multichannel + publish/schedule actions |
| `src/pages/telegram/PostsTab.tsx` | **NEW** — list multi_channel_contents + drawer preview + quick publish |
| `src/pages/telegram/ConnectionsTab.tsx` | **NEW** — social_connections list + reconnect buttons |
| `src/pages/telegram/InboxTab.tsx` | **NEW** — notifications list (realtime) + chatbot panel |
| `src/pages/telegram/BrandSwitcherSheet.tsx` | **NEW** — bottom sheet brand picker (extract logic từ BrandsTab cũ) |
| `src/pages/telegram/shared.tsx` | **NEW** — `formatDateTime`, `Loading`, `getTelegramMiniApp`, channel→publishAction map dùng chung |
| `supabase/functions/telegram-miniapp-chat/index.ts` | **NEW** edge function — wrap orchestrator chat cho Mini App, JWT validate user, persist history vào `chat_conversations`/`chat_messages` |

## Backend reuse (không tạo mới)

- `generate-multichannel` (Quick post)
- `channel-publisher` (Đăng ngay)
- `content_schedules` table (Lên lịch — agent-pipeline cron sẽ tự đăng)
- `refresh-<platform>-token` functions (Refresh)
- `notifications` table + Supabase realtime (Inbox)
- `social_connections` + `telegram_chat_bindings` (state)

## Database

Không có migration mới — toàn bộ table đã tồn tại. Chỉ enable realtime cho `notifications` nếu chưa enable:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

(Sẽ verify trong implementation phase, skip nếu đã có.)

## Rủi ro

- **Trung bình**: refactor TelegramApp.tsx (~1078 dòng) thành module — phải giữ nguyên auth flow, deep-link auto-open approval, brand switcher binding. Sẽ tách dần, giữ entry component.
- Reconnect deeplink mở web tab — UX có gián đoạn nhưng cần thiết (OAuth không chạy được trong WebView Telegram).
- Quick post bypass Telegram bot composer → ảnh có thể thiếu logo/footer như flow web. Sẽ cảnh báo user "ảnh basic — vào web để custom" hoặc reuse `_shared/branded-image-composer.ts` qua post-process call.

## Ngoài phạm vi

- Edit content trong Mini App (defer — chỉ view + publish)
- Multi-channel select trong Quick Post (defer — 1 channel/lần, muốn nhiều kênh dùng Campaign mode)
- Voice input cho Chat (defer)
- Push notification thật qua Telegram bot khi có notification mới (defer — đã có notify từ publish/approval flow riêng)
- Cancel scheduled từ Posts tab (defer — đã có ở Scheduled tab)

