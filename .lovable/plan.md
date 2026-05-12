## Mục tiêu
Nâng recall + chính xác cho việc nhận sản phẩm/dịch vụ ở `import-brand-from-website` — đặc biệt cho website Việt Nam **không có schema.org** (Haravan, Sapo, NukeViet, landing tự code, WordPress non-Woo).

## Quan sát từ code hiện tại
- Layer 1 (schema.org/JSON-LD/microdata/HTML cards) chỉ chạy mạnh khi site có markup chuẩn.
- Layer 2 (sitemap fallback) **chỉ** kích hoạt khi `structuredProducts.length < 3` và **chỉ** dùng Firecrawl `/v2/map` (đôi khi rỗng / sai).
- HTML card heuristic hẹp: yêu cầu `<a href="/product...">` chứa `<img>` ngay bên trong → bỏ sót card có `<img>` là sibling, hoặc card dùng `background-image`, hoặc list dùng `<article class="product">` không bọc bởi anchor.
- PRICE_RE thiếu các format VN: `500k`, `2tr5`, `1.5 triệu`, "Liên hệ".
- AI prompt cap 10 sản phẩm; merge cap 12; nhưng nội dung gửi AI bị `slice(0, 40000)` ưu tiên homepage trước → trang sản phẩm con dễ bị cắt.
- Không có enrichment: khi structured catch được tên + URL nhưng thiếu ảnh/giá, không scrape lại trang đó để lấy OG image.
- Không thử `includeSubdomains` cho shop subdomain (`shop.brand.vn`).

## Kế hoạch v3 — 5 cải tiến (tất cả nằm trong 1 file `supabase/functions/import-brand-from-website/index.ts`)

### 1. Mở rộng HTML card heuristic (Layer 1)
Thêm 2 nhánh ngoài "anchor có `<img>` bên trong":

- **Container-based**: regex tìm block có `class` chứa các token phổ biến: `product-item|product-card|product-block|woocommerce-loop-product|grid__item|product-tile|item-product|sapo-product|haravan-product|nv-product`. Trong block, lấy `<a href>` đầu tiên match `PRODUCT_PATH_RE` + `<img>` đầu tiên (kể cả `data-src`, `data-original`, `srcset`) + text chứa price/`Liên hệ`.
- **Adjacent img**: nếu `<a href="/san-pham/…">…</a>` không chứa `<img>` nhưng anchor liền trước/sau là `<img>` cùng path → ghép.

Bổ sung **PRICE_RE_VN**: `(?:[\d.,]+\s*(?:k|tr|triệu|nghìn|ng))\b` + `liên\s*hệ|contact\s*for\s*price`.

Cap card per page tăng từ 20 → 40.

### 2. Sitemap fallback luôn chạy + đa nguồn (Layer 2)
- Luôn chạy song song Firecrawl `/v2/map` ngay sau `firecrawlScrape(home)` (không đợi đếm structured), **đồng thời** fetch trực tiếp `${origin}/sitemap.xml`, `/sitemap_index.xml`, `/product-sitemap.xml`, `/product_sitemap.xml`, `/sitemap-products.xml` (free, song song với 1.5s timeout mỗi cái). Parse `<loc>` regex.
- Hợp nhất → filter same-origin (hoặc cùng e-TLD nếu là `shop.*`) + match `PRODUCT_PATH_RE` + chưa scrape.
- Nếu structured ≥ 5 sau homepage → dùng sitemap chỉ để **enrichment** (xem #4), không scrape thêm cho extraction.
- Nếu structured < 5 → scrape tối đa 5 trang sản phẩm (tăng từ 3) với `["markdown","rawHtml"]`.

Thêm `includeSubdomains: true` khi sitemap rỗng và homepage có anchor trỏ về subdomain khác cùng base domain.

### 3. Enrichment chéo cho structured products thiếu ảnh/giá
Sau Layer 1+2, lọc các structured products **có `source_url`** nhưng **thiếu `image_url` hoặc `description`** (≤ 4 items, ưu tiên không có ảnh). Với mỗi item, nếu trang đó chưa được scrape, scrape `["rawHtml"]` rồi lấy `og:image` / `<meta name="description">` / first `<img class*="product">`. Free vì Firecrawl tính theo URL, các URL này nằm trong budget sitemap nếu chưa dùng hết.

### 4. Cải thiện prompt AI (Layer 3)
- Đổi thứ tự content: **sub-pages trước, homepage sau** (vì 40k cap dễ cắt cuối). Mỗi sub-page tăng từ 4000 → 5000 chars khi tổng số sub-page ≤ 4.
- Cap AI products tăng 10 → 15.
- Thêm system rule: "If a STRUCTURED PRODUCTS list is provided, you MUST keep all of them; only ADD new items when you find clear product names with price/CTA in the content. When in doubt, omit."
- Cho phép AI trả thêm field `confidence: "high"|"medium"|"low"` (optional), filter ra `low` nếu chưa có structured.

### 5. Markdown regex fallback (chạy bất kể AI)
Khi `structured + ai < 3`, chạy regex pass trên `combinedContent` (markdown):
- Pattern A: dòng dạng `**Tên SP**` hoặc `## Tên SP` ngay dưới hình `![](url)` + dòng giá.
- Pattern B: bullet `- Tên: giá` với `PRICE_RE_VN`.
- Tối đa 8 hits, đẩy vào merge với `source: "markdown"`.

Mục đích: site hoàn toàn không có schema + AI cũng quota out vẫn có data tối thiểu.

## Meta + UI (không đổi schema, chỉ bổ sung field)
`product_suggestions_meta` thêm:
- `enriched_count` (số structured được bổ sung ảnh/desc qua #3)
- `markdown_fallback_count` (#5)
- `subdomain_used: boolean`
- `sitemap_sources: ("firecrawl_map"|"sitemap.xml"|"product-sitemap.xml")[]`

`BrandImportDialog.tsx`: nếu `markdown_fallback_count > 0` show chip "Phát hiện qua heuristic"; còn lại banner giữ nguyên.

## Không đổi
- DB schema, RLS, hydrate ở `BrandCreate.tsx`, `_shared/brand-extractor.ts`, logo/color extraction, multi-provider AI fallback chain, `suggest-products-from-website` (pipeline riêng cho dialog "Gợi ý sản phẩm", phạm vi khác).

## File cần sửa
- `supabase/functions/import-brand-from-website/index.ts` (toàn bộ thay đổi pipeline)
- `src/components/brand/BrandImportDialog.tsx` (badge mới)
- Memory: cập nhật `mem://features/brand/import-product-detection-v2-vn` → v3 (hoặc tạo file mới).

## Test thủ công sau khi deploy
1. Site Haravan/Sapo VN không có JSON-LD → kỳ vọng ≥ 5 sản phẩm qua HTML card mở rộng + sitemap.xml.
2. Landing 1 page tiếng Việt với list "- Sản phẩm A: 500k" → markdown fallback bắt được.
3. Site Shopify đầy đủ schema → giữ nguyên kết quả v2 (không hồi quy).
4. Subdomain `shop.brand.vn` linked từ homepage → sitemap subdomain detect.
5. Quota AI = 0 → vẫn trả structured + markdown fallback.