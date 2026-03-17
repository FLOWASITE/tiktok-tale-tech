

# Dọn sạch 2 file còn sót `ai_edit`

## Hiện trạng
Hệ thống subscription đã hoàn thiện 95%. Chỉ còn 2 file có reference thừa đến `ai_edit` (không gây lỗi nhưng nên dọn):

### 1. `src/hooks/useSubscription.ts` (line 28)
- Bỏ `monthly_ai_edits: number` khỏi `PlanLimit` interface (DB vẫn có cột nhưng frontend không cần dùng)

### 2. `src/hooks/useAdminSystemAnalytics.ts` (line 269)
- Bỏ query `usage_logs` với `usage_type = 'ai_edit'` — data cũ không còn được log, query thừa

## Tác động
- Không có lỗi nào hiện tại. Đây chỉ là cleanup code thừa.
- Nếu không muốn sửa thì hệ thống vẫn chạy bình thường.

