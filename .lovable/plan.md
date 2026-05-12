## Vấn đề

Pipeline `import-brand-from-website` đang trích sản phẩm yếu vì chỉ dựa vào markdown thô của 1 trang chủ + tối đa 5 sub-page từ `<nav>`, rồi đẩy hết cho AI tự suy. Khi site có catalog sâu (Shopify/WordPress/landing dài), AI chỉ thấy 1 phần → ra 0–2 sản phẩm hoặc đoán sai.

Cải thiện theo 4 lớp tín hiệu, mỗi lớp đều có fallback, tăng recall mà không tốn thêm Firecrawl quota.

## Hướng fix

### Lớp 1 — Tín hiệu cấu trúc (miễn phí, chính xác cao)
Trong `import-brand-from-website/index.ts`, thêm `extractStructuredProducts(html, baseUrl)`:
- Parse **JSON-LD** với `@type: Product | ItemList | Service | Offer | OfferCatalog` (tận dụng `parseJsonLdBlocks` đã có).
- Parse **OpenGraph product** (`og:type=product`, `product:price:amount`, `og:title`, `og:image`).
- Parse **microdata** `itemtype="schema.org/Product"`.
- Parse **HTML product cards** theo heuristic: anchor có path chứa `/product|/san-pham|/dich-vu|/shop|/collection|/p/` + có `<img>` con + có price pattern (`đ|VND|$|₫`).
- Output: list `{ name, description?, price_display?, image_url?, source_url, category }` đã chuẩn hoá + dedup theo `name.lowercase + source_url`.
- Trả về cùng `extractVisualSignals` ngay sau scrape home (không tốn AI).

### Lớp 2 — Mở rộng phát hiện URL sản phẩm
- Nâng `discoverSubpages`: scan thêm **body** (không chỉ nav) để bắt link product cards; ưu tiên path khớp `SUBPAGE_KEYWORDS` (đã có).
- Thêm **sitemap.xml fallback**: `firecrawlMap(targetUrl, { search: "product OR san-pham OR dich-vu", limit: 30 })` *chỉ khi* Lớp 1 < 3 sản phẩm. Map rẻ hơn scrape nên không tốn nhiều quota.
- Cap tổng URL phụ scrape: **8** (hiện 6) và prefer URL có sản phẩm ở Lớp 1.

### Lớp 3 — AI extraction tăng chất lượng
- Truyền vào `extractProductSuggestions`:
  - `structuredHints`: list sản phẩm Lớp 1 đã thấy (kèm URL nguồn) — AI dùng làm anchor, bổ sung mô tả/USP/keywords thay vì tự đoán tên.
  - `siteHint`: industry guess từ `extracted.industry` nếu đã chạy xong (re-order Promise.all → chạy brand trước, products sau, để AI có industry context).
- Tăng content slice: **40000 chars** (Qwen Plus context dư), nhưng **chia chunk theo URL** thay vì cắt thô — mỗi sub-page có header `## Source: <url>`.
- Sửa system prompt:
  - "Below you may see a list of STRUCTURED PRODUCTS already extracted from JSON-LD/OpenGraph. Treat those as ground truth — DO NOT remove or rename them, only enrich description/USP/keywords if missing."
  - "If website lists < 3 real products in scraped content, return empty array; do NOT pad with generic items."
- Giữ fallback chain model hiện tại.

### Lớp 4 — Merge & rank cuối
- `mergeProducts(structured, ai)`:
  - Dedup theo `slugify(name)` + `image_url host+path`.
  - Structured wins về `name`, `price_display`, `image_url`, `source_url` (chuẩn xác hơn AI).
  - AI wins về `description`, `unique_selling_points`, `keywords`, `category`.
  - Cap 12 (hiện 10) để cho dropdown chọn rộng hơn.
- Smart-pick `image_url`: nếu Lớp 1 không có image → dùng `<img>` đầu tiên trong cùng page subtree theo source_url; cuối cùng mới fallback OG image trang chủ.
- Ghi `product_suggestions_meta`: `{ structured_count, ai_count, final_count, sources: ["jsonld","html","ai"], model, error? }` để debug + UI banner.

### UI (chỉ banner cảnh báo, không đổi flow)
- `BrandImportDialog.tsx`: nếu `meta.final_count === 0` → banner "Không tự nhận được sản phẩm. Site này có thể không công khai catalog — bạn có thể thêm tay ở bước Sản phẩm." Nếu `structured_count > 0` → badge "Có dữ liệu schema.org" cạnh dropdown sản phẩm để build trust.

## Test
1. **Site Shopify** (có JSON-LD Product): Lớp 1 trả 5–10 sản phẩm có ảnh + giá → AI chỉ enrich.
2. **Landing page 1 trang** (taf.vn dạng): Lớp 1 = 0; sitemap map ra 3 URL `/dich-vu/...` → scrape → AI extract đầy đủ.
3. **Site có nav dày** (WordPress corporate): discoverSubpages bắt đủ + AI fill.
4. **Quota AI = 0**: Lớp 1 vẫn trả structured products, banner báo "AI tạm hết quota nhưng vẫn nhận diện được X sản phẩm từ schema."
5. Brand tin học không bán hàng (homepage = blog): final_count = 0, banner hiện đúng.

## Không động đến
- Schema DB `brand_products`, RLS, hydrate logic `BrandCreate.tsx`.
- `_shared/brand-extractor.ts` (brand info đang hoạt động tốt).
- Logic logo/color extraction Lớp visual.
- `suggest-products-from-website` (nút thủ công) — sẽ xét sau ở pass khác nếu cần.

## File touch
- `supabase/functions/import-brand-from-website/index.ts` (main work: thêm extractStructuredProducts, mergeProducts, sitemap fallback, restructure runImport).
- `src/components/brand/BrandImportDialog.tsx` (banner + badge).
