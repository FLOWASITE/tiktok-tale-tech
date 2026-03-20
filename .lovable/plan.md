

# Nâng cấp UI "Góc tiếp cận" (TopicAngleSelector) — Premium Style

## Hiện trạng

TopicAngleSelector dùng grid cards với emoji icons, border-2, bg-muted/30 — trông "flat" và thiếu chiều sâu so với phần còn lại đã được nâng cấp premium.

## Thay đổi — 1 file: `src/components/script/TopicAngleSelector.tsx`

### 1. Chuyển từ grid cards sang horizontal pill/chip layout

Thay grid 5 cột (chiếm nhiều không gian) bằng `flex flex-wrap gap-2` — mỗi angle là một pill nhỏ gọn với icon + label, giống style ScriptPurposeSelector đã nâng cấp.

### 2. Premium visual treatment

- **Unselected**: `bg-card/60 backdrop-blur-sm border border-border/40` — tinh tế, không nặng nề
- **Selected**: `bg-primary/10 border-primary/60 shadow-sm` kèm subtle ring
- **Hover**: `hover:bg-accent/40 hover:border-primary/30` — transition mượt

### 3. Thay emoji icons bằng styled icon container

Thay emoji (🎓⚡🔥📊) bằng icon text nhỏ trong circle gradient nhẹ, hoặc giữ emoji nhưng trong container có background mờ — tạo visual consistency với các section 01, 02, 03 ở trên.

### 4. Label header upgrade

Thay label đơn giản (`Target icon + text`) bằng style đồng bộ: icon trong circle gradient nhỏ + text semibold + description phụ mờ, giống header các section khác.

### 5. Selected state: expand description

Khi chọn angle, hiển thị description dạng `AnimatePresence` motion div nhẹ bên dưới (giống ScriptPurposeSelector) thay vì hiển thị description truncated trên mỗi card.

### 6. Nút "Xóa lựa chọn" → icon X nhỏ trên pill selected

Thay text link "Xóa lựa chọn" bằng icon X nhỏ tích hợp trên pill đang chọn — gọn hơn, ít noise.

## Kết quả

- Góc tiếp cận chuyển từ grid cards nặng → horizontal pills gọn gàng
- Visual đồng bộ với ScriptPurposeSelector và các section card khác
- Tiết kiệm ~60% vertical space
- Animation mượt khi chọn/bỏ chọn

