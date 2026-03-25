

# Thêm trạng thái & progress cho Pipeline Card

## Thay đổi

### 1. PipelineCard — Thêm progress bar theo stage
Mỗi pipeline đã có `current_stage` (6 stages: strategy → create → quality → approval → publish → analyze). Tính progress dựa trên vị trí stage hiện tại:

```text
strategy(17%) → create(33%) → quality(50%) → approval(67%) → publish(83%) → analyze(100%)
```

- Thêm thanh progress bar mỏng (h-1) phía dưới title, màu theo mức độ hoàn thành
- Hiển thị label stage hiện tại bên cạnh priority badge (VD: "Đang tạo", "Chờ duyệt")

### 2. PipelineCard — Quality score badge
Pipeline có `overall_quality_score` (0-100) và `quality_scores`. Khi có quality score:
- Hiển thị badge điểm chất lượng (A/B/C/D/F) với màu tương ứng
- Vị trí: góc phải, cùng hàng với priority

### 3. PipelineCard — Trạng thái visual rõ ràng hơn
- **Completed** (`completed_at` có giá trị): Border-left xanh lá + icon ✓ nhỏ
- **Flagged** (đã có): Giữ nguyên ring đỏ + icon cảnh báo
- **Running** (chưa complete, chưa flag): Thêm subtle animate-pulse dot nhỏ
- **Approval pending**: Highlight vàng nhẹ cho card

### 4. PipelineStatsCards — Thêm mini progress
- Mỗi stat card thêm mini progress bar bên dưới giá trị (VD: tỷ lệ thành công có bar xanh)

### 5. AgentDetailCard — Thêm mini activity bar
- Khi `activePipelines > 0`: thêm 1 thanh progress nhỏ animate cho biết agent đang hoạt động

## File thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/agents/PipelineKanban.tsx` | Thêm progress bar, quality badge, stage label, trạng thái visual cho PipelineCard |
| `src/components/agents/PipelineStatsCards.tsx` | Thêm mini progress bar cho stat cards |
| `src/components/agents/AgentDetailCard.tsx` | Thêm activity indicator khi agent đang chạy |

