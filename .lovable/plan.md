

# Nâng cấp UI/UX Step 2 "Cấu hình" — Premium & Professional

## Hiện trạng

Step 2 (Cấu hình) gồm 5 section xếp lỏng lẻo với `Label` đơn giản, không có container card, thiếu đồng bộ visual với Step 1 đã được premium hóa (gradient header, số thứ tự, backdrop-blur).

Các section hiện tại:
1. Hook badge (nếu có)
2. Thời lượng video — grid 4 cards
3. Thể loại video — Accordion + grid cards  
4. Nhân vật — Accordion + pills
5. Giọng vùng miền — grid 3 cards
6. Phong cách hội thoại — grid 2 cards
7. Nút "Cài đặt nâng cao"

## Thay đổi

### 1. `ScriptFormStepper.tsx` — Bọc mỗi section trong card premium

Thay các `Label` + component rời rạc bằng card container đồng bộ Step 1:

```text
┌─────────────────────────────────────────┐
│ [icon gradient] Thời lượng video    04  │
│ ───────────────────────────────────────  │
│   [60s] [90s] [120s] [180s]             │
└─────────────────────────────────────────┘
     gradient divider
┌─────────────────────────────────────────┐
│ [icon gradient] Thể loại video      05  │
│ ───────────────────────────────────────  │
│   [Accordion content]                   │
└─────────────────────────────────────────┘
     gradient divider
┌─────────────────────────────────────────┐
│ [icon gradient] Nhân vật            06  │
│ ───────────────────────────────────────  │
│   [Accordion content]                   │
└─────────────────────────────────────────┘
     gradient divider
┌─────────────────────────────────────────┐
│ [icon gradient] Giọng & Hội thoại   07  │
│ ───────────────────────────────────────  │
│   [Voice pills]  |  [Dialogue pills]   │
└─────────────────────────────────────────┘
```

Mỗi card có:
- Header: icon gradient square (8x8) + title semibold + subtitle muted + số thứ tự mờ
- Border: `border-border/40`, bg: `bg-card/50 backdrop-blur-sm`
- Giữa các card: `h-px bg-gradient-to-r from-transparent via-border to-transparent`

### 2. Gom "Giọng vùng miền" + "Phong cách hội thoại" thành 1 section

Hai section nhỏ này gom vào 1 card "Giọng & Phong cách" để giảm noise. Bên trong chia 2 sub-section bằng divider nhẹ.

### 3. `VoiceRegionSelector.tsx` — Chuyển sang pill/chip layout

Thay grid 3 cards nặng bằng horizontal pills gọn (giống TopicAngleSelector):
- Unselected: `bg-card/80 border-border/60` pill
- Selected: `bg-primary text-primary-foreground shadow-md` pill
- Giữ emoji icon + label
- Bỏ Label header (header đã có ở card wrapper)

### 4. `DialogueStyleSelector.tsx` — Chuyển sang pill/chip layout

Tương tự VoiceRegion, thay grid 2x2 cards bằng horizontal pills:
- Emoji + label trên mỗi pill
- Selected state đồng bộ primary color
- Bỏ Label header riêng

### 5. `DurationSelector.tsx` — Tinh chỉnh visual

Giữ grid 4 cards nhưng đổi `border-2` → `border`, bỏ gradient overlay nặng, thay bằng style nhẹ hơn đồng bộ:
- Unselected: `border-border/50 bg-card/60`
- Selected: `border-primary bg-primary/5 shadow-sm`
- Bỏ checkmark circle (không cần vì visual đã rõ)
- Bỏ Label header riêng

### 6. Nút "Cài đặt nâng cao" → Premium toggle

Thay Button ghost đơn giản bằng styled collapsible trigger nhẹ, đồng bộ visual.

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `ScriptFormStepper.tsx` | Bọc Step 2 sections trong premium cards với gradient headers |
| `DurationSelector.tsx` | Tinh chỉnh border/bg, bỏ checkmark circle |
| `VoiceRegionSelector.tsx` | Chuyển grid cards → horizontal pills, bỏ Label header |
| `DialogueStyleSelector.tsx` | Chuyển grid cards → horizontal pills, bỏ Label header |

## Kết quả

- Step 2 đồng bộ 100% visual language với Step 1
- Giảm vertical space ~30% nhờ gom section + pill layout
- Trải nghiệm premium xuyên suốt flow tạo kịch bản

