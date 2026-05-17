## Vấn đề hiện tại của Content Schedule Studio

1. **Quá dày, chữ quá nhỏ** — text-[9px] đến text-[11px] khắp nơi, control h-5 (20px) → khó đọc, khó bấm, không đạt accessibility tap-target (44px khuyến nghị).
2. **List row 1 dòng nhồi 6 control** (date · time · channel · pillar · title · actions) → ở viewport 707px bị tràn/cắt: 56+64+96+60+title+2×20 = ~330px fixed, title chỉ còn ~340px nhưng padding+gap ăn thêm → title truncate sớm.
3. **Calendar view grid-cols-7 cố định** ở 707px → mỗi ô ~95px, chip text-[8px] vẫn truncate; trên mobile thực (≤640px) cực tệ.
4. **Màu pillar dùng raw Tailwind** (`bg-blue-500/10`, `text-violet-700`) — vi phạm design token rule (Soft Luxury neutral gray).
5. **Stats strip nghèo info** — chỉ "X bài · Y kênh · Z pillar" dạng text trần, không có visual distribution; cảnh báo overload chỉ là badge số.
6. **Header bar** — 3 icon-only button cạnh nhau (refresh/export/view toggle) không nhãn → khó hiểu intent.
7. **Actions opacity-0 → group-hover** không hoạt động trên touch (mobile 707px chính xác là touch range).
8. **Filter row** không cho biết đang filter gì (chỉ thấy Select); không hiển thị số kết quả sau filter.
9. **Empty/loading state** quá tối giản, không thông tin tiến trình.
10. **Không có drag-drop calendar** như spec gốc; chip click chỉ chuyển sang list view.

## Mục tiêu refactor (frontend-only, không đụng backend/data shape)

Áp dụng **Soft Luxury**: neutral gray, generous spacing, typography hierarchy rõ; readable trên 707px.

### A. Density & typography
- Bỏ text-[9/10/11px] → chuẩn về `text-xs` (12px) cho data dày, `text-sm` (14px) cho title, `text-[11px]` chỉ cho meta phụ.
- Control height: từ h-5 → h-7 (28px) cho inline; h-8 cho primary action.
- Padding row từ py-1 → py-2; gap 1.5 → gap-2.

### B. List row layout (responsive)
Đổi từ flex 1-dòng → **2-dòng card mỏng**:
```
Row:
  [pillar dot] Title (truncate)            [⋯ menu]
  Thu 12/3 · 19:30 · Facebook · educate
```
- Title dòng trên, rõ ràng, full width trừ menu button.
- Meta dòng dưới (date · time · channel · pillar) dưới dạng text inline, click vào meta → popover edit (1 popover gom date+time+channel+pillar thay vì 4 control luôn-hiện).
- Edit title: click title → inline edit.
- Actions (✨ rewrite, 🗑 delete, ⧉ duplicate): gộp vào DropdownMenu `⋯` (luôn hiện, không hover-only) → touch-friendly.
- Overload day → border-l-2 màu warning thay vì bg.

### C. Stats strip nâng cấp
- 3 mini card ngang đều nhau (Total · Channels · Pillars).
- Mỗi card có **mini stacked-bar 6px** thể hiện distribution (%) — màu neutral gray với accent.
- Cảnh báo overload thành dòng riêng dưới khi có vấn đề: "⚠ 2 ngày có >3 bài: 12/3, 18/3" (clickable → filter ngày đó).

### D. Header gọn
- Title "Lịch nội dung" + badge count giữ nguyên kích thước hợp lý (text-sm).
- View toggle (List/Calendar) chuyển sang segmented control rõ ràng có nhãn ngắn ("Danh sách" | "Lịch") trên ≥640px, icon-only khi <640px.
- Refresh/Export gộp vào 1 DropdownMenu "Hành động" với label, tránh icon-soup.

