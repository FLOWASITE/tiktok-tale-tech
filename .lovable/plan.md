

# Telegram: gom nhiều step Goal Wizard vào 1 luồng chat

## Vấn đề

Trên app, tạo campaign đi qua 6 bước Wizard:
1. Tên + mô tả
2. Kênh
3. Thời lượng + ngày bắt đầu
4. Tần suất
5. Autonomy + approval mode
6. Brand + clarification context

Telegram `/generate <prompt>` hiện **bỏ qua hết**, hard-code:
- channels = `["facebook","website"]`
- duration = 14 ngày, cadence weekly×3
- approval = `approve_plan`
- brand = active brand
- clarification = rỗng

→ Campaign tạo từ Telegram thường sai kênh / sai thời lượng so với ý user.

## Mục tiêu

Giữ tinh thần "chat tự nhiên, không bắt user gõ form", nhưng cho phép **2 chế độ**:

### A. Quick mode (mặc định, giữ nguyên trải nghiệm hiện tại)
`/generate viết 5 bài về spa làm đẹp tháng 5`
→ AI tự suy luận channels/duration/frequency từ prompt (LLM extract), tạo luôn. User nhận tóm tắt + nút "Sửa".

### B. Guided mode (khi user click "Sửa" hoặc gõ `/campaign`)
Bot hỏi tuần tự bằng inline keyboard, mỗi câu 1 message ngắn. Lưu state ở `telegram_chat_state` (jsonb) theo `chat_id + user_id`.

## Flow Guided mode (5 câu hỏi)

```
Bot: 📝 Mô tả campaign?
User: Viết content cho spa tháng 5

Bot: 📅 Thời lượng?
     [7 ngày] [14 ngày] [30 ngày] [Tùy chọn]
User: [14 ngày]

Bot: 📢 Kênh nào? (chọn nhiều)
     [✓ Facebook] [Instagram] [✓ Website] [TikTok] [LinkedIn]
     [✅ Xong]
User: [✅ Xong]

Bot: ⚡ Tần suất?
     [2 bài/tuần] [3 bài/tuần] [Hàng ngày]

Bot: 🛡️ Chế độ duyệt?
     [Duyệt kế hoạch] [Duyệt từng bài] [Tự động]

Bot: ✅ Tóm tắt:
     • 14 ngày, từ 21/04
     • FB + Website, 3 bài/tuần
     • Duyệt kế hoạch
     • Brand: Flowa
     [🚀 Tạo] [✏️ Sửa lại] [❌ Hủy]
```

## Implementation

### 1. Bảng state mới
```sql
create table telegram_chat_state (
  chat_id bigint,
  user_id uuid,
  flow text,                    -- 'campaign_wizard'
  step text,                    -- 'description' | 'duration' | 'channels' | ...
  draft jsonb default '{}',     -- accumulated form data
  updated_at timestamptz,
  primary key (chat_id, user_id)
);
```
TTL 30 phút (cron cleanup).

### 2. AI extract cho Quick mode
Trước khi insert goal trong `handleGenerate`, gọi Gemini Flash:
```
Input: prompt người dùng + danh sách kênh có connection
Output JSON: { channels[], duration_days, cadence, per_week, suggested_name }
```
Fallback về defaults nếu fail. Log vào `clarification_context` để user biết AI đã suy luận gì.

### 3. Inline keyboards
Dùng `callback_query` của Telegram. Handler mới `handleCampaignWizardCallback` route theo `step` trong state, update `draft`, gửi câu hỏi tiếp theo.

### 4. Confirmation card
Dùng cùng template tóm tắt như Quick mode → user xem trước khi commit. Click "🚀 Tạo" mới insert goal + trigger pipeline (logic hiện tại giữ nguyên).

### 5. Sửa từ Quick mode
Sau message `✅ Goal "..." đã nhận`, thêm 2 nút:
- `✏️ Sửa kênh/thời lượng` → vào Guided mode với `draft` đã prefill từ goal vừa tạo (update thay vì insert mới nếu pipeline chưa start)
- `🗑️ Hủy` → soft-delete goal + cancel pipeline

## Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/migrations/<new>.sql` | Tạo `telegram_chat_state` + RLS service-role only |
| `supabase/functions/telegram-webhook/index.ts` | + `handleCampaignWizardCallback`, + helpers `getDraft/setDraft/clearDraft`, + `extractCampaignParams()` gọi Gemini Flash, sửa `handleGenerate` để dùng AI extract + thêm nút Sửa |
| `supabase/functions/_shared/telegram-keyboards.ts` (mới) | Builders cho 5 keyboard câu hỏi |

## Test

1. `/generate viết 10 bài Instagram cho clinic 30 ngày` → AI extract đúng IG + 30 ngày, không phải FB+Web/14
2. `/campaign` → hỏi tuần tự 5 câu, mỗi câu reply qua nút bấm, cuối cùng confirm
3. Quick mode → click "Sửa kênh" → vào Guided với draft đã có, đổi kênh → goal cập nhật
4. Bỏ giữa chừng > 30 phút → state tự xóa, `/campaign` lại từ đầu
5. Brand đang active được tự gắn vào draft, hiện ở step tóm tắt

## Ước tính
**2-3h** — 1 migration + 2 file edge function + 1 file helper. Không đụng schema `agent_goals`.

