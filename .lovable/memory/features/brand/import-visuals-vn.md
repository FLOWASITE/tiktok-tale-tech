---
name: Brand Import Visuals
description: Logo + primary color extraction từ website/fanpage import
type: feature
---

## Pipeline trích xuất logo + màu chủ đạo khi Import Brand

### Backend
- `import-brand-from-website` scrape Firecrawl với formats `["markdown", "rawHtml"]`. Khi có rawHtml → `onlyMainContent=false` để giữ `<head>`.
- `extractVisualSignals(html, baseUrl)` trong cùng file:
  - Logo priority: `apple-touch-icon` → `og:image` → `<link rel="icon">` → `/favicon.ico` (resolve absolute).
  - Color priority: `meta[name=theme-color]` → `msapplication-TileColor` → CSS var `--primary`/`--brand`/`--accent` trong inline `<style>`. Normalize sang `#rrggbb` lowercase.
- Emit SSE event `extract_visuals` (percent 20).
- Trả `raw_meta.logo_url` + `raw_meta.theme_color`.
- `import-brand-from-fanpage` map `picture.data.url` → `raw_meta.logo_url`, `theme_color = null` (FB không expose).
- `_shared/brand-extractor.ts` thêm `primary_color_suggestion` vào AI tool schema; AI suy luận hex chỉ khi source rõ ràng, fallback null.
- `_shared/brand-extractor.ts` cũng extract `brand_positioning` (1 câu ≤280 chars) + `formality_level` (enum casual/neutral/formal) cùng `tone_of_voice` để autofill bước "Giọng nói".

### Frontend
- `BrandImportDialog`: thêm field `primary_color` trong `ALL_FIELDS`; auto-select khi có `theme_color` hoặc `primary_color_suggestion`. Render swatch + thumbnail logo. Badge "AI gợi ý" khi color đến từ AI.
- `BrandCreate.tsx` hydrate effect: đọc `s.primary_color || meta.theme_color || s.primary_color_suggestion` → `setPrimaryColor`. Lưu logo URL vào `importedLogoUrlRef`. Hydrate thêm `setBrandPositioning(s.brand_positioning)` và `setFormalityLevel(s.formality_level)`.
- `BrandCreate.handleSubmit`: nếu `!logoFile && !editingTemplate?.logo_url && importedLogoUrlRef.current` → lưu remote URL trực tiếp vào `logo_url` cột DB (không re-upload, giữ external URL).

### Why
Trước đây import chỉ set `logoPreview` UI nhưng không persist khi Save → logo bị mất. Color không có pipeline. Sau fix: import 1 lần là có ngay logo + màu lưu vào brand template.
