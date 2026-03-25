

# Progress bar động theo trạng thái thực tế của pipeline

## Vấn đề
Progress bar hiện tại dùng số cố định (`strategy=17%, create=33%`...) — không phản ánh thực tế pipeline đã hoàn thành bao nhiêu stage.

## Giải pháp
Tính progress dựa trên `pipeline_state.stages` — đếm số stage đã `completed` / tổng số stage:

```text
0/6 completed = 0%
1/6 completed = 17%  (strategy done)
3/6 completed = 50%  (strategy+create+quality done)
6/6 completed = 100%
```

Stage đang `in_progress` sẽ được tính thêm ~nửa bước (VD: 2 completed + 1 in_progress = 2.5/6 = 42%).

## Thay đổi

### `src/components/agents/PipelineKanban.tsx`
- Xóa `STAGE_PROGRESS` map cố định
- Thêm hàm `calculatePipelineProgress(pipeline)`:
  - Đọc `pipeline.pipeline_state.stages`
  - Đếm stages có `status === 'completed'` → mỗi stage = 1/6
  - Stage `in_progress` → cộng thêm 0.5/6
  - Pipeline có `completed_at` → luôn = 100%
- Cập nhật `PipelineCard` dùng progress tính được thay vì lookup cố định
- Hiển thị "3/6 bước" thay vì "50%" cho rõ nghĩa hơn

| File | Thay đổi |
|------|----------|
| `src/components/agents/PipelineKanban.tsx` | Thay progress cố định bằng tính toán từ `pipeline_state.stages` |

