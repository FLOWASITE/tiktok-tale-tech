

## Thêm nút Back thoát khỏi trình Tạo ảnh

### Vấn đề
Khi mở trình tạo ảnh (SimpleImageGenerator), ở màn hình setup không có nút Back rõ ràng để quay lại mockup. Chỉ có nút X nhỏ trên Dialog (desktop), còn trên mobile Drawer thì khó tìm cách thoát.

### Thay đổi

**File: `src/components/multichannel/SimpleImageGenerator.tsx`**

Sửa phần `headerContent` (dòng 453-466): thêm nút ArrowLeft cho chế độ `setup` để đóng trình tạo ảnh.

Hiện tại nút ArrowLeft chỉ hiển thị khi `viewMode !== 'setup'` (để quay về setup). Sẽ sửa thành:
- **setup mode**: ArrowLeft gọi `onOpenChange(false)` -- đóng dialog, quay lại mockup
- **streaming/preview mode**: ArrowLeft gọi `handleBackToSetup` -- quay về setup (giữ nguyên)

```tsx
const headerContent = (
  <div className="flex items-center gap-2">
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-7 w-7 -ml-1" 
      onClick={viewMode === 'setup' ? () => onOpenChange(false) : handleBackToSetup}
    >
      <ArrowLeft className="w-4 h-4" />
    </Button>
    <Sparkles className="w-5 h-5 text-primary" />
    {viewMode === 'setup' && 'Tạo ảnh AI'}
    {viewMode === 'streaming' && 'Đang tạo ảnh...'}
    {viewMode === 'preview' && 'Xem trước ảnh'}
  </div>
);
```

### Kết quả
- Nút Back luôn hiển thị trong header của trình tạo ảnh
- Ở setup: bấm Back = đóng và quay lại mockup
- Ở streaming/preview: bấm Back = quay về setup (giữ nguyên logic cũ)
- Hoạt động cả trên desktop (Dialog) lẫn mobile (Drawer)
