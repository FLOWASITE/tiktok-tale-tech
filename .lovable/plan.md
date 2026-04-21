

# Duyệt trực tiếp bằng nút trong Telegram — đã có sẵn, cần nâng cấp

## Trả lời ngắn

**Có. Đã có sẵn từ trước.** Mỗi khi pipeline tới bước duyệt, bot tự động đẩy push vào DM admin kèm 2 nút inline:

```text
🔔 Cần duyệt nội dung

📝 [Tiêu đề]
[Preview 280 ký tự]

[ ✅ Duyệt ] [ ❌ Từ chối ]
```

Bấm nút → bot resolve Telegram user → app user → check role admin/owner → gọi `agent-approve` → chỉnh sửa message thành "✅ Đã duyệt — pipeline sẽ chuyển sang publish".

**Tại sao bạn chưa thấy?** Push chỉ gửi cho admin/owner đã `/start` DM với bot. Nếu bạn chỉ kết nối qua group hoặc chưa từng /start trong DM, bot không gửi được push (Telegram cấm bot khởi tạo DM).

## Tình trạng hiện tại trong code

- `_shared/telegram-notifier.ts` → `approvalKeyboard()` + `notifyApprovalNeeded()` ✅
- `agent-pipeline/index.ts` → tự gọi `notifyApprovalNeeded` khi tạo `agent_approvals` mới ✅
- `telegram-webhook/index.ts` → handler `apv:a:` / `apv:r:` gọi `agent-approve` ✅
- Permission check: chỉ `owner` / `admin` được duyệt từ Telegram ✅
- Idempotent: nếu đã duyệt trước đó → toast "Đã được xử lý trước đó" ✅

## Hạn chế cần fix

1. **Message thiếu context**: không hiện kênh sẽ đăng, không hiện scheduled time → user duyệt mù
2. **Không có nút "Xem chi tiết"**: muốn xem ảnh + nội dung đầy đủ phải mở Mini App thủ công
3. **Không có nút "Duyệt & lên lịch"**: chỉ có duyệt-ngay, không thể chỉnh giờ đăng từ Telegram
4. **Push chỉ vào DM admin**: nếu chưa /start, không nhận được — không có fallback group notify

## Kế hoạch nâng cấp

### A) Enrich message duyệt (file: `_shared/telegram-notifier.ts`)

Mở rộng `notifyApprovalNeeded` nhận thêm `channels[]` + `scheduledAt`. Render:

```text
🔔 Cần duyệt nội dung

📝 [Tiêu đề]
📢 Facebook, Website
📅 Sẽ đăng: 23/04/2026 09:00

[Preview 200 ký tự]

[ 👁️ Xem chi tiết ] ← mở Mini App tới approval id
[ ✅ Duyệt ngay ] [ ❌ Từ chối ]
[ 📅 Duyệt & đổi lịch ]
```

Nút "Xem chi tiết" dùng `web_app` button trỏ tới `https://app.flowa.one/telegram-app?view=approve&id=<approvalId>&v=tg-auth-v2` — TelegramApp deep-link để auto-open Preview Drawer của approval đó.

### B) Bổ sung callback "đổi lịch" (file: `telegram-webhook/index.ts`)

Thêm pattern `apv:s:<approvalId>` → bot gửi inline keyboard chọn nhanh:
- Đăng ngay
- +1 giờ / +3 giờ / Sáng mai 9h / Chiều mai 14h
- Mở Mini App để chọn ngày tuỳ chỉnh

Khi user bấm → gọi `agent-approve` với `scheduled_publish_at` tương ứng.

### C) Pass thêm dữ liệu từ `agent-pipeline` (file: `agent-pipeline/index.ts`)

Tại chỗ gọi `notifyApprovalNeeded`, query thêm:
- `multi_channel_contents.selected_channels` (theo `pipeline.content_id`)
- `pipeline.scheduled_publish_at`

Pass xuống notifier để render đầy đủ.

### D) Fallback group notify (optional)

Nếu không resolve được DM target nào (admin chưa /start), gửi vào group đã link với org kèm câu: "👆 Admin chưa kết nối DM bot — vào https://t.me/<bot>?start=link để nhận push duyệt".

## Files sẽ sửa

- `supabase/functions/_shared/telegram-notifier.ts` — extend `approvalKeyboard` + `notifyApprovalNeeded` signature
- `supabase/functions/agent-pipeline/index.ts` — query thêm channels/schedule, pass xuống notifier
- `supabase/functions/telegram-webhook/index.ts` — handler `apv:s:` cho đổi lịch nhanh
- `src/pages/TelegramApp.tsx` — đọc `?view=approve&id=` để auto-mở Preview Drawer của đúng approval

## Rủi ro

Thấp. Tất cả là enrich UX trên flow đã hoạt động. Không đổi schema, không đổi RLS, không đổi logic `agent-approve`. Callback data vẫn dưới 64 bytes (Telegram limit).

## Cần xác nhận trước khi triển khai

Bạn có muốn cả 4 phần (A+B+C+D) không, hay chỉ A+C (enrich message + nút Xem chi tiết) cho gọn lần đầu?

