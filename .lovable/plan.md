

# Telegram: Đăng ngay & Lên lịch trên các Social trực tiếp từ chat

## Hiện trạng (đã verify từ code)

Sau khi `/generate` xong, tin nhắn kết quả của bot chỉ có 4 nút: **Xem & duyệt** (Mini App), **Mở web**, **Tạo bài khác**, **Đổi kênh** (`telegram-webhook/index.ts` line 1662–1678).

Người dùng **không thể đăng/lên lịch trực tiếp từ Telegram** cho luồng `/generate` 1-bài-1-kênh — phải mở Mini App / web. Trong khi đó luồng **Agent approval** (apv:* callbacks) đã có đủ "Đăng ngay / +1h / +3h / Mai 9h / Mai 14h" — đây là pattern tham khảo trực tiếp.

Hạ tầng backend **đã sẵn sàng**:
- `content_schedules` table (unique `(content_id, channel)`, status: scheduled/publishing/published/failed/cancelled)
- `agent-pipeline` có cron poll due schedules → gọi `channel-publisher` → route `publish-{platform}`
- `channel-publisher` đã centralize update status + Telegram notify success/fail
- Token expiry → `ReconnectBanner` (vừa làm xong) sẽ trigger reconnect UX

→ Chỉ cần thêm **UI inline buttons** + **callback handler** trong `telegram-webhook`.

## Phạm vi

### 1. Thêm row nút "Đăng ngay / Lên lịch" vào message kết quả `/generate`

File: `supabase/functions/telegram-webhook/index.ts` (~line 1662–1678 trong `handleGenerateSingle`)

Thêm 1 row mới giữa "Xem & duyệt" và "Tạo bài khác":

```
[ 🚀 Đăng ngay ] [ 📅 Lên lịch ]
```

Callback data:
- `pub:now:<contentId>:<channel>` — đăng ngay
- `pub:menu:<contentId>:<channel>` — mở submenu chọn slot

### 2. Submenu "Lên lịch" — y hệt pattern apv:sx (đã có sẵn)

Khi user bấm **📅 Lên lịch**, edit message thành:
```
📅 Chọn thời điểm đăng cho <Channel>:
[ +1 giờ  ] [ +3 giờ  ]
[ Mai 9h  ] [ Mai 14h ]
[ Tuỳ chỉnh (Mini App) ]
[ « Quay lại ]
```

Callback: `pub:at:<contentId>:<channel>:<slot>` với `slot ∈ {1h, 3h, tmr9, tmr14}`. Nút "Tuỳ chỉnh" deeplink Mini App `/multichannel/<id>` để dùng date/time picker đầy đủ (đã có).

### 3. Callback router `pub:*`

Thêm handler `handlePublishCallback(...)` trong `telegram-webhook/index.ts`, đăng ký ở chỗ `if (data.startsWith("single:"))` (~line 2348):

```ts
if (data.startsWith("pub:") && chatId) {
  await handlePublishCallback({ supabase, botConfig, chatId, fromTgId, cbId, messageId, data });
  return;
}
```

Logic handler:
- **Permission check**: resolve `tg_user → user_id` qua `telegram_chat_bindings` (private) → check `organization_members.role ∈ {owner, admin, member}` (có thể đăng bài, không cần chỉ admin như approve agent).
- **Action `now`**: gọi thẳng `channel-publisher` qua service-role với body `{ action: <publishAction>, contentId, channel }`. Map `channel → action` ngược lại của `ACTION_TO_CHANNEL` trong `channel-publisher` (zalo_oa→zalo, google_maps→google-business, website→blog/website, …).
- **Action `at`**: insert/upsert vào `content_schedules` `(content_id, channel, organization_id, scheduled_at, publish_status='scheduled', notes='via Telegram by tg_user=…', created_by=user_id)` — cron poll trong `agent-pipeline` sẽ tự đăng đúng giờ.
- **Edit message** xác nhận: `✅ Đã lên lịch đăng <Channel> lúc dd/MM HH:mm` hoặc `🚀 Đang đăng <Channel>…`.
- **Token expired** (response chứa "Token expired" / "Reconnect"): edit thành `⚠️ Kết nối <Channel> đã hết hạn` + nút **🔗 Kết nối lại** deeplink `https://app.flowa.one/connections?platform=<channel>` (tương đồng `ReconnectBanner` làm cho web).

### 4. Hỗ trợ kênh

Chỉ hiện nút "Đăng ngay / Lên lịch" khi `channel` thuộc các kênh có thể publish trực tiếp từ Flowa:
`facebook, instagram, linkedin, twitter, tiktok, threads, zalo_oa, google_maps, website` (có blog).

Với kênh **chưa connect** (kiểm tra nhanh `social_connections` của brand): vẫn show nút nhưng khi bấm trả lỗi `❌ Chưa kết nối <Channel>` + nút deeplink connect.

## Files sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/telegram-webhook/index.ts` | (a) Thêm row "🚀 Đăng ngay / 📅 Lên lịch" vào keyboard ở `handleGenerateSingle` (~line 1662); (b) Đăng ký `pub:*` route ở callback dispatcher (~line 2348); (c) Thêm function `handlePublishCallback` mới (~150 dòng): permission check, slot menu, gọi `channel-publisher` cho `now`, insert `content_schedules` cho `at`, handle token-expired errors. |

## Rủi ro

Thấp. Không động đến `agent-pipeline` cron / `channel-publisher` / `publish-*`. Chỉ thêm entry point mới. Schedule dùng cùng table `content_schedules` mà manual web flow & cron đã xài từ trước → không drift logic.

## Ngoài phạm vi

- **Multi-channel select trong Telegram** (chọn nhiều kênh đăng cùng lúc cho 1 bài): defer — luồng `/generate` hiện 1-bài-1-kênh, multi-channel nên đi qua agent campaign hoặc Mini App.
- **Date/time picker tuỳ ý** (chọn ngày giờ bất kỳ): defer — nút "Tuỳ chỉnh" mở Mini App đã đủ.
- **Cancel scheduled publish từ Telegram**: defer — Mini App đã có; sau này thêm `pub:cancel:<scheduleId>` nếu cần.
- **Recurring schedule**: defer.

