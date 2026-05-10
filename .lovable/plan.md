## Mục tiêu
Khi user import brand từ Website / Fanpage, tự động trích xuất **logo** và **màu chủ đạo**, hiển thị trong dialog để chọn, và **lưu được vào brand template** khi Save.

## Vấn đề hiện tại
- Website import chỉ lấy `og_image`/`favicon` → nhét vào `raw_meta`, không có pipeline màu sắc.
- Fanpage chỉ có avatar fanpage (`picture`), không có màu.
- `BrandCreate.tsx` set `logoPreview` từ URL import nhưng `handleSubmit` chỉ persist khi có `logoFile` (File) hoặc `editingTemplate.logo_url` → **logo từ import bị mất khi nhấn Save**.
- `primary_color` không có ở bất kỳ bước nào của import pipeline.

## Thay đổi

**Backend — `import-brand-from-website/index.ts`**
- Đổi Firecrawl scrape format thành `["markdown", "html"]`.
- Thêm hàm `extractVisualSignals(html, baseUrl)`:
  - Logo: ưu tiên `<link rel="apple-touch-icon">` → `og:image` → `<link rel="icon">` → `/favicon.ico`. Resolve absolute URL.
  - Màu: `<meta name="theme-color">` → `msapplication-TileColor` → regex `--primary`/`--brand`/`--accent` trong `<style>` inline. Chuẩn hoá hex `#RRGGBB`.
- Trả về `raw_meta.logo_url` + `raw_meta.theme_color`.
- Emit SSE event mới `extract_visuals` (percent ~45) để hiển thị progress.

**Backend — `import-brand-from-fanpage/index.ts`**
- Map `picture.data.url` sang `raw_meta.logo_url` (giữ nguyên `raw_meta.picture` để backward compat).
- Không lấy màu từ FB Graph (không có metric đáng tin); để AI suy luận.

**Backend — `_shared/brand-extractor.ts`**
- Bổ sung field `primary_color_suggestion?: string` trong JSON schema AI trả về.
- Prompt: "Nếu nội dung có gợi ý màu sắc thương hiệu (ngành nghề, ngôn từ, mood), suy luận một hex color chủ đạo `#RRGGBB`. Nếu không chắc → để null."

**Frontend — `BrandImportDialog.tsx`**
- Thêm field `primary_color` vào `FIELD_DEFS` (group: Identity).
- Auto-select `logo_url` khi `raw_meta.logo_url || raw_meta.picture || raw_meta.og_image` có giá trị.
- Auto-select `primary_color` khi `raw_meta.theme_color || suggestion.primary_color_suggestion` có giá trị.
- `getValue('primary_color')` ưu tiên `theme_color` (thật) trước `primary_color_suggestion` (AI đoán); hiển thị swatch màu.
- `applySelectedFields` đẩy 2 giá trị vào `suggestion.logo_url` và `suggestion.primary_color` để BrandCreate hydrate.

**Frontend — `BrandImportProgressPanel.tsx`**
- Thêm step `extract_visuals` ("Trích xuất logo & màu chủ đạo") giữa scrape và AI.

**Frontend — `BrandCreate.tsx` (hydrate effect)**
- Đọc `s.primary_color || meta.theme_color` → `setPrimaryColor(...)`.
- Đọc `s.logo_url || meta.logo_url || meta.picture || meta.og_image` → `setLogoPreview(...)` **và** lưu vào ref/state mới `importedLogoUrlRef`.

**Frontend — `BrandCreate.tsx` (handleSubmit, ~line 346)**
- Bổ sung nhánh: nếu `!logoFile && !editingTemplate?.logo_url && importedLogoUrlRef.current` → `logoUrl = importedLogoUrlRef.current`. Lưu external URL trực tiếp vào DB (không re-upload, đã đủ để render mọi nơi đang dùng `<img src={logo_url}>`).

## Out of scope
- Re-host logo external sang Supabase Storage (giữ remote URL; có thể upgrade sau bằng job nền).
- Trích màu từ pixel ảnh logo (vibrant.js); chỉ dùng meta tag + AI suggestion.
- Multi-logo variants (light/dark/mono).
- Crawl deep brand guideline PDF.

## Verification
1. Import `https://flowa.one` → dialog hiển thị logo preview + color swatch. Apply → BrandCreate hydrate đúng → Save → list brand thấy logo + màu.
2. Import fanpage có avatar → logo hiện trong dialog, màu để AI suy luận (nếu có).
3. Import site không có theme-color và AI không đoán → field primary_color trống, user chọn thủ công như trước.
