

## Bỏ nút "Tạo ảnh" ở mỗi kênh trong Mockup

### Thay đổi

**File: `src/components/MultiChannelViewer.tsx`**

Xóa nút ImagePlus trong phần action bar của từng kênh (khu vực hiển thị các nút Sửa, Copy, Tạo lại...).

Cụ thể, xóa đoạn code nút Tooltip + ImagePlus button ở khoảng dòng 1262-1269:
```tsx
// XÓA đoạn này:
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="outline" size="icon" onClick={() => { setActiveImageChannel(channel); setShowImageGenerator(true); }} ...>
      <ImagePlus className="w-4 h-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>{hasImage ? 'Tạo lại ảnh' : 'Tạo ảnh'}</TooltipContent>
</Tooltip>
```

### Giữ lại

- Nút **"Tạo ảnh AI"** trên thanh công cụ phía trên (batch, tạo cho tất cả kênh)
- Nút **RefreshCw** (tạo lại ảnh) hiển thị khi hover lên ảnh đã tạo -- vẫn giữ để người dùng có thể tạo lại ảnh cho từng kênh khi cần

### Kết quả

Giao diện mockup gọn hơn, chỉ còn 1 nút "Tạo ảnh AI" chính trên toolbar. Người dùng vẫn có thể tạo lại ảnh cho từng kênh bằng nút hover trên ảnh.

