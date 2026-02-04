
# Kế hoạch: Sửa lỗi Text không hiển thị trên ảnh Social Graphics

## Phân tích vấn đề

### Logs phát hiện
```
2026-02-04T08:29:44Z INFO [generate-brand-image] Image content type: with_text
```
**Nhưng KHÔNG có log:**
```
[generate-brand-image] Text to include: "..."
```

Điều này nghĩa là backend nhận được `imageContentType: 'with_text'` nhưng `textToInclude` là **undefined hoặc empty string**.

### Nguyên nhân gốc

Khi user chọn chế độ "Ảnh có text" (Social Graphics) nhưng **chưa nhập text vào ô textarea**, frontend vẫn gửi `imageContentType: 'with_text'` kèm `textToInclude: ''` (empty string).

Backend xử lý:
```typescript
// Dòng 628 trong image-prompt-builder.ts
const isWithText = imageContentType === 'with_text' && textToInclude;
```

Vì `textToInclude` là empty string (falsy), nên `isWithText = false` → prompt builder **không thêm section text vào prompt**.

## Giải pháp

### 1. Thêm validation trước khi generate

Khi user chọn "Ảnh có text" nhưng chưa nhập text:
- Hiển thị cảnh báo toast
- Không cho phép generate
- Hoặc auto-fill từ hook message

### 2. Auto-fill text từ Hook khi bật chế độ Social Graphics

Khi user chuyển từ "Ảnh nền" sang "Có text", tự động điền text từ hook message nếu có.

### 3. Thêm visual indicator yêu cầu nhập text

Khi textarea trống và đang ở chế độ "Có text":
- Hiển thị border đỏ
- Placeholder rõ ràng hơn

## Chi tiết thay đổi

### File: `src/components/multichannel/UnifiedImageGenerator.tsx`

#### Thay đổi 1: Auto-fill text khi chuyển sang chế độ Social Graphics
```typescript
// Khi setImageContentType('with_text'), tự động điền hook nếu textToInclude rỗng
const handleImageContentTypeChange = (type: ImageContentType) => {
  setImageContentType(type);
  if (type === 'with_text' && !textToInclude) {
    // Auto-fill từ hook
    const hookData = getHookForChannel(content, mode === 'single' ? singleChannel : selectedChannels[0]);
    if (hookData.hookMessage) {
      setTextToInclude(hookData.hookMessage);
      toast.info('Đã tự động điền text từ Hook. Bạn có thể chỉnh sửa.');
    }
  }
};
```

#### Thay đổi 2: Validation trước khi generate
```typescript
// Trong handleSingleGenerate và handleBatchGenerate
if (imageContentType === 'with_text' && !textToInclude.trim()) {
  toast.error('Vui lòng nhập text để hiển thị trên ảnh');
  return;
}
```

#### Thay đổi 3: Visual indicator khi chưa nhập text
```typescript
<Textarea
  className={cn(
    "resize-none text-xs",
    imageContentType === 'with_text' && !textToInclude.trim() 
      && "border-orange-500 focus:border-orange-500"
  )}
  // ...
/>
{imageContentType === 'with_text' && !textToInclude.trim() && (
  <p className="text-xs text-orange-600">⚠️ Vui lòng nhập text để hiển thị trên ảnh</p>
)}
```

## Kiểm tra bổ sung

Cũng cần kiểm tra:
1. Batch mode với `useSharedText = false`: đảm bảo `textsPerChannel` không rỗng
2. Gửi log chi tiết hơn từ frontend để debug

## Lợi ích

1. **Ngăn user tạo ảnh "Có text" mà không có text** - Hiển thị lỗi rõ ràng
2. **UX tốt hơn** - Auto-fill từ hook giúp user không cần copy/paste
3. **Visual feedback** - Người dùng biết cần nhập text
