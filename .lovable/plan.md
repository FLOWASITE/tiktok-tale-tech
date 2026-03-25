

# Fix: 13 Pipelines Bị Kẹt Ở Bước Đăng Bài (Publish)

## Nguyên nhân gốc

Tất cả 13 pipelines ở stage `publish` đều **thiếu `target_channels`** trong `pipeline_state.meta`. Khi không có kênh đăng, Publisher Agent không làm gì và kẹt tại đây.

Ngoài ra:
- **11 pipelines** có `scheduled_publish_at` trong tương lai → bị block thêm bởi schedule check
- **2 pipelines** thiếu `content_id`

## Giải pháp

### Phần 1: Backfill `target_channels` từ goal config

Thêm action `backfill_publish` vào `agent-pipeline/index.ts`:
- Quét pipelines ở `publish` stage mà thiếu `target_channels`
- Lấy `target_channels` từ `agent_goals.config` (nơi user đã chọn kênh khi tạo campaign)
- Cập nhật vào `pipeline_state.meta.target_channels`
- Với 2 pipelines thiếu `content_id`: resolve từ `pipeline_state.stages.create.output`

### Phần 2: Fix logic tạo pipeline thiếu `target_channels`

Trong `create_from_plan` action (nơi tạo pipelines từ content plan), đảm bảo `target_channels` được copy từ goal config vào `pipeline_state.meta` khi tạo pipeline mới.

### Phần 3: Xử lý pipelines chờ lịch đã quá hạn

Với pipelines có `scheduled_publish_at` đã qua (VD: 25/3, 27/3), cho phép chạy publish ngay thay vì block.

### Phần 4: UI — Thêm nút "Fix & Retry Publish" trên Kanban

Trên `CampaignDashboard.tsx`, phát hiện pipelines ở publish mà thiếu channels, hiển thị warning + nút backfill tương tự approval backfill.

### File changes

1. **`supabase/functions/agent-pipeline/index.ts`**:
   - Thêm action `backfill_publish` (~40 dòng)
   - Fix `create_from_plan` để inject `target_channels` vào meta

2. **`src/components/agents/CampaignDashboard.tsx`**:
   - Thêm detection + nút "Fix publish data" cho pipelines thiếu channels

