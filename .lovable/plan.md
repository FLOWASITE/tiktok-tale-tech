## Vấn đề Step 0 (Brief campaign + AI mode)

1. **Thiếu ô Mô tả** — code có state `description` được dùng cho auto-pilot và AI gợi ý mục tiêu (`!name.trim() && !description.trim()` mới disable), nhưng UI **không có input nào để nhập** → nút Auto-pilot luôn chỉ dựa vào tên, AI suggestion nghèo context.
2. **Tên chiến dịch quá khiêm tốn** — Label `text-xs` + Input `text-sm` cao 40px, đứng một mình với placeholder ngắn → không có cảm giác đây là "brief" quan trọng nhất của cả wizard.
3. **Hai card AI giống hệt nhau** xếp chồng:
   - "🪄 Để AI lo hết" (border-primary gradient).
   - "Để AI chọn mục tiêu giúp tôi" (border-dashed primary, gradient).
   Cùng dùng primary gradient + icon Sparkles, người dùng khó phân biệt khác biệt giữa "AI làm hết" vs "AI chỉ gợi ý mục tiêu".
4. **Vi phạm core rule**:
   - Emoji 🪄 (core: dùng SVG icon không dùng emoji).
   - Gradient `from-primary/10 to-primary/5` đậm + `border-primary/30` (core: Soft Luxury, neutral gray accents).
5. **Hierarchy lộn xộn** — brief input nhỏ ở trên, AI cards to ở giữa, rồi xuống objectives. Mắt user không biết "tôi đang ở bước nào của bước 0".
6. **Không có hint chất lượng brief** — user gõ "Ra mắt sản phẩm" 3 chữ rồi bấm AI → kết quả tệ. Cần micro-coaching.
7. **Char count / state** — không cho thấy độ dài, không có nút "Xoá", không autoFocus.
8. **AI reasoning** in italic dưới toggle khá lạc lõng, không thuộc card nào rõ rệt.

## Mục tiêu

Bước 0 phải trông như một **"Brief sáng tạo"** rõ ràng: thông tin → cách AI hỗ trợ → kết quả gợi ý. Frontend-only, không đổi logic state hay edge function.

### A. Brief card (gộp tên + mô tả)
- Card lớn padding rộng (p-4 sm:p-5), border mảnh, không gradient.
- **Tên chiến dịch** — Input `h-11 text-base font-medium`, autoFocus, placeholder mạnh hơn ("VD: Ra mắt serum vitamin C tháng 4").
- **Mô tả ngắn** (Textarea, optional, 2-4 dòng) — mới thêm, bind vào `description` state hiện có. Placeholder gợi: "Mục tiêu chính, đối tượng, điểm khác biệt, ưu đãi…".
- Counter ký tự nhỏ (`{name.length}/80` cho tên, `{description.length}/400` cho mô tả).
- Hint dòng dưới (text-[11px] muted): "💡 Brief càng rõ → AI gợi ý càng đúng. Thử 2-3 câu ngắn." → dùng `Lightbulb` icon, **bỏ emoji**.
- Helper inline khi cả 2 đều trống: badge mờ "Cần brief để AI hoạt động".

### B. Gộp 2 AI card thành 1 "AI mode picker" (segmented radio-card)
```
┌─ Cách bạn muốn AI hỗ trợ ─────────────────┐
│ ◉ Trợ lý gợi ý từng bước  (mặc định)       │
│   AI gợi ý mục tiêu/kênh, bạn quyết định.  │
│                                            │
│ ○ AI tự chạy toàn bộ                       │
│   AI chọn mục tiêu + kênh + chiến lược.    │
│   Bạn chỉ review ở bước cuối.              │
│                                            │
│ [Khi chọn "Tự chạy"] [Bắt đầu AI tự chạy →]│
│ [Khi chọn "Trợ lý"] Toggle: Tự chọn mục tiêu│
└────────────────────────────────────────────┘
```
- 2 row radio-card style (border, hover bg-accent/40, selected: border-foreground/30 bg-accent/50 — neutral, không primary).
- Icon trái: `Sparkles` (AI gợi ý) vs `Wand2` (auto-pilot).
- Nút "AI tự chạy" chỉ hiện khi chọn option 2; disable + tooltip khi brief trống.
- Toggle "Để AI chọn mục tiêu giúp tôi" thuộc option 1, slide-in khi option 1 active (giảm clutter khi user chọn full auto).
- AI reasoning hiển thị **inside** option 1's expanded area (không float lơ lửng).

