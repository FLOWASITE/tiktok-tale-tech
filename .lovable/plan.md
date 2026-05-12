# Product detection upgrade — implemented

4-layer pipeline in `import-brand-from-website`:

1. **Layer 1 — Structured (free, deterministic):** `extractStructuredProducts(html, baseUrl)` parses JSON-LD (`Product/Service/ItemList/OfferCatalog`), OpenGraph product, microdata `schema.org/Product`, and HTML product cards (anchors with product-like path + img + price). Runs on homepage HTML and every sub-page HTML scraped.

2. **Layer 2 — Sitemap fallback:** when Layer 1 < 3 products, calls Firecrawl `/v2/map` with `search="product san-pham dich-vu service shop"`, picks up to 3 product-like URLs, scrapes them, re-runs Layer 1 on their HTML.

3. **Layer 3 — AI enrichment:** `extractProductSuggestions` now receives `structuredHints`. Prompt updated: structured list = ground truth, AI may only enrich missing description/USP/keywords; refuse to pad if site has < 2 products. Content slice raised 25k → 40k chars; sub-pages now prefixed with `## Source: <url>` for better attribution.

4. **Layer 4 — Merge & rank:** `mergeProducts(structured, ai)` dedups by `slugifyName`. Structured wins for name/price/image/source_url; AI wins for description/USP/keywords/category. Cap raised 10 → 12.

Sub-pages now scraped with `["markdown", "rawHtml"]` (no extra Firecrawl cost) so Layer 1 can read them. `discoverSubpages` cap raised 6 → 8.

`product_suggestions_meta` now reports: `structured_count`, `ai_count`, `final_count`, `sources[]`, `sitemap_used`, `error`, `model`.

UI banner (`BrandImportDialog.tsx`) shows structured count + `schema.org` badge when JSON-LD/OG/microdata contributed; shows amber banner when `final_count === 0` (separate from AI quota error).

## Files changed
- `supabase/functions/import-brand-from-website/index.ts`
- `src/components/brand/BrandImportDialog.tsx`
