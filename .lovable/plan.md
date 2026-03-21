

# Di chuyển nút "Đăng ngay" & "Lịch đăng" lên trên

## Vấn đề
Hiện tại nút **"Lên lịch đăng bài"** và **"Đăng ngay"** nằm ở cuối nội dung kênh (dòng 1549-1572), user phải cuộn xuống dưới cùng mới thấy.

## Thay đổi

### File: `src/components/MultiChannelViewer.tsx`

1. **Xóa** block nút "Lên lịch đăng bài" + `DirectPublishButton` ở vị trí cuối (dòng 1549-1572)

2. **Thêm** block tương tự ngay **trên ScrollArea** (sau dòng 1291 — sau toolbar), dưới dạng một thanh action bar nhỏ gọn:

```
┌─────────────────────────────────┐
│ Toolbar: Sửa | Copy | Regenerate│
├─────────────────────────────────┤
│ [📅 Lên lịch đăng] [🚀 Đăng ngay]│  ← MỚI
├─────────────────────────────────┤
│ ScrollArea: Nội dung kênh...    │
└─────────────────────────────────┘
```

- Hiển thị khi **không đang edit** (cùng điều kiện với toolbar view mode)
- Style: `flex justify-end gap-2 px-2 py-1.5 border-b border-border/30`

## File thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/MultiChannelViewer.tsx` | Di chuyển 2 nút từ cuối lên trên ScrollArea |

