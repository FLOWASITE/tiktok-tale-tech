

# Thêm Progress Tracker khi tạo Kịch bản Video

## Hiện trạng

Khi tạo kịch bản, user chỉ thấy:
- Nút bấm đổi text xoay vòng 4 dòng (`Đang phân tích chủ đề...` → `Đang tạo cấu trúc...` → ...) mỗi 2s
- Không có progress bar, không có skeleton, không feedback trực quan → cảm giác chờ lâu (~15-30s)

Backend (`generate-script`) hiện là **non-streaming** — `supabase.functions.invoke()` trả về kết quả 1 lần.

## Giải pháp: Smart Progress Overlay (không cần streaming backend)

Thay vì refactor backend sang SSE (phức tạp, rủi ro), tạo **progress overlay toàn form** với animated steps mô phỏng tiến trình thực tế, tương tự `ContentGeneratingSkeleton` đã có.

### Cụ thể

**1. Tạo `ScriptGenerationProgress.tsx`** — Component progress overlay
- Hiển thị khi `isLoading = true`, phủ lên form Step 2
- Progress bar chạy dần từ 0→95% với tốc độ thực tế
- 6 bước hiển thị tuần tự có icon + animation:
  1. `Khởi tạo...` (0-5%, 1s)
  2. `Phân tích chủ đề & brand` (5-20%, 3s)  
  3. `Tải dữ liệu ngành` (20-35%, 3s)
  4. `Xây dựng cấu trúc kịch bản` (35-55%, 4s)
  5. `AI đang viết nội dung` (55-85%, 12s) — step chính, chậm nhất
  6. `Đánh giá & hoàn thiện` (85-95%, 5s)
- Mỗi step: icon spin khi đang chạy, checkmark khi xong, fade cho step chưa tới
- Cap ở 95%, jump 100% khi thực sự complete
- Hiển thị thêm: tên chủ đề, loại video, thời lượng ở header
- Animated gradient background + skeleton preview phía dưới

**2. Tích hợp vào `ScriptFormStepper.tsx`**
- Khi `isLoading && currentStep === 2`: render `<ScriptGenerationProgress>` thay vì form content
- Giữ nguyên nút "Quay lại" (disabled) và nút submit (hiện loading text)
- Xóa `LOADING_PHASES` rotation cũ trên button, thay bằng step hiện tại từ progress component

**3. Tích hợp vào `ScriptNew.tsx`**
- Không cần thay đổi logic, chỉ UI level

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/script/ScriptGenerationProgress.tsx` | **Mới** — Progress overlay component |
| `src/components/script/ScriptFormStepper.tsx` | Hiển thị progress overlay khi loading |

## Kết quả

User sẽ thấy tiến trình chi tiết từng bước với animation mượt, giảm cảm giác chờ đợi đáng kể mà không cần thay đổi backend.

