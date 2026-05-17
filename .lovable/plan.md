## Phát triển Search trong Function Configuration

Nâng cấp ô tìm kiếm tại `Admin → AI Management → Function Configuration` từ match chuỗi đơn giản (name/description/category) lên **smart search + advanced filters + highlight**.

### 1. Smart matching (fuzzy + diacritics + multi-field)

Tạo `src/lib/functionConfigSearch.ts` — tái sử dụng `normalizeVi` từ `src/lib/industrySearch.ts`, mở rộng cho AIFunction:

- **Trường tham gia matching** (mỗi trường có trọng số riêng):
  - `name` (vd `generate-script`) — weight 100
  - `description` (mô tả tiếng Việt) — weight 60
  - `category` slug + label hiển thị — weight 40
  - `currentModel` (vd `google/gemini-2.5-flash`) — weight 50
  - `modelOverride` (model admin đã set) — weight 50
  - `provider` suy ra từ model (lovable / openrouter / 9router / dashscope) — weight 30
  - `tags` (knowledge-graph, …) — weight 40
- **Scoring**: exact = 100, prefix = 60, substring = 40, token-level = 12, Levenshtein ≤2 cho token ≥4 ký tự = 6 (giống industrySearch).
- **Diacritics-insensitive** cho mọi trường: "kich ban" → match "generate-script" (mô tả "Tạo kịch bản…"), "ai gateway" → match được, v.v.
- Trả về `{ item, score, matchedFields, matchSpans }` để dùng cho highlight.

### 2. Advanced query operators

Parser nhẹ cho cú pháp `key:value` trước khi fuzzy match:

```
model:gpt-5            → lọc theo model id (contains)
provider:openrouter    → lọc theo provider
tag:knowledge-graph    → lọc theo tag
status:override        → có modelOverride
status:default         → không override
status:disabled        → isEnabled=false
category:seo           → lọc category slug
```

Các token còn lại (không có `:`) gộp lại làm free-text query đưa vào smart matcher. Hỗ trợ nhiều operator cùng lúc, AND logic.

### 3. Filter chips mới (ngoài Type filter cũ)

Thêm 1 dòng filter phụ ngay dưới ô search:

- **Status pills**: `Override` / `Default` / `Disabled` (toggle, multi-select OR trong cùng nhóm)
- **Provider pills**: `Lovable` / `OpenRouter` / `9Router` / `DashScope` (multi-select)
- **Category multi-select**: dropdown `Categories ▾` (popover + checkbox list từ `useCategoryConfig`); badge số đếm khi đã chọn
- Nút **Clear filters** xuất hiện khi có filter active

State được mã hoá vào URL search params (`?q=&status=override&provider=openrouter&cat=seo,content`) để share/bookmark.

### 4. Highlight + sort theo score

- `filteredFunctions` sort theo `score DESC` khi có query (giữ thứ tự category cũ khi rỗng).
- `FunctionCard` nhận thêm prop `highlightSpans?: { field, ranges }[]` để bọc `<mark>` quanh ký tự match trong `name` + `description`. Style `<mark>`: `bg-primary/15 text-primary rounded-sm px-0.5` (đúng Soft Luxury tokens).
- Khi query rỗng → không highlight, không sort lại.

### 5. UX nâng cao (responsive)

- Ô search full-width trên mobile (`< 640px`), max-w-sm trên desktop.
- Filter chips wrap nhiều dòng, scroll-x ngang trên mobile nếu cần (`overflow-x-auto`, `snap-x`).
- Debounce input 150ms (`useDeferredValue`) để không lag khi 100+ functions.
- Empty state riêng khi search không có kết quả: gợi ý "Thử bỏ filter X" + nút Clear.
- Hiển thị badge `N kết quả` cạnh số `total functions` ở header khi query active.

### 6. Files thay đổi

```
NEW   src/lib/functionConfigSearch.ts        ← parser + scorer + highlight spans
EDIT  src/components/admin/ai/AIFunctionConfig.tsx
        - thay block filter useMemo (lines 90-114)
        - thêm state: statusFilter[], providerFilter[], categoryFilter[]
        - thêm Filter chips row + Clear button
        - đổi search placeholder: "Tìm: tên, model, tag, status:override..."
EDIT  src/components/admin/ai/FunctionCard.tsx
        - nhận highlightSpans, render <mark> trong name/description
EDIT  src/components/admin/ai/FunctionCategoryGroup.tsx
        - pass highlightSpans xuống FunctionCard
```

Không đụng edge functions, không đụng DB, không thay đổi data model — thuần frontend UX.

### 7. Verify

- Search "kich ban" → ra `generate-script`, `generate-carousel`, … có description chứa "kịch bản".
- Search "gemini" → tất cả function dùng model Gemini, sort theo độ khớp.
- `model:gpt-5 status:override` → chỉ function override sang GPT-5.
- `provider:openrouter tag:knowledge-graph` → giao của 2 điều kiện.
- Toggle Status chip "Disabled" → đếm khớp `stats.disabled`.
- Responsive 707px viewport: search + chips không vỡ layout.
- Highlight: gõ "script" → chữ "script" trong tên function được tô.

Sau khi anh duyệt, em bắt tay vào implement.