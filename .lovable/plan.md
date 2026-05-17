## Vấn đề hiện tại của Step 0

1. **Hai radio-card to bằng nhau** trong khi "AI tự chạy" đã là mặc định → người dùng không thấy rõ đâu là hành động chính.
2. **CTA "Bắt đầu AI tự chạy" bị chôn** bên trong radio card (size sm, không nổi bật).
3. **Khi đã chọn Auto, phía dưới vẫn show full grid 6 Objective + KPI inputs** — mâu thuẫn với thông điệp "AI tự chọn giúp bạn", gây rối.
4. **Name + Description trong cùng card** nhưng cả hai đều có header "Bước 1/4" + counter — quá nhiều chữ phụ cho một form 2 field.
5. Trên viewport hẹp (~707px) hai radio-card stack dọc dài lê thê, cảm giác trùng lặp.

## Đề xuất layout mới (chỉ JSX, không động state/handler)

```text
┌─ Brief chiến dịch ─────────────────────────────┐
│ [ Tên chiến dịch * ............ ]   12/80      │
│ [ Mô tả ngắn (tuỳ chọn) ............ ] 0/400   │
│ 💡 Brief càng rõ → AI làm càng đúng            │
└────────────────────────────────────────────────┘

┌─ Cách triển khai ──────────────────────────────┐
│  ◉ AI tự chạy toàn bộ        ┃ ○ Tự chọn từng  │
│    AI lo objective+kênh+ kế   ┃   bước (assist)│
│    hoạch. Bạn duyệt cuối.     ┃                │
│  ───────────────────────────────────────────── │
│  (Auto)  [▶ Bắt đầu AI tự chạy]  ← CTA lớn     │
│          ✓ Phân tích mục tiêu                  │
│          ⟳ Chọn kênh phù hợp                   │
│          ○ Lên chiến lược                      │
│                                                │
│  (Assist) [Switch] Để AI chọn mục tiêu giúp tôi│
└────────────────────────────────────────────────┘

(Chỉ khi aiMode === 'assist'):
┌─ Mục tiêu chiến dịch (1/3) ────────────────────┐
│ [grid 6 objective cards]                        │
└────────────────────────────────────────────────┘
┌─ KPI (tuỳ chọn) ───────────────────────────────┐
└────────────────────────────────────────────────┘
```

### Chi tiết thay đổi

**A. Brief card** — giữ nguyên cấu trúc, bỏ dòng "Bước 1/4" + label "Brief chiến dịch" (header thừa khi đã có Stepper bên ngoài). Đổi label section thành chip nhỏ inline.

**B. Mode picker → segmented control 2 cột** (thay vì 2 card stack):
- Layout `grid grid-cols-2 gap-2` (responsive: dưới 380px stack lại).
- Mỗi cell cao đồng nhất ~80px: radio dot + icon + tiêu đề + 1 dòng mô tả ngắn (cắt còn ~50 ký tự).
- Bỏ nhãn "(mặc định)" — selected state đã thể hiện rõ.

**C. Action zone (dưới picker, full-width, bên trong cùng section)**:
- Khi `aiMode === 'auto'`:
  - Button **size="lg"** `h-11 w-full` — `[▶ Bắt đầu AI tự chạy]` (primary, full width, không bị stop-propagation hack vì không còn nằm trong button cha).
  - Disabled tooltip giữ nguyên.
  - Checklist 3 bước hiện ngay dưới button khi `autoPilotRunning`.
- Khi `aiMode === 'assist'`:
  - Row: `Switch` + label "Để AI chọn mục tiêu giúp tôi" (logic giữ nguyên, chỉ move ra khỏi card cha).
  - AI reasoning box (nếu có) hiện inline.

**D. Conditional rendering objectives/KPI**:
- Wrap khối "Mục tiêu chiến dịch" + KPI bằng `{aiMode === 'assist' && (...)}`.
- Khi auto: ẩn hoàn toàn → màn hình ngắn lại ~60%, focus vào CTA.
- Khi auto-pilot hoàn tất và chuyển sang step 1, objectives đã được fill sẵn nên không mất data.

**E. Bỏ nested `<button>` problem**: Hiện CTA `<Button>` đang nằm trong `<button>` radio-card (HTML invalid). Layout mới tách CTA ra ngoài radio cells → sạch markup.

**F. Polish nhỏ**:
- Section spacing `space-y-4` (giảm từ `space-y-5`).
- Icon size đồng bộ `w-4 h-4` cho cả hai mode.
- Badge "Cần brief để bật AI" → đổi thành inline-hint dưới CTA disabled.

## File chỉnh sửa

- `src/components/agents/GoalWizard.tsx` — chỉ refactor JSX trong block `step === 0` (line ~1068-1442 cho phần brief + mode + objectives wrapper). Không thay state, handler, edge function, hoặc business logic.

## Out of scope

- Không đổi flow auto-pilot.
- Không đổi logic `suggestObjectives` / `runAutoPilot`.
- Không đụng Step 1/2/3.
- Không thêm icon/animation mới ngoài lucide đã import.
