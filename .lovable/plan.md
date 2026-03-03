
## Fix: Reset trạng thái view khi mở lại MultiChannelViewer

### Vấn đề
Khi xem nội dung, chuyển sang Lịch đăng bài hoặc Gallery, rồi đóng dialog, lần mở lại tiếp theo vẫn giữ nguyên màn hình cũ (Gallery/Schedule) thay vì quay về Mockup mặc định.

### Nguyên nhân
Các state `showGallery`, `showSchedule`, `showTeamPanel` không được reset khi dialog đóng. React giữ nguyên state vì component không bị unmount.

### Giải pháp
Thêm `useEffect` theo dõi prop `open` -- khi dialog mở (`open` chuyển thành `true`), reset tất cả panel state về mặc định (Mockup view).

### Chi tiết kỹ thuật

**File: `src/components/MultiChannelViewer.tsx`**

Thêm useEffect sau các khai báo state (khoảng sau line 285):

```typescript
// Reset panel states when dialog opens to always start at mockup view
useEffect(() => {
  if (open) {
    setShowGallery(false);
    setShowSchedule(false);
    setShowTeamPanel(false);
  }
}, [open]);
```

Chỉ sửa 1 file, thêm 7 dòng code.
