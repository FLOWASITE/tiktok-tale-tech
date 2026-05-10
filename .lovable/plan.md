
# Import Brand từ Website / Facebook Fanpage

Cho phép user nhập 1 URL website hoặc chọn 1 Facebook Page đã connect → hệ thống scrape/đọc nội dung → AI extract → preview card có "Apply all / Apply selected" → ghi vào `brand_templates`.

## 1. UX Flow

### Entry points
- **BrandEmptyState**: thêm CTA phụ "Import từ website / fanpage" cạnh nút "Tạo brand mới".
- **Brand wizard (tạo mới)**: thêm Step 0 optional "Quick import" — paste URL hoặc chọn FB Page → auto-fill các step kế tiếp.
- **BrandViewOverviewTab** (brand đã tồn tại): nút "Re-scan / Enrich từ website" ở góc card overview để bổ sung field còn trống.

### Dialog `BrandImportDialog`
2 tab:
1. **Website URL** — input URL + checkbox "Scrape thêm trang /about, /services" (tối đa 5 trang).
2. **Facebook Fanpage** — dropdown chọn page từ `social_connections` đã connect (filter `platform='facebook'`); nếu chưa có → CTA "Kết nối Facebook trước".

Nút "Phân tích" → loading state với progress (Scraping → Extracting → Cloning voice) → mở **`BrandImportPreviewCard`**.

### Preview Card
Hiển thị 4 nhóm collapsible, mỗi field có checkbox + so sánh "Hiện tại → Gợi ý":
- **Identity**: brand_name, tagline, industry suggestion, target_age_range, target_gender, target_locations, logo URL.
- **Voice & Tone**: tone_of_voice array, sample_texts (3-5 đoạn rút trích).
- **Content Pillars**: 3-5 pillars (name + description).
- **USPs**: 3-5 USP statements.
- **Auto-connect** (chỉ tab Facebook): toggle "Gắn page này vào brand".

Footer: `Apply selected` (default) + `Apply all` + `Hủy`.

## 2. Backend — Edge Functions

### `import-brand-from-website` (mới)
- Input: `{ url, brand_template_id?, organization_id, extra_paths?: string[] }`
- Steps:
  1. Validate URL, check rate limit per org (3 imports/hour).
  2. Gọi **Firecrawl** (`firecrawl-trends` đã có pattern; tạo helper `_shared/firecrawl-client.ts`) — scrape homepage với formats `['markdown', 'branding', 'links']`. Nếu `extra_paths` → scrape thêm tối đa 4 URL phụ (parallel).
  3. Tổng hợp markdown + branding (logo, colors, fonts) + meta (title, description).
  4. Gọi `callAI()` với schema JSON structured output (Gemini 2.5 Flash):
     ```
     { brand_name, tagline, industry_suggestion, target_audience{age,gender,locations}, 
       tone_of_voice[], content_pillars[{name,description}], usps[], sample_texts[] }
     ```
  5. Return `{ suggestions, raw_meta: { logo_url, colors, source_urls } }`.

### `import-brand-from-fanpage` (mới)
- Input: `{ social_connection_id, brand_template_id?, organization_id }`
- Steps:
  1. Load connection từ `social_connections`, decrypt token.
  2. Graph API: `GET /{page_id}?fields=name,about,bio,description,category,mission,founded,website,fan_count,picture{url},cover{source}`.
  3. `GET /{page_id}/posts?fields=message,created_time&limit=15` → lọc post có `message` ≥ 50 chars.
  4. Gộp về cùng schema rồi gọi cùng AI extractor như flow website (tái dùng `_shared/brand-extractor.ts`).
  5. Trả thêm `raw_meta.fanpage = { page_id, picture, fan_count }` để UI auto-attach.

### `_shared/brand-extractor.ts` (mới)
Hàm chung `extractBrandSuggestions(content, locale)` build prompt theo English-Instruction-Target-Output pattern, chạy `callAI()` với JSON schema, validate bằng zod, return typed object. Cache bằng `withCache(hash(content), ...)` TTL 1h để retry không tốn token.

### Apply (frontend-only)
- Sau khi user bấm Apply → frontend dùng `useBrandTemplates.update()` (đã có) ghi các field được tick.
- Nếu auto-connect FB → đã có sẵn `social_connections` row, chỉ cần update `brand_template_id` (PATCH qua supabase client).

## 3. Database

Không cần table mới. Thêm 1 cột audit:
```sql
ALTER TABLE public.brand_templates 
ADD COLUMN imported_from JSONB; 
-- { source: 'website'|'fanpage', url|page_id, imported_at, applied_fields: [] }
```
Migration mới (additive), giữ pattern existing.

## 4. Files dự kiến

**Mới**
- `src/components/brand/BrandImportDialog.tsx` — 2 tab + form input.
- `src/components/brand/BrandImportPreviewCard.tsx` — preview + checkbox + apply.
- `src/hooks/useBrandImport.ts` — wrap 2 edge function + React Query mutation.
- `supabase/functions/import-brand-from-website/index.ts`
- `supabase/functions/import-brand-from-fanpage/index.ts`
- `supabase/functions/_shared/brand-extractor.ts`
- `supabase/functions/_shared/firecrawl-client.ts` (nếu chưa có)
- 1 migration thêm cột `imported_from`.

**Sửa**
- `src/components/brand/BrandEmptyState.tsx` — CTA phụ.
- `src/components/brand/BrandViewOverviewTab.tsx` — nút "Re-scan".
- (Tuỳ wizard hiện có) thêm Step 0 quick-import.

## 5. Integrations & Secrets

- **Firecrawl**: dùng connector `firecrawl` (đã có pattern trong project — `firecrawl-trends`). Nếu chưa link → bước đầu sẽ trigger `standard_connectors--connect`.
- **Facebook**: tái dùng token đã encrypt trong `social_connections` (theo memory `Credential Management` + `Multi-Fanpage Configs`).
- **AI**: Lovable Gateway, model mặc định `google/gemini-2.5-flash` (rẻ + đủ mạnh cho extraction).

## 6. Out of scope (phase 1)

- Instagram / WordPress RSS (sẽ làm phase 2 nếu user dùng nhiều).
- Scrape sâu > 5 page hoặc full sitemap crawl.
- Auto-import định kỳ (cron re-scan).
- Tự ghi đè field mà không cần user xác nhận.

## 7. Verify sau khi build

1. Test với 1 website thật (vd `flowa.one`) → preview phải có ≥ 80% field được suggest.
2. Test với 1 FB page đã connect → suggestions từ posts + about.
3. Apply selected chỉ ghi field được tick, không xoá field cũ.
4. Edge function logs sạch, không 402/429 với 3 lần chạy liên tiếp.
