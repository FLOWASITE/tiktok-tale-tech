# Kiểm tra trạng thái thật & sửa badge

## Sự thật ở DB (plan "Nội dung tháng 5", 16 pieces, status=`executing`, progress 0/16)

| # | Kênh | UI hiện tại | Trạng thái thật |
|---|------|-------------|-----------------|
| 1 | Website | "Đang chạy" 🟠 | **Chờ duyệt** — pipeline ở stage `approval`, đã có `content_id` |
| 2 | Facebook | "Đang chạy" 🟠 | **Chờ duyệt** — pipeline ở stage `approval`, đã có `content_id` |
| 3 | Pinterest | "Đang chạy" 🟠 | **Lỗi** — pipeline `is_flagged=true`, "Failed to save carousel" sau 3 retries |
| 4–16 | mixed | "Đang chạy"/"Chờ" | **Chưa bắt đầu** — chưa có `pipeline_id`, `piece.status='planned'` |

⇒ Badge hiện tại lừa người dùng: cả 3 pipeline đều **không thật sự đang chạy** (2 đang chờ tay duyệt, 1 đã chết). 13 piece còn lại chưa được agent đụng vào.

## Nguyên nhân

`CampaignPlanReview` chỉ đọc `piece.status` trong `plan_data` (jsonb). Trường này được set `in_progress` ngay khi `agent-pipeline` khởi tạo và **không bao giờ cập nhật** khi pipeline rơi vào `approval`, `flagged`, hay `failed`. Trạng thái thật nằm ở bảng `agent_pipelines` (cột `current_stage`, `is_flagged`, `flag_reason`, `content_id`, `completed_at`).

## Phạm vi sửa (chỉ UI, không đổi backend)

### 1. Hook mới: `src/hooks/useCampaignPlanPipelines.ts`
- Input: `plan.plan_data[].pipeline_id` (lọc non-null)
- Query `agent_pipelines` select `id, current_stage, is_flagged, flag_reason, content_id, completed_at, overall_quality_score`
- Trả `Map<pipeline_id, AgentPipelineLite>` + `isLoading`
- Realtime: subscribe `postgres_changes` trên `agent_pipelines` filter `campaign_plan_id=eq.{plan.id}` để badge tự cập nhật khi agent chạy

### 2. Util: `src/lib/campaignPieceStatus.ts`
Hàm `derivePieceStatus(piece, pipeline?)` trả về:
```
type DerivedPieceStatus =
  | 'not_started'   // piece.status='planned', no pipeline_id
  | 'queued'        // có pipeline_id, current_stage='strategy'|'create' chưa flagged
  | 'generating'    // current_stage='create' đang chạy (heuristic theo updated_at < 5 phút)
  | 'awaiting_approval' // current_stage='approval', có content_id
  | 'publishing'    // current_stage='publish'
  | 'published'     // completed_at != null
  | 'failed'        // is_flagged=true
  | 'completed'     // piece.status='completed'
```
Ưu tiên: `failed` > `published`/`completed` > stage thật > `piece.status` fallback.

### 3. Cập nhật `statusBadge()` trong `CampaignPlanReview.tsx` (line 75)
Đổi signature: `statusBadge(derived: DerivedPieceStatus, extra?: { flagReason?: string })`. Bảng nhãn + màu:

| Trạng thái | Nhãn VN | Màu |
|---|---|---|
| not_started | Chưa bắt đầu | muted/gray |
| queued | Trong hàng đợi | slate |
| generating | Đang tạo | blue, pulse |
| awaiting_approval | Chờ duyệt | amber |
| publishing | Đang đăng | indigo, pulse |
| published | Đã đăng | emerald |
| failed | Lỗi | rose (tooltip = `flag_reason`) |
| completed | Hoàn tất | emerald |

3 view (`PieceCard` ~line 122, `ChannelView` ~307, `TimelineView` ~408, `ListView` ~433) đều gọi `statusBadge(derivePieceStatus(piece, pipelinesMap.get(piece.pipeline_id)), { flagReason })`.

### 4. Progress bar "Tiến độ X/Y" (line ~509)
Đổi `completedCount` từ `piece.status==='completed'` → dùng `derived === 'published' || 'completed'`. Thêm dòng phụ nhỏ bên dưới: `2 chờ duyệt · 1 lỗi · 13 chưa chạy` (đếm theo derived).

### 5. Hành động cho row "failed" (nhỏ, optional)
Trong row mode `ListView`, khi `derived==='failed'` hiện thêm nút text-xs "Thử lại" → invoke edge `agent-pipeline` action `retry` (đã tồn tại, không thêm backend).

## File thay đổi
- **Tạo**: `src/hooks/useCampaignPlanPipelines.ts`, `src/lib/campaignPieceStatus.ts`
- **Sửa**: `src/components/agents/CampaignPlanReview.tsx` (statusBadge + 4 chỗ gọi + completedCount + sub-line)

## Không đụng
- Backend (`agent-pipeline`, `generate-campaign-strategy`)
- DB schema, RLS, migrations
- `piece.status` trong jsonb (vẫn giữ làm fallback)
- Navigation onClick row (đã làm ở turn trước)
- Layout 3-view, edit/delete dialog
