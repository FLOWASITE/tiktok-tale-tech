

# Nâng cấp UI bước "Nội dung" — Premium & Professional

## Hiện trạng

Bước 1 hiện tại khá "flat": các section (Mục đích, Chủ đề, Ý tưởng, Hook) xếp chồng liên tục không có phân tách rõ ràng, label dùng icon + text đơn giản, textarea và cards thiếu chiều sâu visual.

## Thay đổi — 1 file: `src/components/script/ScriptFormStepper.tsx`

### 1. Bọc mỗi section trong Card với header sang trọng

Thay vì Label + content xếp liền, mỗi phần (Mục đích / Chủ đề / Hook) được bọc trong Card riêng với:
- Header có icon trong circle gradient, tiêu đề đậm, mô tả phụ mờ
- Đường viền tinh tế `border-border/40` + `bg-card/50 backdrop-blur-sm`
- Số thứ tự nhỏ (01, 02, 03) hiển thị dạng badge mờ ở góc

### 2. Nâng cấp ScriptPurposeSelector layout

Chuyển grid từ `grid-cols-2` sang layout compact hơn: chỉ hiện icon + label trên 1 hàng ngang (dạng pill/chip chọn), giảm chiếm không gian. Card mở rộng description chỉ cho item đang chọn.

### 3. Textarea chủ đề premium

- Thêm gradient border khi focus (`focus:border-transparent` + wrapper có `bg-gradient-to-r from-primary/50 to-accent/50 p-[1px] rounded-lg`)
- Placeholder text nhẹ hơn, font-size lớn hơn cho nội dung nhập (`text-base`)
- Character counter dạng progress bar mỏng ở bottom thay vì text số

### 4. Divider giữa các section

Thêm subtle divider giữa Purpose → Topic → Hook: dùng `<div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />` tạo hiệu ứng fade-in-out.

### 5. Hook section — collapsible elegant

Wrap Hook trong Collapsible mặc định đóng, với trigger dạng banner nhẹ:
```
⚡ Thêm Hook mở đầu (tùy chọn) — Thu hút 3 giây đầu tiên
```
Khi mở ra mới hiện HookStepContent. Giảm noise khi user chưa cần.

### 6. Bỏ header icon lớn + text "Tạo kịch bản AI" ở đầu form

Header hiện tại chiếm nhiều không gian (icon 56px + h2 + p). Loại bỏ hoàn toàn — StepIndicator đã đủ context. Tiết kiệm ~100px vertical space.

## Kết quả

- Mỗi section có visual boundary rõ ràng (card riêng)
- Gradient accents tạo cảm giác premium
- Hook ẩn mặc định giảm cognitive load
- Bỏ header thừa — form gọn hơn, pro hơn
- Tổng thể sang trọng theo chuẩn "Clean UI" của project

