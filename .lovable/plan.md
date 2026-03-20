

# Fix Tooltip bị che — TopicAngleSelector

## Nguyên nhân

Section 02 ("Chủ đề") có `overflow-hidden` (dòng 335 trong `ScriptFormStepper.tsx`), khiến tooltip của Góc tiếp cận bị cắt vì tooltip render bên trong container này.

Radix Tooltip dùng Portal mặc định nên `z-index` không phải vấn đề — nhưng nếu Portal bị disable hoặc container có `overflow-hidden` kết hợp với stacking context thì tooltip vẫn có thể bị ảnh hưởng.

## Giải pháp

### 1. `ScriptFormStepper.tsx` — Bỏ `overflow-hidden` ở Section 02

Thay `overflow-hidden` bằng `overflow-visible` trên card Section 02 (dòng 335). Header border-radius vẫn giữ nguyên nhờ border-radius của parent.

### 2. `TopicAngleSelector.tsx` — Đảm bảo Tooltip dùng Portal

Thêm thuộc tính `portal` cho `TooltipContent` (mặc định Radix đã portal, nhưng sẽ verify). Giữ `z-[100]` và thêm `sideOffset={8}` để tooltip không bị dính sát vào button.

## Kết quả
- Tooltip hiển thị đầy đủ, không bị cắt bởi container
- Layout Section 02 không thay đổi visual

