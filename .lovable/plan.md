

## Thêm bộ lọc Mục tiêu nội dung (Content Goal) cho Kho chủ đề

### Hiện trạng
- Bảng `topic_history` **đã có** cột `content_goal` (education, awareness, engagement, expertise, conversion)
- Hook `useTopicHistory` **đã hỗ trợ** filter theo `contentGoal`
- UI Kho chủ đề hiện chỉ có 4 tab filter (Tất cả/Chưa dùng/Yêu thích/Đã tạo) và sort — **chưa có** filter theo Content Goal

### Thay đổi

**File: `src/components/TopicSuggestionPanel.tsx`**

1. **Thêm state** `historyGoalFilter` kiểu `ContentGoal | 'all'` (default `'all'`)
2. **Thêm hàng filter Content Goal** dưới tab filter hiện tại: 5 badge nhỏ (Giáo dục, Nhận diện, Tương tác, Xây chuyên gia, Chuyển đổi) + "Tất cả", dùng icon từ `CONTENT_GOALS`
3. **Apply filter** trong `filteredHistory` useMemo: khi `historyGoalFilter !== 'all'`, lọc thêm `item.contentGoal === historyGoalFilter`
4. **Reset page** khi goal filter thay đổi (thêm vào useEffect reset)
5. **Hiển thị badge Content Goal** trên mỗi topic item (list + grid view) để dễ nhận biết

### Chi tiết kỹ thuật
- Import `CONTENT_GOALS, ContentGoal` từ `@/types/multichannel`
- Badge style: `text-[10px]`, dùng icon 3x3, tương tự filter tabs hiện tại
- Hiện số lượng topic theo mỗi goal trong badge (vd: "Giáo dục (12)")

### Không thay đổi
- Database, hooks, các file khác

