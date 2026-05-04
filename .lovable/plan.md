## Mục tiêu
Card "Mục tiêu nội dung" ở Step 1 của Multi-channel Wizard hiện chiếm nhiều không gian (5 button to, mỗi cái có icon tròn + label, grid 2-3-5 cols, kèm header + description riêng). Mục tiêu: thu gọn để tiết kiệm chiều cao nhưng vẫn giữ được sự nổi bật khi user chưa chọn / đang chọn.

## Thay đổi

**File:** `src/components/multichannel/MultiChannelFormWizard.tsx` (lines ~1247-1287)

### Layout mới (compact chip row)
```text
┌──────────────────────────────────────────────────────────┐
│ 🎯 Mục tiêu  [● Awareness] [○ Engage] [○ Edu] [○ Conv]…  │
└──────────────────────────────────────────────────────────┘
```

- Gộp label "Mục tiêu nội dung" + 5 button vào **1 hàng flex-wrap** duy nhất.
- Bỏ description dài "Xác định mục tiêu giúp AI..." → chuyển thành tooltip `?` icon hoặc bỏ hẳn (đã có gợi ý ngầm qua selected state).
- Mỗi goal là **chip pill** nhỏ (`h-8 px-3 rounded-full`), icon `w-3.5 h-3.5` + text `text-xs`, không còn vòng tròn nền riêng.
- Selected chip: `bg-primary text-primary-foreground` (solid, contrast cao) — đảm bảo focus mạnh.
- Unselected: `bg-muted/40 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground`.

### Focus / nổi bật khi chưa chọn
- Khi `formData.contentGoal` rỗng/default: thêm subtle `ring-1 ring-primary/30 rounded-lg` quanh cả row + label "Mục tiêu" pulse nhẹ (`animate-pulse` trên Target icon) để nhắc user chú ý.
- Khi đã chọn: bỏ ring, chip selected solid primary là đủ để confirm.

### Responsive
- Mobile (<640px): chip row vẫn flex-wrap, mỗi chip giữ chiều cao 32px → fit 2-3 chip/dòng, tối đa 2 dòng (so với hiện tại 3 dòng grid).
- Desktop: 1 dòng duy nhất cùng label.

## Kỹ thuật
- Giữ nguyên logic `userManuallySetGoal.current = true` và `setFormData`.
- Giữ `GOAL_ICONS` map.
- Class chip dùng `cn()` conditional, không thêm dependency mới.
- Tổng giảm chiều cao card từ ~140px xuống ~48-56px (≈60% nhỏ hơn).

Không động chạm logic state, không đổi types, không ảnh hưởng các step khác.