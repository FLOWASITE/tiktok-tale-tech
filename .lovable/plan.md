## Mục tiêu
Nâng cấp Brand Import lên "intelligence layer" thực sự — không chỉ scrape mà còn **suy luận chiến lược** (tone, USP, palette, multi-page context).

---

## 1. Auto-discover subpages (About / Contact / Service)

**Vấn đề:** Hiện `extraPaths` lấy từ client → user phải tự nhập. Footer + USP thường nằm ở `/about`, `/lien-he`, `/dich-vu` → bỏ lỡ context giàu nhất.

**File:** `supabase/functions/import-brand-from-website/index.ts`

- Sau khi scrape homepage, parse `home.html` để extract toàn bộ `<a href>` trong `<header>` và `<nav>`.
- Match keyword whitelist (case-insensitive): `about`, `gioi-thieu`, `gioi_thieu`, `ve-chung-toi`, `contact`, `lien-he`, `lienhe`, `service`, `dich-vu`, `san-pham`, `product`.
- Resolve absolute URL, dedupe, filter same-origin only, **cap 3 paths** (giữ chi phí Firecrawl thấp).
- **Merge** với `extraPaths` từ client (client paths thắng nếu trùng).
- Nếu auto-discover ra ≥1 path → emit `progress` event riêng `step: "discover_subpages"` (percent 15) hiển thị "Tìm thấy 3 trang phụ liên quan".

**Why:** Footer info + giá trị thương hiệu thường ở /about hơn homepage. Auto-discover loại bỏ ma sát "user phải biết URL nào".

---

## 2. Color palette đầy đủ (primary / secondary / accent)

**File:** `supabase/functions/import-brand-from-website/index.ts` — refactor `extractVisualSignals`.

Hiện chỉ trả `theme_color` (1 màu). Nâng lên `color_palette: { primary, secondary, accent, background?, text? }`.

**Nguồn dữ liệu (theo độ tin cậy giảm dần):**
1. **CSS custom properties trong `<style>` inline + `<link rel="stylesheet">` đầu tiên** — regex `--primary|--secondary|--accent|--brand-\w+|--color-\w+` trong các block `:root {}` hoặc `*`.
2. **Tailwind/Bootstrap theme classes** — heuristic scan `class=` chứa `bg-primary`, `bg-blue-600`… map sang Tailwind default palette (chỉ làm fallback).
3. **`<meta name="theme-color">` + `msapplication-TileColor`** → primary.
4. **Repeated inline colors** — đếm tần suất hex `#[0-9a-f]{6}` xuất hiện trong `style=` attributes; top 3 sau khi loại đen/trắng/xám (heuristic: max(R,G,B)-min(R,G,B) > 30) → suggest secondary/accent.

**Output shape (gắn vào `raw_meta`):**
```ts
color_palette: {
  primary: string | null,
  secondary: string | null,
  accent: string | null,
  source: 'css-vars' | 'meta' | 'frequency' | 'mixed',
  candidates: string[]  // top 6 hex để user pick thủ công nếu auto-pick sai
}
```

**Backwards compat:** giữ field `theme_color` = `color_palette.primary` để code cũ không vỡ.

---

## 3. AI tone & USP enrichment (đã có schema, chỉ cần boost prompt + UI)

**Status:** `BrandSuggestion` đã có `tone_of_voice`, `usps`, `content_pillars`, `target_audience`, `mission` (file `_shared/brand-extractor.ts`). Vấn đề thực tế: AI hiện chỉ thấy homepage markdown ngắn → suy luận yếu.

**Cải thiện 2 mặt:**

### 3a. Backend — feed AI nhiều context hơn
**File:** `supabase/functions/_shared/brand-extractor.ts`

- Thêm rules mới vào `SYSTEM_PROMPT`:
  - "tone_of_voice phải bám vào **bằng chứng cụ thể** (câu mở đầu, cách xưng hô, độ trang trọng) — không dùng cliché chung chung."
  - "usps phải **defensible** (con số, năm kinh nghiệm, chứng nhận, công nghệ độc quyền) — loại bỏ claim mơ hồ kiểu 'chất lượng cao'."
  - "mission: 1 câu súc tích trả lời 'why we exist', không phải slogan marketing."
- Tăng độ ưu tiên multi-page: kết hợp với #1, AI sẽ thấy homepage + 3 sub-pages → quality cải thiện đáng kể without prompt change nặng.

### 3b. Frontend — UI dialog show tone/USP rõ ràng hơn
**File:** `src/components/brand/BrandImportDialog.tsx`

- Render `tone_of_voice` thành **chip badges** (tag pills) thay vì text dài.
- Render `usps` thành **bulleted list** với dấu ✓ xanh.
- Group "Strategy" mới chứa: `tone_of_voice`, `usps`, `content_pillars`, `mission`, `target_audience` — collapse default, expand khi có data.
- Add badge "Cần review" nếu AI confidence thấp (proxy: < 3 items trong array).

---

## 4. Frontend hydrate

**File:** `src/pages/BrandCreate.tsx`

- Hydrate `color_palette` → set `secondaryColor`, `accentColor` state nếu form có (kiểm tra: nếu form chưa có 2 field này, mở rộng `BrandFormStepVisual.tsx` thêm 2 ColorPicker phụ — optional).
- Hydrate enrich fields: nếu `tone_of_voice.length > 0` → `setToneOfVoice(...)`; tương tự `usps` → `setUSPs(...)`, `mission` → `setMission(...)`, `target_audience` → fill `audienceAge/Gender/Locations`.

---

## 5. Scope rõ ràng

**In scope:**
- 1 file edge function `import-brand-from-website/index.ts` (auto-discover + palette).
- 1 shared `brand-extractor.ts` (prompt rules, không đổi schema).
- 2 frontend file: `BrandImportDialog.tsx`, `BrandCreate.tsx`.
- Optional: `BrandFormStepVisual.tsx` thêm secondary/accent picker.

**Out of scope:**
- Không scrape thêm sub-pages từ fanpage (FB Graph không expose).
- Không thêm field DB mới (palette nhét vào `raw_meta` JSONB hoặc `brand_template.color_palette` JSONB nếu đã có).
- Không đụng AI provider / cost layer.
- Không animate dialog.

---

## 6. Verify

1. `curl_edge_functions` POST `import-brand-from-website` `{ url: "https://taf.vn", stream: false }` → response chứa:
   - `raw_meta.discovered_subpages: string[]` (≥1)
   - `raw_meta.color_palette: { primary, secondary, accent, candidates }`
   - `tone_of_voice.length >= 3`, `usps.length >= 3`
2. UI `/brands/new` → Import → preview dialog hiển thị:
   - Group "Strategy" có chip tone + bullet USPs
   - Group "Visual" hiển thị 3 swatches (primary/secondary/accent) với candidates picker
3. Test website không có sub-pages rõ ràng (vd landing page 1 trang) → graceful fallback, không crash.
