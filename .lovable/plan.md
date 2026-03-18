
Mục tiêu: sửa 3 lỗi UX bạn mô tả trên màn `/multichannel/new`:
1) mở danh sách topic từ chip thì list gợi ý bên dưới bị “mất”,
2) phản hồi của chip chậm,
3) refine tự chạy không đúng ngữ cảnh.

## Nguyên nhân gốc (đã xác định từ code + network)
- `useTopicAI` đang **xóa `allSuggestions` ngay khi params đổi** rồi đợi debounce 2s mới gọi lại → tạo cảm giác “danh sách bên dưới mất đi”.
- Debounce fetch gợi ý đang để **2000ms** → cảm giác chậm.
- Chọn topic từ quick-action chip làm `topic` đủ dài, nên `useTopicRefinement` auto chạy ngay; đồng thời auto-detect goal có thể đổi `contentGoal`, kéo theo fetch gợi ý lại.
- `TopicSuggestionPanel` nhận `isLoading` từ `suggestLoading`, nhưng state này gần như không được set đúng vòng đời fetch, nên UI dễ rơi vào trạng thái trống thay vì loading rõ ràng.

## Kế hoạch triển khai

### 1) Giữ list gợi ý ổn định, không “biến mất”
**File:** `src/hooks/ai/useTopicAI.ts`
- Đổi chiến lược sang **stale-while-revalidate**:
  - Không clear `allSuggestions` ngay khi params đổi.
  - Giữ list cũ cho tới khi list mới về.
- Chuẩn hóa loading:
  - Set `suggestLoading` đúng khi initial load (khi chưa có data).
  - Dùng `suggestEnhancing` cho background refresh.
- Điều chỉnh debounce fetch gợi ý từ 2000ms xuống mức nhanh hơn (ví dụ 500–800ms) để giảm độ trễ cảm nhận.

### 2) Tách luồng chọn topic từ quick-action để tránh side-effect
**Files:** 
- `src/components/topic/TopicIdeaHub.tsx`
- `src/components/multichannel/MultiChannelFormWizard.tsx`
- (đồng bộ) `src/components/multichannel/MultiChannelFormStepper.tsx`

- Thêm callback phân biệt nguồn chọn topic (quick-action vs suggestion thường), ví dụ:
  - quick-action topic click → callback riêng.
- Trong Wizard/Stepper:
  - Track `topicSource` (`manual` | `quick_action` | `suggestion`).
  - Khi source = `quick_action`:
    - **không auto-trigger refine ngay**,
    - **không auto-detect contentGoal ngay** (tránh đổi goal ngoài ý muốn làm refetch list).
  - Khi user gõ tay vào textarea lại (`manual`) thì mới bật lại auto-detect/auto-refine như bình thường.

### 3) Tối ưu cảm giác “chip phản hồi chậm”
**File:** `src/components/topic/TopicIdeaHub.tsx`
- Giảm rerender nặng không cần thiết khi đổi `activeCategory`:
  - memo hóa phần render `TopicSuggestionPanel` hoặc tách thành subcomponent ổn định props.
- Giữ hiển thị danh sách category-topic ngay lập tức (UI local state), không phụ thuộc vòng fetch.

## Kiểm thử chấp nhận (E2E)
1. Vào `/multichannel/new`, mở “Ý tưởng chủ đề”.
2. Click `Theo trend` / `Mùa lễ hội` / `So sánh A vs B`:
   - danh sách topic của chip mở ngay,
   - list “Gợi ý chủ đề” phía dưới **không biến mất**.
3. Click một topic trong quick-action:
   - topic điền vào ô nhập ngay,
   - refine **không tự chạy ngay** khi chưa chỉnh sửa thêm.
4. Gõ tay chỉnh topic (>=10 ký tự):
   - refine chạy lại đúng lúc.
5. Đổi contentGoal thủ công:
   - list gợi ý không trắng trơn; giữ list cũ tới khi list mới về.

## Phạm vi file dự kiến sửa
- `src/hooks/ai/useTopicAI.ts`
- `src/components/topic/TopicIdeaHub.tsx`
- `src/components/multichannel/MultiChannelFormWizard.tsx`
- `src/components/multichannel/MultiChannelFormStepper.tsx` (đồng bộ hành vi)