### E. Filter row
- Hiển thị "X / Y bài" số kết quả sau filter (vs total).
- Filter chips active hiển thị inline (e.g. badge "Kênh: Facebook ✕") thay vì chỉ Select.
- Nút "+ Thêm bài" tách thành primary action riêng (variant outline, không lẫn filter).

### F. Calendar view
- Trên ≤640px: tự động fallback về **list grouped theo ngày** (không grid 7 cột).
- Trên >640px: giữ grid 7 cột nhưng tăng min-h ô từ 60→80px, chip text từ [8px]→[11px], hiện tối đa 3 chip thay vì 2.
- Header thứ: "T2..CN" → "Th 2 ... CN" với border-b mảnh.
- Ngày ngoài range: bg neutral muted, không opacity-50 (đỡ trông "hỏng").
- Chip ngày: pillar dot + channel icon + title; click → popover edit nhanh tại chỗ (không chuyển view).

### G. Empty & loading state
- Loading: skeleton 5 row giả lập layout thật + thanh tiến trình text "AI đang phân bổ 24 bài qua 4 kênh…".
- Empty: icon lớn hơn + 2 CTA (Tạo bằng AI / Thêm thủ công).
- Error: hiển thị error message rõ + nút "Thử lại".

### H. Token & theme compliance
- Bỏ tất cả `bg-blue-500/10`, `text-violet-700`… → dùng tokens:
  - Pillar color = pillar **dot 8px** với HSL token mới (`--pillar-educate`, `--pillar-inspire`, `--pillar-sell`, `--pillar-entertain`) khai báo trong `index.css`.
  - Pillar badge dùng `bg-muted text-muted-foreground` + dot bên trái.
- Border, hover dùng `bg-accent/50`, `border-border`.

## File thay đổi

**Edit**
- `src/components/agents/ContentScheduleStudio.tsx` — refactor toàn bộ JSX theo A–G; tách render row thành sub-component nội bộ `<ScheduleRow>`; tách `<DayCell>` cho calendar; thêm hook `useMediaQuery('(min-width: 640px)')` để switch list/grid fallback.
- `src/index.css` — thêm 4 CSS variable `--pillar-*` (HSL neutral với hue nhẹ, không bão hòa) + util class `.pillar-dot`.
- `src/components/agents/GoalWizard.tsx` — chỉ chỉnh wrapper khoảng cách Step 4 nếu cần (max-h container, nền section) để studio mới có chỗ thở.

**Không đổi**
- Backend `generate-campaign-strategy`, hooks `usePreviewSchedule` / `useRewritePiece`, `scheduleExport.ts`, data shape `SchedulePiece`.

## Out of scope
- Drag-drop calendar (vẫn defer như spec gốc).
- AI rewrite bulk.
- Đổi luồng wiring trong GoalWizard.

## UX sau refactor (707px viewport)
```
┌───────────────────────────────────────────────┐
│ 📅 Lịch nội dung  [24 bài]   [Danh sách▾] [⋯]│
├───────────────────────────────────────────────┤
│ ┌──────┬──────┬──────┐                       │
│ │24 bài│4 kênh│3 pllr│                       │
│ │▇▇▇▇▇▇│▇▇▇░░│▇▇░░░│                        │
│ └──────┴──────┴──────┘                       │
│ ⚠ 2 ngày có >3 bài: 12/3, 18/3                │
├───────────────────────────────────────────────┤
│ Filter: [Mọi kênh▾][Mọi pillar▾][Mọi loại▾]  │
│ Hiện 24 / 24 bài            [+ Thêm bài]      │
├───────────────────────────────────────────────┤
│ Tuần 1 (1/3 – 7/3)                    6 bài  │
│ ┌─────────────────────────────────────────┐  │
│ │● Cách chăm da sau lăn kim         [⋯]   │  │
│ │  Th 2 1/3 · 19:30 · Facebook · educate  │  │
│ ├─────────────────────────────────────────┤  │
│ │● 5 lầm tưởng về botox            [⋯]   │  │
│ │  Th 4 3/3 · 20:00 · Instagram · inspire │  │
│ └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```
