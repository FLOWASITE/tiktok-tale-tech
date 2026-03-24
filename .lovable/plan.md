

# Plan: Pipeline Anti-Timeout + Cron + Retry + Auto-Publish + Monitor Dashboard

## Tổng quan

5 thay đổi lớn để biến pipeline từ recursive (timeout sau 55s) thành queue-based với retry, cron, auto-publish và dashboard giám sát.

---

## 1. Sửa kiến trúc chống timeout (queue-based)

**File: `supabase/functions/agent-pipeline/index.ts`**

- Xóa recursive call tại dòng 456-464 (`await runStage(supabase, supabaseUrl, supabaseKey, updatedPipeline)`)
- Thay bằng **fire-and-forget** `fetch()` gọi lại chính Edge Function với action `run_stage`:
```typescript
// Fire new invocation, do NOT await response body
fetch(`${supabaseUrl}/functions/v1/agent-pipeline`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseKey}`,
  },
  body: JSON.stringify({
    action: 'run_stage',
    pipeline_id: pipeline.id,
  }),
}).catch(e => console.error('Fire-next-stage failed:', e));
```
- Tương tự cho các chỗ gọi `runStage()` trực tiếp (dòng 94, 259) — thay bằng fire-and-forget fetch
- Thêm `stage_started_at` timestamp tracking vào `pipeline_state`

**Migration: Thêm cột `stage_started_at`**
```sql
ALTER TABLE agent_pipelines ADD COLUMN stage_started_at timestamptz;
```

---

## 2. Tạo cron jobs

**Dùng insert tool (không phải migration)** vì chứa project-specific URL/key:

- `check-agent-goals`: Mỗi 5 phút gọi `agent-pipeline` với action `check_scheduled_goals`
- `recover-stuck-pipelines`: Mỗi 10 phút, UPDATE pipelines bị stuck >10 phút (retry_count < 3) và fire lại stage

---

## 3. Retry logic trong `runStage()`

**File: `supabase/functions/agent-pipeline/index.ts`**

Trong catch block của `runStage()`:
- Đọc `pState.stages[stage].retry_count` (default 0)
- Nếu < 3: tăng retry_count, lưu `last_error`, fire-and-forget gọi lại cùng stage (exponential backoff xử lý bằng cách delay trước khi fire)
- Nếu ≥ 3: đánh dấu `failed`, ghi log, dừng pipeline

---

## 4. Auto-publish stages

**File: `supabase/functions/agent-pipeline/index.ts`**

- **`scheduled` stage**: Đọc `expansion.output` + goal's `target_channels`. Insert vào bảng `content_schedules` hoặc publish ngay nếu `full_auto`
- **`published` stage**: Gọi `channel-publisher` Edge Function (đã có) với từng channel. Lưu kết quả (post URLs) vào `pipeline_state`
- **`analyzing` stage**: Set `completed_at = NOW()`, đánh dấu pipeline hoàn thành

---

## 5. Dashboard `/agent-monitor`

**Files mới:**
- `src/pages/AgentMonitorPage.tsx` — Trang chính
- `src/components/agents/PipelineMonitorTable.tsx` — Bảng pipeline với stage progress bar
- `src/components/agents/PipelineStatsCards.tsx` — Stats cards (total, success rate, avg time, running)

**Tính năng:**
- Bảng pipeline: title, stage (color-coded), autonomy, created, updated ("X phút trước"), error
- Stage progress bar: 9 dots cho 9 stages, màu theo status
- Quick actions: Retry (failed), Approve (approval), View content
- Auto-refresh 30s qua Supabase realtime subscription
- Stats cards phía trên

**Route:** Thêm `/agent-monitor` vào `src/app/routes.tsx`

---

## Technical Details

| # | Scope | Files |
|---|-------|-------|
| 1 | Anti-timeout | `agent-pipeline/index.ts`, migration (add column) |
| 2 | Cron jobs | SQL insert (pg_cron + pg_net) |
| 3 | Retry logic | `agent-pipeline/index.ts` |
| 4 | Auto-publish | `agent-pipeline/index.ts` |
| 5 | Dashboard | 3 new components, 1 new page, route update |

