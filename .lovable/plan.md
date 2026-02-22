
# Fix: Form tạo ảnh AI không tương tác được trên mobile

## Vấn đề

Dialog "Tạo ảnh AI" sử dụng Radix UI Dialog với `fixed` positioning + CSS transform. Trên mobile, touch events bị chặn bởi Dialog overlay hoặc bị xử lý sai, khiến các button/input bên trong không phản hồi khi chạm.

## Giải pháp

Áp dụng 2 thay đổi:

### 1. Chặn sự kiện đóng Dialog ngoài ý muốn trên mobile

Thêm `onPointerDownOutside` và `onInteractOutside` vào `DialogContent` trong `SimpleImageGenerator.tsx` để ngăn dialog đóng khi touch vào vùng nội dung (mobile đôi khi hiểu nhầm touch bên trong là "outside"):

```tsx
<DialogContent
  className={cn(...)}
  onPointerDownOutside={(e) => e.preventDefault()}
  onInteractOutside={(e) => e.preventDefault()}
>
```

### 2. Chuyển sang Drawer trên mobile (pattern đã có trong project)

Project đã có pattern dùng `Drawer` cho mobile (xem `MobileGenerationSheet.tsx`). Áp dụng tương tự: trên mobile (`useIsMobile()`), render nội dung form trong `Drawer` thay vì `Dialog`. Trên desktop giữ nguyên `Dialog`.

Cụ thể trong `SimpleImageGenerator.tsx`:
- Import `useIsMobile` hook
- Import `Drawer`, `DrawerContent`, `DrawerHeader`, `DrawerTitle` từ `@/components/ui/drawer`
- Khi `isMobile = true`: wrap nội dung trong `Drawer` + `DrawerContent` (max-h-[90vh], overflow-y-auto)
- Khi `isMobile = false`: giữ nguyên `Dialog` + `DialogContent` hiện tại
- Tách phần nội dung form ra thành biến `formContent` dùng chung cho cả 2 wrapper

## Chi tiết kỹ thuật

```text
SimpleImageGenerator
  |-- isMobile?
  |     YES --> Drawer + DrawerContent (touch-friendly, slide-up)
  |     NO  --> Dialog + DialogContent (centered modal)
  |
  |-- formContent (shared)
        |-- DialogHeader / DrawerHeader
        |-- ScrollArea with form fields
        |-- V3StylePreview
        |-- CTA Button
        |-- ImageAdvancedOptions
```

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/multichannel/SimpleImageGenerator.tsx` | Thêm `useIsMobile`, conditional render Drawer vs Dialog, thêm `onPointerDownOutside`/`onInteractOutside` cho Dialog |

Không cần tạo file mới. Chỉ sửa 1 file.
