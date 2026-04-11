

# Hoàn thiện InlineModelPicker — Sửa UI/UX còn thiếu

## Vấn đề nhìn từ screenshot

1. **"Mặc định" row quá nổi bật** — nền hồng/đỏ đậm, chiếm không gian lớn ở đầu danh sách "Tất cả"
2. **Selected state (Gemini 2.5 Flash) dùng checkmark nhỏ** — khó nhận biết, không có highlight row
3. **Speed icons (Clock/Zap) quá nhỏ** — chỉ 12px, khó phân biệt giữa fast/medium/slow
4. **Thiếu model description** trong tab "Tất cả" — chỉ hiện tên model, thiếu context
5. **Provider filter chips** — "All" badge quá nhỏ, khó click
6. **Card compact mode** — thiếu tooltip cho model info khi tên bị truncate
7. **Edit Dialog tab Model** — vẫn hiện nhưng gần như trống, chỉ có read-only info + Reset

## Thay đổi

### 1. `InlineModelPicker.tsx`

**"Mặc định" row:**
- Thu nhỏ thành 1 row bình thường (giống các model khác), bỏ highlight block lớn
- Dùng `bg-accent` nhẹ thay vì `bg-primary/10` khi selected

**Selected state:**
- Thêm `bg-accent/80` cho row đang selected + left border accent (`border-l-2 border-primary`)
- Bỏ dùng `bg-primary/10` (hiện ra màu hồng) → dùng `bg-accent` + `border-l-primary`

**Model rows trong tab "Tất cả":**
- Thêm 1 dòng description nhỏ (text-[10px]) dưới tên model — lấy từ `ModelInfo.description`
- Speed icon: tăng lên 14px, thêm title tooltip
- Cost badge: giữ nguyên

**Provider filter chips:**
- Tăng padding, thêm hover effect rõ hơn
- Active chip: dùng solid background thay vì outline

**Presets tab:**
- "Nhanh" preset đang selected có checkmark — OK
- Thêm model ID nhỏ dưới description để biết đang map model nào

### 2. `FunctionCard.tsx`

**Compact card:**
- Bỏ nền hồng cho "Nhanh" button khi đang override — dùng outline + dot color thay thế
- Thêm title attribute cho truncated model name

**Expanded card:**
- Model section: giảm padding, gộp chặt hơn

### 3. `AIFunctionConfig.tsx`

- Gộp tab "Model" và "Cache & Priority" thành 1 tab "Settings"
- Bỏ tab Model riêng (vì đã có picker trên card)
- Dialog chỉ còn 2 tabs: "Parameters" (cho text functions) và "Settings" (cache, priority, force provider)

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/admin/ai/InlineModelPicker.tsx` | Fix selected state colors, thêm description row, cải thiện filter chips |
| `src/components/admin/ai/FunctionCard.tsx` | Fix button highlight color, thêm tooltips |
| `src/components/admin/ai/AIFunctionConfig.tsx` | Gộp tabs, đơn giản hóa dialog |

