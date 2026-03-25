

# Phase 4: Scheduled Publishing — Calendar Integration

## Tổng quan

Hệ thống pipeline đã có `check_scheduled_publish` (cron 10 phút) + publish stage kiểm tra `scheduled_publish_at`. Tuy nhiên **thiếu cầu nối** giữa pipeline và Content Calendar:

1. Pipeline không tạo `content_schedules` → Calendar không hiển thị scheduled items từ campaign
2. Publish stage không truyền `scheduleId` cho channel-publisher → publisher không update trạng thái trên Calendar

## Kế hoạch

### 1. Tạo `content_schedules` khi spawn pipeline từ campaign plan

**File: `supabase/functions/agent-pipeline/index.ts`** (SỬA — action `create_from_plan`)

Sau khi insert pipeline (line ~582), nếu `piece.scheduled_date` tồn tại:
- Insert `content_schedules` record cho mỗi `target_channel` của piece
- Lưu `schedule_id` vào `pipeline_state.metadata.schedule_ids[channel]`
- Fields: `content_id` = null (chưa có, sẽ update sau), `channel`, `organization_id`, `scheduled_at`, `publish_status = 'scheduled'`, `created_by`

### 2. Update `content_schedules.content_id` khi content được tạo

**File: `supabase/functions/agent-pipeline/index.ts`** (SỬA — stage `create`)

Sau khi `content_id` được resolve (sau create stage):
- Lấy `schedule_ids` từ `pipeline_state.metadata`
- Update tất cả `content_schedules` có id trong danh sách với `content_id` mới

### 3. Truyền `scheduleId` trong publish stage

**File: `supabase/functions/agent-pipeline/index.ts`** (SỬA — stage `publish`)

Trong vòng lặp `for (const channel of targetChannels)`:
- Lấy `scheduleId` từ `pState.metadata.schedule_ids[channel]`
- Thêm `scheduleId` vào `pubPayload`
- Các publisher hiện tại (facebook, twitter, instagram...) **đã có logic** update `content_schedules` khi nhận `scheduleId`

### 4. Update schedule status khi publish fail

**File: `supabase/functions/agent-pipeline/index.ts`** (SỬA — stage `publish`)

Trong catch block cho mỗi channel:
- Nếu có `scheduleId`, update `content_schedules` set `publish_status = 'failed'`, `publish_error`

### 5. Tạo schedules cho pipeline không qua campaign (optional fallback)

Nếu pipeline có `scheduled_publish_at` nhưng không có `schedule_ids` trong metadata (pipelines cũ hoặc single-goal):
- Tự tạo `content_schedules` ngay đầu publish stage trước khi gọi publisher

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/agent-pipeline/index.ts` | SỬA — create schedules on plan spawn, pass scheduleId to publisher, update on fail |

Không cần migration (bảng `content_schedules` đã tồn tại). Không cần file mới. UTM tracking đã tích hợp sẵn trong publish stage.

