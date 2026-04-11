

# Thiết kế lại UI chọn Model — Giảm thao tác, tăng hiệu quả

## Vấn đề hiện tại

Hiện tại để đổi model cho 1 function cần **3-5 bước**:
1. Click vào Settings icon trên FunctionCard → Mở Edit Dialog
2. Ở tab "Model", chọn Quick Preset hoặc click "Chọn model khác..."
3. Mở thêm ModelSelector Dialog (dialog chồng dialog)
4. Lọc provider → Tìm model → Click chọn
5. Quay lại Edit Dialog → Click "Lưu cấu hình"

Ngoài ra, **dropdown quick select** trên FunctionCard (compact mode) có danh sách model **hardcoded riêng** (POYO_MODELS, KIE_MODELS, OPENROUTER_TEXT_MODELS) — không đồng bộ với ModelSelector, gây nhầm lẫn.

## Giải pháp: Inline Model Selector + Unified Dropdown

### Nguyên tắc
- **1 click để mở** danh sách model đầy đủ
- **1 click để chọn** model → tự động lưu ngay (không cần dialog + nút Save)
- **Loại bỏ dialog chồng dialog** — ModelSelector mở trực tiếp từ FunctionCard
- **Unified model list** — 1 nguồn dữ liệu duy nhất cho cả dropdown và full selector

### Thay đổi chi tiết

#### 1. FunctionCard: Nâng cấp Dropdown thành "Smart Model Picker"
**File**: `src/components/admin/ai/FunctionCard.tsx`

- Thay DropdownMenu bằng **Popover** rộng hơn (~320px), có:
  - Search input inline
  - 3 tab nhỏ: Presets | Tất cả | Provider
  - Tab "Presets": giữ 3-5 quick presets (Mặc định / Nhanh / Chất lượng)
  - Tab "Tất cả": render model cards nhỏ gọn, nhóm theo provider, scroll trong popover
  - Tab "Provider": filter theo provider (Lovable, PoYo, KIE, GeminiGen, DashScope, OpenRouter)
- Click chọn model → **lưu ngay** via `onQuickModelChange` (đã có sẵn, không cần Save button)
- Xóa bỏ các danh sách hardcoded trùng lặp (KIE_MODELS, POYO_MODELS, OPENROUTER_TEXT_MODELS) — thay bằng đọc từ `MODELS_BY_TYPE` + `MODELS_BY_PROVIDER`

#### 2. AIFunctionConfig Edit Dialog: Đơn giản hóa tab Model
**File**: `src/components/admin/ai/AIFunctionConfig.tsx`

- Tab "Model" trong Edit Dialog: bỏ Quick Presets + nút "Chọn model khác..." (vì đã có Smart Picker trên card)
- Giữ lại chỉ: Current model display + Reset button + Force OpenRouter toggle
- Edit Dialog tập trung vào Parameters, Cache & Priority — những thứ ít thay đổi

#### 3. ModelSelector Dialog: Giữ nhưng chỉ dùng cho Group Defaults
**File**: `src/components/admin/ai/ModelSelector.tsx`

- Không xóa, vẫn dùng cho `GroupDefaultsPanel` và `AIChannelModelConfig`
- Không thay đổi gì

#### 4. Tạo component mới: InlineModelPicker
**File mới**: `src/components/admin/ai/InlineModelPicker.tsx`

- Popover-based component, nhận props: `functionType`, `selectedModel`, `onSelect`, `hasOpenRouterApiKey`
- Reuse logic filter từ ModelSelector (import `MODELS_BY_TYPE`, `getModelInfo`, etc.)
- Render compact ModelCard (chỉ icon + tên + provider dot)
- Kích thước: 320px width, max 400px height, scrollable

```text
┌──────────────────────────────────┐
│ 🔍 Tìm model...                 │
├──────────────────────────────────┤
│ [Presets] [Tất cả] [Provider ▾] │
├──────────────────────────────────┤
│ ⭐ Mặc định                    ✓│
│ ⚡ Nhanh — gemini-2.5-flash     │
│ 🏆 Chất lượng — gemini-3-pro   │
│ ────────────────────────────     │
│ 🐱 PoYo.ai                      │
│   Nano Banana Pro                │
│   GPT-4o Image                   │
│ 🔮 KIE.ai                       │
│   Flux Kontext Pro               │
│ 💎 GeminiGen.ai                  │
│   Nano Banana Pro                │
│   Imagen 4                       │
│ ☁️ DashScope                     │
│   Qwen Plus                      │
└──────────────────────────────────┘
```

## Tóm tắt thay đổi

| File | Hành động |
|------|-----------|
| `src/components/admin/ai/InlineModelPicker.tsx` | Tạo mới — Popover model picker |
| `src/components/admin/ai/FunctionCard.tsx` | Thay DropdownMenu bằng InlineModelPicker, xóa hardcoded lists |
| `src/components/admin/ai/AIFunctionConfig.tsx` | Đơn giản hóa tab Model (bỏ Quick Presets, bỏ nested ModelSelector) |
| `src/components/admin/ai/ModelSelector.tsx` | Không đổi |

## Kết quả

- **Trước**: 3-5 clicks, 2 dialog chồng nhau, 2 nguồn dữ liệu model khác nhau
- **Sau**: **1 click mở picker → 1 click chọn → tự động lưu**. Một nguồn dữ liệu duy nhất.

