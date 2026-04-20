

## Mục tiêu
Biến `/status` từ 3 dòng text khô → **dashboard mini** trên Telegram giúp user nắm nhanh tình trạng tài khoản & campaign mà không cần mở app.

## Hiện tại
```
📊 Trạng thái của bạn:
Quota: 5/30 pipeline tháng này
Autonomy tối đa: full_auto
```
→ Thiếu: pipeline đang chạy, lần dùng gần nhất, % quota, gói cước, brand đang dùng, gợi ý hành động.

## Sau nâng cấp

```
📊 Trạng thái Flowa — Tháng 4/2026

👤 Tài khoản
• Tổ chức: Flowa Beauty Co.
• Gói: Pro (renew 15/05)
• Quyền agent: Full Auto

📈 Sử dụng tháng này
• Pipeline: 18/30  ▓▓▓▓▓▓░░░░ 60%
• Còn 12 lượt · Reset sau 14 ngày

🚀 Pipeline đang chạy (2)
• "Spa trẻ hóa da" — Creator (45%)
• "Promo 30/4" — Quality (80%)

✅ Hoàn tất gần đây (3 trong 7 ngày)
• "Brand voice clinic" — 2h trước
• "Top 5 dịch vụ hot" — hôm qua
• "Idea Tết" — 3 ngày trước

💡 Gợi ý
⚠️ Đã dùng 60% quota — cân nhắc upgrade nếu cần thêm
👉 /generate <mô tả> để tạo campaign mới
```

## Thay đổi kỹ thuật

**File chính:** `supabase/functions/telegram-webhook/index.ts` — refactor `handleStatus()`.

### Data cần fetch (1 lượt parallel `Promise.all`)
1. **Org info** từ `organizations` (name)
2. **Subscription** từ `subscriptions` (plan_type, current_period_end)
3. **Quota** từ `assertCanCreateGoal` (đã có)
4. **Pipeline đang chạy** từ `agent_pipelines` where `organization_id` + `status in ('running','queued')` limit 5
5. **Pipeline hoàn tất gần đây** từ `agent_pipelines` where `status='completed'` AND `completed_at >= now() - 7d` limit 3

### Helper mới
- `formatProgressBar(used, limit)` → render `▓▓▓▓░░░░░░ 40%` (10 ô)
- `formatRelativeTime(date)` → "2h trước" / "hôm qua" / "3 ngày trước" (Việt hóa)
- `pickHealthHint(usagePct, planType)` → câu gợi ý theo ngữ cảnh:
  - `>= 90%` → cảnh báo gần hết quota + CTA upgrade
  - `>= 60%` → nhắc nhẹ
  - `< 60%` + free plan → gợi ý dùng thêm feature
  - không có pipeline đang chạy → gợi ý `/generate`

### Edge cases
- User chưa link → giữ nguyên message hiện tại
- Không có pipeline → ẩn hẳn 2 section "đang chạy" / "hoàn tất"
- Quota = unlimited → ẩn progress bar, hiện "♾️ Không giới hạn"
- Lỗi fetch 1 phần → vẫn render phần còn lại (resilient, không fail toàn bộ)

### Markdown format
Dùng `parse_mode: "Markdown"` để bold tiêu đề; escape ký tự đặc biệt trong tên campaign (`*`, `_`, `[`).

## Phạm vi không đụng tới
- Không đổi schema DB
- Không đổi `assertCanCreateGoal` / `lookupUserBinding`
- Không deploy function khác — chỉ `telegram-webhook`

## Test sau khi deploy
1. DM bot `/status` khi không có pipeline → render gọn (ẩn section rỗng)
2. DM `/status` khi đang có pipeline running → hiện đúng tên + stage + %
3. Free plan đã dùng > 80% quota → có cảnh báo ⚠️
4. Org unlimited → hiện ♾️ thay vì progress bar