### C. Progress khi auto-pilot chạy
- Inline trong cùng card (không thay đổi logic), nhưng style lại checklist: dot 14px + label rõ, không lẫn với option khác.
- Disable cả picker khi đang chạy.

### D. Token & polish
- Bỏ `from-primary/10 to-primary/5`, `border-primary/30` → dùng `border-border`, `bg-accent/30` cho card phụ; chỉ accent foreground/primary trên element được chọn hoặc nút primary action.
- Bỏ emoji 🪄 → `Wand2`. Bỏ emoji 💡 → `Lightbulb`.
- Section spacing `space-y-5` thay vì `space-y-4` để thoáng hơn.
- Title section nhỏ trên brief card: `Brief chiến dịch` (text-[10px] uppercase tracking-wide muted) để báo hiệu đây là bước 1/4.

### E. Accessibility / state
- `autoFocus` ô Tên khi vào step 0.
- `aria-describedby` nối hint với input.
- Nút Auto-pilot disable kèm tooltip "Cần ít nhất tên hoặc mô tả".

## File thay đổi

**Edit (chỉ JSX + import icon)**
- `src/components/agents/GoalWizard.tsx`:
  - Replace block `step === 0` đoạn brief + 2 AI card (lines ~1066–1204) với layout mới: BriefCard + AIModePicker.
  - Thêm Textarea import (nếu chưa) + `Wand2`, `Lightbulb` từ `lucide-react`.
  - Thêm 1 state local `aiMode: 'assist' | 'auto'` (mặc định `'assist'`) để segmented control điều khiển hiển thị. Toggle `autoMode` + nút `runAutoPilot` giữ nguyên logic.

**Không đổi**
- Objective cards section (giữ nguyên bên dưới).
- Toàn bộ state khác, handlers, edge functions, validation `canProceed`.
- Stepper trên cùng wizard.

## Out of scope
- Không đổi flow auto-pilot.
- Không AI generate tên gợi ý (có thể làm sau bằng nút "Gợi ý tên" → 1 mutation mới).
- Không refactor các step 1/2/3.

## UX trước/sau (707px)
```
TRƯỚC                                 SAU
─────                                 ────
[Label] Tên chiến dịch *               BRIEF CHIẾN DỊCH
[Input  sm  ]                          ┌───────────────────────────┐
                                       │ Tên chiến dịch *          │
┌─🪄 Để AI lo hết ──────[AI tự chạy]─┐  │ [Input lớn   ]    0/80   │
│ AI tự chọn …                       │  │ Mô tả ngắn (tuỳ chọn)    │
└────────────────────────────────────┘  │ [Textarea 3 dòng] 0/400  │
                                       │ 💡 Brief rõ → AI tốt hơn │
┌─ Để AI chọn mục tiêu ──── [toggle]─┐  └───────────────────────────┘
│ AI sẽ phân tích…                   │
│ Đang phân tích…                    │  CÁCH AI HỖ TRỢ
│ AI reasoning…                      │  ┌───────────────────────────┐
└────────────────────────────────────┘  │ ◉ Trợ lý gợi ý từng bước │
                                       │   [Toggle: AI chọn mục tiêu]
                                       │   AI reasoning inline      │
                                       │ ○ AI tự chạy toàn bộ      │
                                       │   [Bắt đầu AI tự chạy →]  │
                                       └───────────────────────────┘
```
