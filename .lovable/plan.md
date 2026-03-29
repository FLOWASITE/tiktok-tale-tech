

# Sửa lỗi: Pipeline tự tạo nội dung liên tục không dừng

## Nguyên nhân gốc

Hàm `recover_stuck` (dòng 323-389) có 3 vấn đề nghiêm trọng:

1. **Không giới hạn số lần retry** — Mỗi 10 phút, cron job gọi `recover_stuck`, reset TẤT CẢ pipeline bị kẹt >15 phút. Pipeline lỗi liên tục bị retry vô hạn (có pipeline đạt retry_count: 45+).

2. **Xóa cờ `is_flagged`** — Dòng 368 set `is_flagged: false`, nghĩa là ngay cả pipeline đã bị đánh cờ lỗi bởi quality gate hay publish cũng bị reset và chạy lại.

3. **Không lọc pipeline đã flagged** — Query tìm pipeline kẹt (dòng 329-334) không loại trừ `is_flagged = true`, nên pipeline lỗi vẫn bị kéo vào vòng lặp.

## Kế hoạch sửa

### 1. File `supabase/functions/agent-pipeline/index.ts`

**a) Thêm giới hạn retry tối đa trong `recover_stuck`:**
- Trước khi reset pipeline, kiểm tra `retry_count`. Nếu >= 3 lần, đánh dấu `is_flagged: true` với lý do và **bỏ qua**, không retry nữa.

**b) Lọc pipeline đã flagged khỏi query stuck:**
- Thêm `.eq("is_flagged", false)` vào query tìm pipeline kẹt (dòng 329-334).

**c) Không reset `is_flagged` khi recover:**
- Bỏ `is_flagged: false` khỏi update (dòng 368).

**d) Cập nhật `check_scheduled_goals`:**
- Thêm filter `.eq("is_flagged", false)` vào query đếm pipeline đang chạy (dòng 236-240), để pipeline lỗi không chiếm slot.

### 2. SQL Migration — Dọn dẹp pipeline đang kẹt

```sql
-- Flag tất cả pipeline đang kẹt với retry >= 3
UPDATE agent_pipelines 
SET is_flagged = true, 
    flag_reason = 'Auto-flagged: exceeded max retry limit'
WHERE completed_at IS NULL 
  AND is_flagged = false
  AND (pipeline_state::jsonb->'stages'->current_stage->>'retry_count')::int >= 3;

-- Xóa cron job trùng lặp (giữ lại 1 job duy nhất cho check_scheduled_goals)
```

## Kết quả
- Pipeline lỗi sẽ dừng sau tối đa 3 lần retry
- Pipeline đã flagged không bị recover lại
- Hệ thống không còn tạo nội dung liên tục vô hạn

**Tổng: 1 file code + 1 migration SQL**

