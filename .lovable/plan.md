

# Fix: ScrollArea không scroll được trong InlineModelPicker

## Nguyên nhân

`ScrollArea` (Radix) cần cả `max-h` trên container bao bọc nội dung. Hiện tại `max-h-[360px]` được đặt trên `ScrollArea` nhưng có thể Radix ScrollArea không xử lý tốt `max-h` — cần thêm `overflow-hidden` và đảm bảo chiều cao viewport hoạt động đúng.

Ngoài ra, `onKeyDown` trên search container div (line 260) có thể chặn wheel event hoặc gây conflict.

## Thay đổi

### `src/components/admin/ai/InlineModelPicker.tsx`

1. **Thay `ScrollArea` bằng native scroll div** — đơn giản và chắc chắn hoạt động:
   ```tsx
   // Thay:
   <ScrollArea className="max-h-[360px]">
   // Bằng:
   <div className="max-h-[360px] overflow-y-auto overscroll-contain">
   ```
   Radix ScrollArea đôi khi chặn mouse wheel khi popover overlay can thiệp. Native scroll div đáng tin cậy hơn trong popover context.

2. **Bỏ import `ScrollArea`** nếu không còn sử dụng.

| File | Thay đổi |
|------|----------|
| `src/components/admin/ai/InlineModelPicker.tsx` | Thay `ScrollArea` bằng native `overflow-y-auto` div |

