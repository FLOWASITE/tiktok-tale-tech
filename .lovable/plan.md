

# Thay đổi hành vi chip quick-action: bỏ danh sách mở rộng, thay bằng loading + refresh gợi ý

## Vấn đề
Danh sách topic tĩnh (khoanh đỏ) khi click chip không có giá trị — user muốn thấy gợi ý AI mới liên quan đến category đã chọn, không phải danh sách cố định.

## Giải pháp

### Thay đổi trong `TopicIdeaHub.tsx`
1. **Xóa hoàn toàn** phần render danh sách mở rộng (`activeCategory`, `lastSelectedTopic`, `selectionTimerRef`, block `{activeCategory && ...}`).
2. **Thêm state `loadingCategory`** — lưu label chip đang loading (ví dụ `'Viral tuần này'`).
3. **Khi click chip**: set `loadingCategory = label`, gọi `onCategoryRefresh(label)` mới, hiện spinner nhỏ trên chip đang active.
4. **Khi `isLoading` chuyển từ true→false** (suggestions đã về): reset `loadingCategory = null`.
5. **Chip UI**: chip đang loading hiện `Loader2` animate-spin thay vì icon gốc, variant `default` để nổi bật.

### Thêm prop mới cho `TopicIdeaHub`
- `onCategoryRefresh?: (category: string) => void` — callback để parent biết user chọn category nào.

### Thay đổi trong `MultiChannelFormWizard.tsx` và `MultiChannelFormStepper.tsx`
- Truyền `onCategoryRefresh` vào `TopicIdeaHub`.
- Handler: map label chip → prompt context (ví dụ `'Viral tuần này'` → thêm context vào fetch suggestions).
- Cách đơn giản nhất: gọi `refreshSuggestions()` kèm toast/visual feedback. Suggestions API đã dùng `brandTemplateId` + `contentGoal` nên kết quả sẽ khác mỗi lần refresh.

### File sửa
- `src/components/topic/TopicIdeaHub.tsx`
- `src/components/multichannel/MultiChannelFormWizard.tsx`
- `src/components/multichannel/MultiChannelFormStepper.tsx`

